import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTessembly, PROFILE, LEGACY_PROFILE } from '../node.js';
const fixture = name => readFile(new URL(`../../../tests/fixtures/rfc2/${name}`,import.meta.url),'utf8');
test('default comparator direction is RFC3 with literal edges, not just symmetric counts',async()=>{
 const t=await createTessembly();
 assert.equal(PROFILE,'tessembly.rfc3.order.v1'); assert.equal(LEGACY_PROFILE,'tessembly.rfc2.precedence.v1');
 assert.equal(t.normalizePattern('P4:D(I<T)'), 'P4:D(I<T)');
 assert.equal(t.normalizePattern('P4:D(I<TS)'), 'P4:D(I<T,I<S)');
 assert.equal(t.normalizePattern('P4:D(I<T>S)'),t.normalizePattern('P4:D(T>IS)'));
 assert.equal(t.normalizePattern('P4:D(I<T>S)'),'P4:D(I<T,S<T)');
 assert.throws(()=>t.normalizePattern('P4:D(I<T)',{profile:'rfc2'}),{code:'UNSUPPORTED_PROFILE'});
 t.dispose();
});
test('all four explicit migrations preserve old relationships and reject already-new headers',async()=>{
 const t=await createTessembly();
 const pt=(await fixture('pattern.txt')).trim(),dt=(await fixture('document.txt')).trim();
 const pb=Buffer.from((await fixture('pattern.hex')).trim(),'hex'),db=Buffer.from((await fixture('document.hex')).trim(),'hex');
 assert.throws(()=>t.decodePattern(pb)); assert.throws(()=>t.decodeDocument(db)); assert.throws(()=>t.normalizeDocument(dt));
 const newP=t.migrateRfc2Pattern(pt),newD=t.migrateRfc2Document(dt);
 assert.equal(t.decodePattern(t.migrateRfc2PatternBinary(pb)),newP);
 assert.equal(t.decodeDocument(t.migrateRfc2DocumentBinary(db)),newD);
 assert.ok(newD.startsWith(`tessembly "${PROFILE}";`));
 assert.equal(t.migrateRfc2Pattern('P4:D(I<T,T)'),'P4:D(T<I,T)');
 assert.throws(()=>t.migrateRfc2Document(newD));
 assert.throws(()=>t.migrateRfc2PatternBinary(t.encodePattern('P4')));
 t.dispose();
});
test('new JavaScript refuses legacy Wasm ABI before any document operation',async()=>{
 const module=await WebAssembly.compile(new Uint8Array([0,97,115,109,1,0,0,0]));
 await assert.rejects(createTessembly({wasm:module}),{code:'WASM_ABI_MISMATCH'});
});
test('CLI refuses an explicit legacy profile rather than silently interpreting it as new',()=>{
 const cli=fileURLToPath(new URL('../bin/tessembly.js',import.meta.url));
 const path=fileURLToPath(new URL('../../../tests/fixtures/rfc2/pattern.txt',import.meta.url));
 const out=spawnSync(process.execPath,[cli,'check','--profile','rfc2',path],{encoding:'utf8'});
 assert.equal(out.status,2);assert.match(out.stderr,/UNSUPPORTED_PROFILE/);
});
