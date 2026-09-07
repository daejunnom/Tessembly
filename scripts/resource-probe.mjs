// Isolated CI resource evidence. RSS is reported, not claimed as a portable process-wide hard limit.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const dir=resolve(process.argv[2]??'packages/npm');
const bytes=readFileSync(resolve(dir,'tessembly.wasm'));
const {instance}=await WebAssembly.instantiate(bytes,{});const x=instance.exports;
const enc=new TextEncoder();const input=enc.encode('P4:D(I>TS)');
const initial=x.memory.buffer.byteLength;const start=performance.now();let peak=initial;
for(let i=0;i<1000;i++){
 const p=x.ts_reserve_input(input.length);new Uint8Array(x.memory.buffer,p,input.length).set(input);
 assert.equal(x.ts_run(2),0);peak=Math.max(peak,x.memory.buffer.byteLength);
}
const elapsed=performance.now()-start;
assert.throws(()=>x.memory.grow(513-Math.floor(x.memory.buffer.byteLength/65536)),RangeError);
const {createTessembly}=await import(pathToFileURL(resolve(dir,'node.js')));
const t=await createTessembly();assert.throws(()=>t.normalizePattern('I'.repeat(1_000_000)),{code:'INPUT_LIMIT'});t.dispose();
const result={platform:process.platform,arch:process.arch,node:process.version,calls:1000,wasmBytes:bytes.length,initialLinearBytes:initial,peakLinearBytes:peak,maxLinearBytes:33_554_432,totalMs:elapsed,processMemory:process.memoryUsage(),note:'RSS includes V8, code and multiple test instances. Not a portable hard cap or benchmark.'};
console.log(JSON.stringify(result,null,2));if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(result,null,2));
