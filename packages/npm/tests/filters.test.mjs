import test from 'node:test';
import assert from 'node:assert/strict';
import {createTessembly,PROFILE} from '../node.js';

test('F1/F2 compact filters roundtrip through the installed Wasm format',async()=>{
 const t=await createTessembly();
 try {
  for(const s of ['P4:D(I<T&T)','P4:D(I<T|S<Z)','P4:D(!T)','P4:D(T=1&S=0)',
   'P7:D(IN(1,3,T))','{P7P7}:D(I[2]<T[2],I[2])','P4:U(!(I<T)|T=0)']) {
   const text=t.normalizePattern(s),bytes=t.encodePattern(s);
   assert.equal(t.decodePattern(bytes),text);
   assert.equal(t.normalizePattern(text),text);
  }
 } finally {t.dispose();}
});
test('OR/NOT scopes do not become unconditional precedence cycles',async()=>{
 const t=await createTessembly();
 try {
  assert.equal(t.checkPattern('P7:D((I<T&T<I)|T)').draw,'NOT_CHECKED');
  assert.equal(t.checkPattern('P7:D((I<T<T)|(T<I<T))').draw,'UNSAT');
  assert.equal(t.checkPattern('P7:D(IN(1,3,I<T)&IN(4,7,T<I))').draw,'NOT_CHECKED');
  assert.equal(t.checkPattern('{P7P7}:D(I[2]<T[2]<I[2])').draw,'UNSAT');
  const u=t.checkPattern('P7:U(I<T&T<I)');
  assert.equal(u.draw,'NOT_CHECKED');assert.equal(u.usage,'UNSAT');
 } finally {t.dispose();}
});
test('advanced filter equality is not a named argument or assignment',async()=>{
 const t=await createTessembly();
 try {
  const s=`tessembly "${PROFILE}"; supply("P7P7"); draw(T=1 | IN(1,3,I<T&T),T[2]<I[2]);`;
  const text=t.normalizeDocument(s);
  assert.equal(t.decodeDocument(t.encodeDocument(s)),text);
  assert.equal(t.normalizeDocument(text),text);
  assert.equal(t.checkDocument(s).externalDataAccessed,false);
 } finally {t.dispose();}
});
test('all branches are validated before short circuit; source counts remain bounded',async()=>{
 const t=await createTessembly();
 try {
  for(const s of ['P4:D(T|IN(1,5,I))','P4:D(T[0])','P4:D(T&&I)','P4:D(T||I)',
   'P4:D(!I<T)','P4:D(T==1)','P4:D(TS=1)','P4:U(IN(1,3,T))']) assert.throws(()=>t.normalizePattern(s));
  for(const s of ['P4:D(!T)','P4:D(T=1)','P4:D(IN(1,3,T))']) assert.throws(()=>t.migrateRfc2Pattern(s));
  assert.throws(()=>t.normalizePattern(`P4:D(${'!('.repeat(80)}T${')'.repeat(80)})`));
  const d=`tessembly "${PROFILE}"; supply("P4"); draw(any(T,present("UNREGISTERED")));`;
  assert.throws(()=>t.normalizeDocument(d));
 } finally {t.dispose();}
});
test('truncated structural filters and unsupported usage selectors fail without poisoning the instance',async()=>{
 const t=await createTessembly();
 try {
  const input='P7:D(IN(1,3,T=1)|!(I<T))';
  const bytes=t.encodePattern(input);
  for(let i=0;i<bytes.length;i++) assert.throws(()=>t.decodePattern(bytes.subarray(0,i)));
  assert.throws(()=>t.normalizePattern('P4:U(T[2])'),{code:'UNSUPPORTED_USE_SELECTOR'});
  assert.equal(t.decodePattern(bytes),t.normalizePattern(input));
  assert.equal(t.normalizePattern('IT'),'IT');
 } finally {t.dispose();}
});
