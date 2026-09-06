import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const p=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
assert.equal(p.license,'MIT','npm package must explicitly declare MIT');
assert.deepEqual(readFileSync(new URL('../LICENSE',import.meta.url)),readFileSync(new URL('../../../LICENSE',import.meta.url)),'package license must match the repository grant');
for(const key of ['dependencies','optionalDependencies','peerDependencies','devDependencies','bundledDependencies','bundleDependencies']) {
  assert.equal(Object.keys(p[key]??{}).length,0,`${key} must stay empty`);
}
for(const hook of ['preinstall','install','postinstall','prepare']) assert.ok(!p.scripts?.[hook],`forbidden install hook: ${hook}`);
const bytes=readFileSync(new URL('../tessembly.wasm',import.meta.url));
assert.ok(bytes.length < 2_000_000,'unexpected Wasm size growth');
assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(bytes)),[]);
const npm=process.platform==='win32'?'npm.cmd':'npm';
const result=JSON.parse(execFileSync(npm,['pack','--dry-run','--json','--ignore-scripts'],{cwd:new URL('..',import.meta.url),encoding:'utf8',shell:process.platform==='win32'}))[0];
assert.ok(result.files.some(f=>f.path==='tessembly.wasm'));
assert.ok(result.files.some(f=>f.path==='LICENSE'),'MIT text must be packed');
assert.ok(result.files.every(f=> !f.path.includes('node_modules') && !f.path.includes('.npmrc') && !f.path.startsWith('tests/') && !f.path.startsWith('scripts/')));
console.log(JSON.stringify({name:p.name,version:p.version,license:p.license,dependencies:0,peerDependencies:0,optionalDependencies:0,installHooks:0,wasmImports:0,wasmBytes:bytes.length,packedBytes:result.size,unpackedBytes:result.unpackedSize,files:result.files.map(f=>f.path)},null,2));
