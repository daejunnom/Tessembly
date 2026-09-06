/** Release-artifact checks. Node built-ins only; never loads package code. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const registry = 'https://registry.npmjs.org/';
export const dependencyKeys = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies', 'bundledDependencies', 'bundleDependencies'];
const hooks = ['preinstall', 'install', 'postinstall', 'prepare'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function inspectArtifact(directory, expectedVersion, expectedSha, rootLicense) {
  assert.match(expectedVersion ?? '', /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'INVALID_EXPECTED_VERSION');
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, 'INVALID_EXPECTED_SHA');
  const dir = resolve(directory);
  const info = JSON.parse(readFileSync(resolve(dir, 'build-info.json'), 'utf8'));
  assert.equal(info.name, 'tessembly', 'ARTIFACT_NAME_MISMATCH');
  assert.equal(info.version, expectedVersion, 'ARTIFACT_VERSION_MISMATCH');
  assert.equal(info.source_commit, expectedSha, 'ARTIFACT_SOURCE_MISMATCH');
  assert.equal(info.file, `tessembly-${expectedVersion}.tgz`, 'ARTIFACT_FILENAME_MISMATCH');
  for (const file of readdirSync(dir)) {
    assert.ok([info.file, 'build-info.json', 'SHA256SUMS'].includes(file), 'UNEXPECTED_ARTIFACT_FILE');
  }
  const file = resolve(dir, info.file);
  const integrity = 'sha512-' + createHash('sha512').update(readFileSync(file)).digest('base64');
  assert.equal(info.integrity, integrity, 'ARTIFACT_INTEGRITY_MISMATCH');
  const readEntry = name => execFileSync('tar', ['-xOf', file, name], { maxBuffer: 1_048_576 });
  const manifest = JSON.parse(readEntry('package/package.json').toString('utf8'));
  assert.equal(manifest.name, info.name, 'PACKED_NAME_MISMATCH');
  assert.equal(manifest.version, info.version, 'PACKED_VERSION_MISMATCH');
  assert.equal(manifest.license, 'MIT', 'PACKED_LICENSE_MISMATCH');
  assert.equal(info.license, 'MIT', 'ARTIFACT_LICENSE_MISMATCH');
  assert.equal(manifest.repository?.url, 'git+https://github.com/daejunnom/Tessembly.git', 'PACKED_REPOSITORY_MISMATCH');
  assert.equal(manifest.publishConfig?.registry, registry, 'PACKED_REGISTRY_MISMATCH');
  assert.equal(manifest.publishConfig?.access, 'public', 'PACKED_ACCESS_MISMATCH');
  assert.notEqual(manifest.private, true, 'PRIVATE_PACKAGE');
  for (const key of dependencyKeys) assert.equal(Object.keys(manifest[key] ?? {}).length, 0, `DEPENDENCIES_NOT_EMPTY:${key}`);
  for (const hook of hooks) assert.ok(!manifest.scripts?.[hook], `INSTALL_HOOK:${hook}`);
  const license = readEntry('package/LICENSE');
  assert.deepEqual(license, readFileSync(rootLicense), 'LICENSE_TEXT_MISMATCH');
  assert.equal(info.license_sha256, sha256(license), 'LICENSE_HASH_MISMATCH');
  return info;
}

export async function requireUnpublished(info, request = fetch) {
  const response = await request(`${registry}tessembly/${info.version}`, { signal: AbortSignal.timeout(20_000) });
  if (response.status === 200) throw new Error('VERSION_ALREADY_PUBLISHED: do not overwrite or automatically increment');
  if (response.status !== 404) throw new Error(`REGISTRY_CHECK_FAILED:${response.status}`);
}

export function matchesRegistry(info, manifest) {
  return manifest.name === info.name && manifest.version === info.version && manifest.license === 'MIT'
    && manifest.dist?.integrity === info.integrity
    && manifest.repository?.url === 'git+https://github.com/daejunnom/Tessembly.git'
    && dependencyKeys.every(key => Object.keys(manifest[key] ?? {}).length === 0);
}

export async function confirmRegistry(info, request = fetch) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const response = await request(`${registry}tessembly/${info.version}`, { signal: AbortSignal.timeout(20_000) });
    if (response.ok && matchesRegistry(info, await response.json())) return;
    await new Promise(done => setTimeout(done, 3000));
  }
  throw new Error('PUBLISH_UNVERIFIED: registry license/version/integrity did not match');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, directory] = process.argv.slice(2);
  assert.ok(['inspect', 'check-registry', 'confirm'].includes(command), 'INVALID_COMMAND');
  assert.ok(directory, 'ARTIFACT_DIRECTORY_REQUIRED');
  const info = inspectArtifact(directory, process.env.EXPECTED_VERSION, process.env.EXPECTED_SHA, new URL('../LICENSE', import.meta.url));
  if (command === 'check-registry') await requireUnpublished(info);
  if (command === 'confirm') await confirmRegistry(info);
  console.log(JSON.stringify({ status: command === 'confirm' ? 'PUBLISHED_AND_VERIFIED' : 'ARTIFACT_VERIFIED', name: info.name, version: info.version, license: info.license, source_commit: info.source_commit, integrity: info.integrity }));
}
