// Test the examples and truth tables displayed by both languages against the real CLI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { getChapters } from '../apps/docs/src/lib/content/index.js';
const host = process.argv[2];
if (!host) throw new Error('Usage: node scripts/check-documentation.mjs PATH_TO_TESSEMBLY');
const profile='tessembly.rfc3.order.v1'; let id=0, compiled=0, truth=0;
function call(port, op, fields) {
  const request={id:++id,protocol:port==='doc-port'?'tessembly.document-test-port.v1':'tessembly.test-port.v1',profile,op,...fields};
  const p=spawnSync(host,[port],{input:JSON.stringify(request)+'\n',encoding:'utf8',timeout:10000,maxBuffer:2*1024*1024});
  assert.equal(p.error,undefined);assert.equal(p.status,0,p.stderr);
  const response=JSON.parse(p.stdout);assert.equal(response.id,request.id);assert.equal(response.profile,profile);
  return response;
}
function parse(text, context) {
  const doc=text.startsWith('tessembly "');
  const r=call(doc?'doc-port':'test-port',doc?'validate':'compile',{text});
  assert.equal(r.status,'OK',context+': '+JSON.stringify(r));assert.equal(r.complete,true);compiled++;
}
for(const locale of ['en','ko']) {
 const chapters=getChapters(locale);
 for(const c of chapters)for(const s of c.sections)for(const b of s.blocks){
  if(b.kind!=='code')continue;
  const text=b.text.trim(),where=`${locale}/${c.slug}#${s.id}`;
  if(b.language==='json'){const r=JSON.parse(text);if(r.text)parse(r.text,where);continue;}
  if(b.language!=='tessembly')continue;
  if(text.startsWith('tessembly "'))parse(text,where);
  else if(text.startsWith('config '))parse(`tessembly "${profile}";\n${text}\nsupply("I");`,where);
  else if(/^(?:P|\{|[IOTSZJL\[\*])/.test(text))for(const line of text.split('\n').filter(Boolean))parse(line,where);
 }
 const c=chapters.find(x=>x.slug==='compact');
 for(const [scope,expected] of c.sections.find(s=>s.id==='presence').blocks.find(b=>b.kind==='table').rows){
  const r=call('test-port','enumerate_D',{text:`{${scope}}:D(I<T)`});
  assert.equal(r.complete,true);assert.deepEqual(r.queues,expected==='true'?[scope]:[]);truth++;
 }
 for(const [text,expected] of c.sections.find(s=>s.id==='counts').blocks.find(b=>b.kind==='table').rows){
  const r=call('test-port','enumerate_D',{text});assert.equal(r.status,'OK');assert.equal(r.complete,true);assert.equal(r.count,Number(expected));truth++;
 }
 for(const [a,b] of chapters.find(x=>x.slug==='filters').sections.find(s=>s.id==='precedence').blocks[0].rows){
  const x=call('test-port','enumerate_D',{text:'P4:'+a}),y=call('test-port','enumerate_D',{text:'P4:'+b});
  assert.equal(x.complete,true);assert.equal(y.complete,true);assert.deepEqual(x.queues,y.queues);truth++;
 }
}
console.log(JSON.stringify({status:'OK',displayedCodeInputs:compiled,displayedTruthAndSetChecks:truth,profile,scope:'public documentation examples; no PC or external app certification'}));
