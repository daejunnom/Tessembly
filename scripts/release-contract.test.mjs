import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeTar } from './test-tar.mjs';
import { createHash } from 'node:crypto';
import { inspectArtifact, requireUnpublished, matchesRegistry } from './release-contract.mjs';

const sha = 'a'.repeat(40);
const version = '0.1.1';
const licensePath = new URL('../LICENSE', import.meta.url);
const goodLicense = readFileSync(licensePath);
function fixture(t, mutateManifest = () => {}, mutateInfo = () => {}, license = goodLicense) {
  const root = mkdtempSync(join(tmpdir(), 'tessembly-release-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const dir = join(root, 'artifact');
  mkdirSync(join(source, 'package'), { recursive: true }); mkdirSync(dir);
  const manifest = { name: 'tessembly', version, license: 'MIT', repository: { url: 'git+https://github.com/daejunnom/Tessembly.git' }, publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' } };
  mutateManifest(manifest);
  writeFileSync(join(source, 'package/package.json'), JSON.stringify(manifest));
  writeFileSync(join(source, 'package/LICENSE'), license);
  const file = `tessembly-${version}.tgz`;
  writeFileSync(join(dir,file),makeTar([['package/package.json',JSON.stringify(manifest)],['package/LICENSE',license]]));
  const info = { name: 'tessembly', version, source_commit: sha, file, integrity: 'sha512-' + createHash('sha512').update(readFileSync(join(dir, file))).digest('base64'), license: 'MIT', license_sha256: createHash('sha256').update(license).digest('hex') };
  mutateInfo(info);
  writeFileSync(join(dir, 'build-info.json'), JSON.stringify(info));
  return { dir, info, manifest };
}
const inspect = dir => inspectArtifact(dir, version, sha, licensePath);
test('exact MIT tarball is accepted without executing its contents', t => { const f=fixture(t); assert.equal(inspect(f.dir).license,'MIT'); });
test('historical UNLICENSED metadata is rejected', t => { const f=fixture(t,p=>p.license='UNLICENSED'); assert.throws(()=>inspect(f.dir),/PACKED_LICENSE/); });
test('different license body is rejected even with matching metadata hash', t => { const f=fixture(t,undefined,undefined,Buffer.from('MIT')); assert.throws(()=>inspect(f.dir),/LICENSE_TEXT/); });
test('wrong source, version and digest are rejected', t => {
  for (const [key,value] of [['source_commit','b'.repeat(40)],['version','0.1.0'],['integrity','sha512-bad']]) {
    const f=fixture(t,undefined,p=>p[key]=value); assert.throws(()=>inspect(f.dir),/ARTIFACT_/);
  }
});
test('runtime dependencies and installation scripts cannot enter release', t => {
  for(const mutate of [p=>p.dependencies={unexpected:'1'},p=>p.scripts={postinstall:'echo forbidden'}]) {
    const f=fixture(t,mutate); assert.throws(()=>inspect(f.dir),/DEPENDENCIES_NOT_EMPTY|INSTALL_HOOK/);
  }
});
test('wrong repository or registry is rejected', t => {
  for(const mutate of [p=>p.repository.url='https://github.com/other/repo',p=>p.publishConfig.registry='https://example.com/']) {
    const f=fixture(t,mutate); assert.throws(()=>inspect(f.dir),/PACKED_REPOSITORY|PACKED_REGISTRY/);
  }
});
test('unexpected artifact files cannot supply npm credentials', t => { const f=fixture(t); writeFileSync(join(f.dir,'.npmrc'),'test'); assert.throws(()=>inspect(f.dir),/UNEXPECTED_ARTIFACT_FILE/); });
test('registry lookup distinguishes an existing version, missing version and outage', async () => {
  await requireUnpublished({version},async()=>({status:404}));
  await assert.rejects(requireUnpublished({version},async()=>({status:200})),/VERSION_ALREADY_PUBLISHED/);
  await assert.rejects(requireUnpublished({version},async()=>({status:503})),/REGISTRY_CHECK_FAILED/);
});
test('post-publish evidence must include MIT, matching bytes and zero dependencies', t => {
  const f=fixture(t); const published={...f.manifest,dist:{integrity:f.info.integrity}};
  assert.ok(matchesRegistry(f.info,published));
  assert.equal(matchesRegistry(f.info,{...published,license:'UNLICENSED'}),false);
  assert.equal(matchesRegistry(f.info,{...published,dependencies:{unexpected:'1'}}),false);
});
