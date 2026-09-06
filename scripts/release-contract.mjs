/** Token-free release verification. Upload acceptance and registry visibility are separate states. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tarEntries } from './tar-reader.mjs';

const registry = 'https://registry.npmjs.org/';
export const dependencyKeys = ['dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies', 'bundledDependencies', 'bundleDependencies'];
const hooks = ['preinstall', 'install', 'postinstall', 'prepare'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const integrityOf = bytes => 'sha512-' + createHash('sha512').update(bytes).digest('base64');
function readBounded(path, max) {
  const s = lstatSync(path); assert.ok(s.isFile() && s.size <= max, 'ARTIFACT_FILE_LIMIT');
  return readFileSync(path);
}
export function inspectArtifact(directory, expectedVersion, expectedSha, rootLicense) {
  assert.match(expectedVersion ?? '', /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'INVALID_EXPECTED_VERSION');
  assert.ok(expectedVersion.length <= 80, 'INVALID_EXPECTED_VERSION');
  assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/, 'INVALID_EXPECTED_SHA');
  const dir = resolve(directory);
  const info = JSON.parse(readBounded(resolve(dir, 'build-info.json'), 8192).toString('utf8'));
  assert.equal(info.name, 'tessembly', 'ARTIFACT_NAME_MISMATCH');
  assert.equal(info.version, expectedVersion, 'ARTIFACT_VERSION_MISMATCH');
  assert.equal(info.source_commit, expectedSha, 'ARTIFACT_SOURCE_MISMATCH');
  assert.equal(info.file, `tessembly-${expectedVersion}.tgz`, 'ARTIFACT_FILENAME_MISMATCH');
  for (const file of readdirSync(dir)) assert.ok([info.file, 'build-info.json', 'SHA256SUMS'].includes(file), 'UNEXPECTED_ARTIFACT_FILE');
  const archive = readBounded(resolve(dir, info.file), 2_097_152);
  assert.equal(info.integrity, integrityOf(archive), 'ARTIFACT_INTEGRITY_MISMATCH');
  const entries = tarEntries(archive);
  const readEntry = name => { const value = entries.get(name); assert.ok(value, 'PACKED_ENTRY_MISSING:' + name); return value; };
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
  assert.deepEqual(license, readBounded(rootLicense, 16384), 'LICENSE_TEXT_MISMATCH');
  assert.equal(info.license_sha256, sha256(license), 'LICENSE_HASH_MISMATCH');
  return info;
}
const requestOptions = () => ({ signal: AbortSignal.timeout(15_000), headers: { 'cache-control': 'no-cache', accept: 'application/json' }, redirect: 'error' });
async function responseBytes(response, max) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('REGISTRY_EMPTY_RESPONSE');
  const chunks = []; let size = 0;
  try {
    for (;;) { const r = await reader.read(); if (r.done) break;
      if (r.value.byteLength > max - size) { await reader.cancel(); throw new Error('REGISTRY_RESPONSE_LIMIT'); }
      size += r.value.byteLength; chunks.push(r.value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
async function manifestResponse(r) { return JSON.parse((await responseBytes(r, 1_048_576)).toString('utf8')); }
export function registryMismatch(info, m) {
  if (m?.name !== info.name) return 'name';
  if (m.version !== info.version) return 'version';
  if (m.license !== 'MIT') return 'license';
  if (m.dist?.integrity !== info.integrity) return 'integrity';
  if (m.repository?.url !== 'git+https://github.com/daejunnom/Tessembly.git') return 'repository';
  if (!dependencyKeys.every(key => Object.keys(m[key] ?? {}).length === 0)) return 'dependencies';
  return null;
}
export function matchesRegistry(info, manifest) { return registryMismatch(info, manifest) === null; }
export async function requireUnpublished(info, request = fetch) {
  const r = await request(`${registry}tessembly/${info.version}`, requestOptions());
  if (r.status === 200) throw new Error('VERSION_ALREADY_PUBLISHED: do not overwrite or automatically increment');
  if (r.status !== 404) throw new Error(`REGISTRY_CHECK_FAILED:${r.status}`);
  await r.body?.cancel();
}
async function verifyPublishedBytes(info, m, request) {
  const expectedUrl = `${registry}tessembly/-/tessembly-${info.version}.tgz`;
  assert.equal(m.dist?.tarball, expectedUrl, 'REGISTRY_TARBALL_URL_MISMATCH');
  const r = await request(expectedUrl, requestOptions());
  if (!r.ok) { await r.body?.cancel(); throw new Error(`REGISTRY_TARBALL_HTTP:${r.status}`); }
  const bytes = await responseBytes(r, 2_097_152);
  assert.equal(integrityOf(bytes), info.integrity, 'REGISTRY_TARBALL_INTEGRITY_MISMATCH');
  const entries = tarEntries(bytes);
  const license = entries.get('package/LICENSE');
  assert.ok(license, 'REGISTRY_LICENSE_MISSING');
  assert.equal(sha256(license), info.license_sha256, 'REGISTRY_LICENSE_BODY_MISMATCH');
}
/** Idempotent only for the exact same verified immutable artifact; never accepts a different version collision. */
export async function publicationState(info, request = fetch) {
  const r = await request(`${registry}tessembly/${info.version}`, requestOptions());
  if (r.status === 404) { await r.body?.cancel(); return 'UNPUBLISHED'; }
  if (!r.ok) throw new Error(`REGISTRY_CHECK_FAILED:${r.status}`);
  const m = await manifestResponse(r); const mismatch = registryMismatch(info, m);
  if (mismatch) throw new Error(`VERSION_ALREADY_PUBLISHED_MISMATCH:${mismatch}`);
  await verifyPublishedBytes(info, m, request);
  return 'ALREADY_PUBLISHED_EXACT';
}
/** Bounded polling, transient-only retries, no repeated npm publish. Injectable time for deterministic tests. */
export async function confirmRegistry(info, request = fetch, options = {}) {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? (ms => new Promise(done => setTimeout(done, ms)));
  const progress = options.progress ?? (() => {});
  const timeout = options.timeoutMs ?? 300_000;
  const start = now(); let last = 'NOT_VISIBLE';
  for (let attempt = 0; attempt < 40 && now() - start < timeout; attempt++) {
    let r;
    try { r = await request(`${registry}tessembly/${info.version}`, requestOptions()); }
    catch { last = 'NETWORK_OR_TIMEOUT'; }
    if (r?.ok) {
      const m = await manifestResponse(r); const mismatch = registryMismatch(info, m);
      if (mismatch) throw new Error(`PUBLISHED_METADATA_MISMATCH:${mismatch}`);
      try {
        await verifyPublishedBytes(info, m, request);
        return { status: 'PUBLISHED_AND_VERIFIED', attempts: attempt + 1 };
      } catch (error) {
        const status = Number(error.message?.match(/^REGISTRY_TARBALL_HTTP:(\d+)$/)?.[1]);
        if (![404, 408, 425, 429].includes(status) && !(status >= 500) &&
            !['TimeoutError', 'AbortError', 'TypeError'].includes(error.name)) throw error;
        last = status ? `TARBALL_HTTP_${status}` : 'TARBALL_NETWORK_OR_TIMEOUT';
      }
      r = undefined;
    }
    if (r) {
      last = `HTTP_${r.status}`; await r.body?.cancel();
      if (![404, 408, 425, 429].includes(r.status) && r.status < 500) throw new Error(`REGISTRY_ACCESS_OR_PROTOCOL_ERROR:${r.status}`);
    }
    progress({ status: 'PUBLISH_ACCEPTED_VISIBILITY_PENDING', attempt: attempt + 1, last });
    await sleep(Math.min(10_000, Math.max(0, timeout - (now() - start))));
  }
  throw new Error(`PUBLISH_ACCEPTED_BUT_UNVERIFIED:${last}: confirm the original artifact; do not republish or delete the version`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [command, directory] = process.argv.slice(2);
  assert.ok(['inspect', 'check-registry', 'confirm', 'recover'].includes(command), 'INVALID_COMMAND');
  assert.ok(directory, 'ARTIFACT_DIRECTORY_REQUIRED');
  const info = command === 'recover' ? JSON.parse(readBounded(directory, 8192))
    : inspectArtifact(directory, process.env.EXPECTED_VERSION, process.env.EXPECTED_SHA, new URL('../LICENSE', import.meta.url));
  if (command === 'recover') {
    assert.equal(info.name, 'tessembly'); assert.match(info.version, /^\d+\.\d+\.\d+$/);
    assert.match(info.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    assert.equal(info.license_sha256, sha256(readBounded(new URL('../LICENSE', import.meta.url), 16384)));
  }
  let state;
  if (command === 'check-registry') {
    state = await publicationState(info);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `already_published=${state === 'ALREADY_PUBLISHED_EXACT'}\n`);
  }
  if (command === 'confirm' || command === 'recover') await confirmRegistry(info, fetch, { progress: p => console.log(JSON.stringify(p)) });
  console.log(JSON.stringify({ status: state ?? (['confirm','recover'].includes(command) ? 'PUBLISHED_AND_VERIFIED' : 'ARTIFACT_VERIFIED'), name: info.name, version: info.version, license: 'MIT', source_commit: info.source_commit, integrity: info.integrity }));
}
