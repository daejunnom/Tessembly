import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inputBytes, readResponse, MAX_TEXT_BYTES, MAX_BINARY_BYTES, MAX_WASM_BYTES, MAX_WASM_MEMORY_BYTES } from '../limits.js';
import { createTessembly } from '../node.js';
import { fromBytes } from '../runtime.js';
const wasm = () => readFile(new URL('../tessembly.wasm', import.meta.url));

test('input limits precede encoding, reject lone surrogates and shared mutable input', () => {
  assert.throws(() => inputBytes('I'.repeat(MAX_TEXT_BYTES + 1), true, 'en'), { code: 'INPUT_LIMIT' });
  assert.throws(() => inputBytes('가'.repeat(30_000), true, 'en'), { code: 'INPUT_LIMIT' });
  for (const s of ['\ud800', '\udc00', 'I\ud800T']) assert.throws(() => inputBytes(s, true, 'en'), { code: 'INVALID_UTF8' });
  assert.equal(inputBytes('🙂', true, 'en').length, 4);
  assert.throws(() => inputBytes(new Uint8Array(MAX_BINARY_BYTES + 1), false, 'en'), { code: 'INPUT_LIMIT' });
  assert.throws(() => inputBytes({ byteLength: 1 }, false, 'en'), { code: 'INVALID_ARGUMENTS' });
  if (typeof SharedArrayBuffer !== 'undefined') assert.throws(() => inputBytes(new Uint8Array(new SharedArrayBuffer(10)), false, 'en'), { code: 'SHARED_INPUT_UNSUPPORTED' });
});
test('decoded Wasm HTTP stream is capped even when Content-Length lies', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(100)); }, cancel() { cancelled = true; } }), { headers: { 'Content-Length': '1' } });
  await assert.rejects(readResponse(response, 250, 'en'), { code: 'WASM_SIZE_LIMIT' });
  assert.equal(cancelled, true);
  await assert.rejects(readResponse(new Response(new Uint8Array(1), {headers:{'Content-Length':'1000'}}), 5, 'en'), {code:'WASM_SIZE_LIMIT'});
  assert.deepEqual(await readResponse(new Response(new Uint8Array([1,2])), 2, 'en'), new Uint8Array([1,2]));
});
test('oversized executable assets are rejected before WebAssembly compilation', async () => {
  await assert.rejects(fromBytes(new Uint8Array(MAX_WASM_BYTES + 1)), {code:'WASM_SIZE_LIMIT'});
});
// A deliberately trapping, import-free TEST module with the documented ABI. Never production input.
function trapModule() {
  const enc = new TextEncoder(); const u = n => {const a=[]; do {let b=n&127;n>>>=7;a.push(b|(n?128:0));}while(n);return a;};
  const str = s => [...u(enc.encode(s).length),...enc.encode(s)];
  const sec = (id, b) => [id,...u(b.length),...b];
  const names=['ts_abi_version','ts_reserve_input','ts_run','ts_output_ptr','ts_output_len','ts_error_start','ts_error_end','ts_reset'];
  const funcs=[0,1,1,0,0,0,0,2];
  const bodies=names.map((_,i)=> i===2?[0,0,11]: i===7?[0,11]:[0,65,i===0?2:i===1?8:0,11]);
  return new Uint8Array([0,97,115,109,1,0,0,0,
    ...sec(1,[3,96,0,1,127,96,1,127,1,127,96,0,0]),
    ...sec(3,[8,...funcs]),...sec(5,[1,1,1,...u(512)]),
    ...sec(7,[9,...str('memory'),2,0,...names.flatMap((n,i)=>[...str(n),0,i])]),
    ...sec(10,[8,...bodies.flatMap(b=>[...u(b.length),...b])])]);
}
test('unexpected Wasm trap poisons the instance; dispose is idempotent', async () => {
  const t=await fromBytes(trapModule());
  assert.throws(()=>t.normalizePattern('I'),{code:'WASM_TRAP'});
  assert.throws(()=>t.normalizePattern('I'),{code:'WASM_INSTANCE_FAILED'});
  t.dispose();t.dispose();assert.throws(()=>t.normalizePattern('I'),{code:'DISPOSED'});
});
test('bundled Wasm linear memory cannot exceed 32 MiB', async () => {
  const {instance}=await WebAssembly.instantiate(await wasm(),{});
  const memory=instance.exports.memory;
  assert.ok(memory.buffer.byteLength <= MAX_WASM_MEMORY_BYTES);
  assert.throws(()=>memory.grow(MAX_WASM_MEMORY_BYTES/65536-memory.buffer.byteLength/65536+1),RangeError);
});
test('malformed documents and binaries do not poison subsequent valid calls', async () => {
  const t=await createTessembly();
  for(const s of ['{'.repeat(200)+'I'+'}'.repeat(200),'P999999999999999999999999999','P4:D(I<)','P4:D(T)U(','\0']) assert.throws(()=>t.normalizePattern(s));
  let seed=0x12345678;const next=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;};
  for(let i=0;i<500;i++) {
    const a=new Uint8Array(next()%128);for(let j=0;j<a.length;j++)a[j]=next()&255;
    assert.throws(()=>t.decodeDocument(a));
  }
  assert.equal(t.normalizePattern('I'),'I');t.dispose();
});
test('CLI handles Unicode paths without shell interpolation, rejects huge files and refuses overwrite',async ctx=>{
  const dir=await mkdtemp(join(tmpdir(),'tessembly-한글 & '));ctx.after(()=>rm(dir,{recursive:true,force:true}));
  const cli=fileURLToPath(new URL('../bin/tessembly.js',import.meta.url));
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:10_000});
  const source=join(dir,'큐 (1).tsm');await writeFile(source,'P4:D(T)');
  assert.equal(run('check',source).status,0);
  const out=join(dir,'출력.tsmb');assert.equal(run('encode',source,out).status,0);
  const saved=await readFile(out);assert.equal(run('encode',source,out).status,2);assert.deepEqual(await readFile(out),saved);
  assert.equal(run('constructor',source).status,2);
  const huge=join(dir,'large.tsm');const file=await open(huge,'w');await file.truncate(32_000_000);await file.close();
  const r=run('check',huge);assert.equal(r.status,2);assert.match(r.stderr,/INPUT_LIMIT/);
  assert.equal(run('check',dir).status,2);
});
