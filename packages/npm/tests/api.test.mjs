import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTessembly, PROFILE, TessemblyError, detectLanguage, resolveLanguage } from '../node.js';
const doc = `tessembly "${PROFILE}"; config { hold=slot(initial=empty); see=view(next=5); rule=seven_bag(); start=boundary(); } supply("P4"); draw(I<TS,I);`;
test('zero imports: bundled Wasm uses no WASI, glue package or native addon', async () => {
  const wasm = await readFile(new URL('../tessembly.wasm', import.meta.url));
  assert.deepEqual(WebAssembly.Module.imports(new WebAssembly.Module(wasm)), []);
});
test('same Rust parser normalizes group and mixed-chain syntax', async () => {
  const t = await createTessembly({language:'en'});
  assert.equal(t.normalizePattern('P4:D(I<T>S)'), t.normalizePattern('P4:D(T>IS)'));
  assert.match(t.normalizePattern('P4:D(T)'), /D\(T\)/);
  assert.throws(()=>t.normalizePattern('P4:D(HAS(T))'),TessemblyError);
  assert.throws(()=>t.normalizePattern('P4',{profile:'rfc1'}), {code:'UNSUPPORTED_PROFILE'});
  t.dispose();
});
test('D and U contradictions remain different domains', async () => {
  const t = await createTessembly();
  assert.equal(t.checkPattern('P7:D(I<T<I)').draw, 'UNSAT');
  const u = t.checkPattern('P7:U(I<T<I)');
  assert.equal(u.draw,'NOT_CHECKED'); assert.equal(u.usage,'UNSAT');
  assert.equal(u.executionChecked,false); t.dispose();
});
test('both binary formats round-trip without reparsing a source wrapper', async () => {
  const t = await createTessembly();
  const a = t.encodePattern('P4:D(T)'); const before = a.slice();
  const b = t.encodeDocument(doc);
  assert.deepEqual(a,before);
  assert.equal(new TextDecoder().decode(a.subarray(0,4)),'TSMB');
  assert.equal(new TextDecoder().decode(b.subarray(0,4)),'TSDC');
  assert.equal(t.decodePattern(a),t.normalizePattern('P4:D(T)'));
  assert.equal(t.decodeDocument(b),t.normalizeDocument(doc));
  assert.equal(t.checkDocument(doc).externalDataAccessed,false);
  for (const data of [a.subarray(0,2),b.subarray(0,3)]) assert.throws(()=>t.decodeDocument(data),TessemblyError);
  t.dispose();
});
test('custom identifiers and references remain declarations',async()=>{
  const t=await createTessembly();
  const custom=`tessembly "${PROFILE}"; config {registry=["PENTO_P"];rule=from_source;} supply(take(4,bag(["I","PENTO_P"]))); draw(before("PENTO_P","I"));`;
  assert.equal(t.decodeDocument(t.encodeDocument(custom)),t.normalizeDocument(custom));
  assert.equal(t.checkDocument(custom).draw,'NOT_CHECKED'); t.dispose();
});
test('language resolution uses primary language, never a secondary Korean preference',()=>{
  for (const s of ['ko','ko-KR','ko_KR.UTF-8','KO-kr']) assert.equal(resolveLanguage(s),'ko');
  for (const s of ['en','ja-JP','zh-CN','C','POSIX','kok','']) assert.equal(resolveLanguage(s),'en');
  assert.equal(detectLanguage({browserLanguage:'en-US',systemLanguage:'ko-KR'}),'en');
  assert.equal(detectLanguage({env:{LC_ALL:'C',LANG:'ko_KR.UTF-8'}}),'en');
  assert.equal(detectLanguage({language:'ko',env:{LANG:'en_US'}}),'ko');
});
test('localized errors preserve code and byte spans',async()=>{
  const t=await createTessembly({language:'ko'}); let a,b;
  try{t.normalizePattern('P4:D(HAS(T))');}catch(e){a=e;}
  t.setLanguage('en'); try{t.normalizePattern('P4:D(HAS(T))');}catch(e){b=e;}
  assert.equal(a.code,b.code); assert.equal(a.start,b.start); assert.notEqual(a.message,b.message);
  assert.match(a.message,/[가-힣]/); assert.doesNotMatch(b.message,/[가-힣]/);
  t.dispose(); assert.throws(()=>t.normalizePattern('I'),{code:'DISPOSED'});
});
test('Node CLI selects English fallback and Korean override',()=>{
  const path=fileURLToPath(new URL('../bin/tessembly.js',import.meta.url));
  for(const [lang,text] of [['ko-KR','한국어 도움말'],['ja-JP','English help']]) {
    const r=spawnSync(process.execPath,[path,'help'],{encoding:'utf8',env:{...process.env,TESSEMBLY_LANG:lang}});
    assert.equal(r.status,0); assert.ok(r.stdout.includes(text));
  }
});
