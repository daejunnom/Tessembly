// Exact version lookups in OSV; development-only network access, never product runtime.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const packages=[];
const lock=readFileSync('Cargo.lock','utf8');
for(const block of lock.split('[[package]]').slice(1)) {
  if(!/^source = "registry\+/m.test(block))continue;
  const name=block.match(/^name = "([^"]+)"/m)?.[1],version=block.match(/^version = "([^"]+)"/m)?.[1];
  assert.ok(name&&version);packages.push({package:{name,ecosystem:'crates.io'},version});
}
const npm=JSON.parse(readFileSync('apps/docs/package-lock.json','utf8'));
for(const [path,p] of Object.entries(npm.packages)){
 if(!path||!p.version)continue;
 const name=p.name??path.split('node_modules/').at(-1);
 packages.push({package:{name,ecosystem:'npm'},version:p.version});
}
const unique=[...new Map(packages.map(p=>[JSON.stringify(p),p])).values()];
const findings=[];let pending=unique.map((query,index)=>({query,index}));let rounds=0;
while(pending.length){
 assert.ok(++rounds<=10,'AUDIT_INCOMPLETE:pagination limit');
 const next=[];
 for(let i=0;i<pending.length;i+=100){
  const batch=pending.slice(i,i+100);
  const r=await fetch('https://api.osv.dev/v1/querybatch',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({queries:batch.map(p=>p.query)}),signal:AbortSignal.timeout(30000),redirect:'error'});
  assert.ok(r.ok,`AUDIT_INCOMPLETE:HTTP_${r.status}`);
  const reader=r.body.getReader();const chunks=[];let n=0;
  try{for(;;){const v=await reader.read();if(v.done)break;n+=v.value.length;assert.ok(n<=4_194_304,'AUDIT_RESPONSE_LIMIT');chunks.push(v.value);}}finally{await reader.cancel();reader.releaseLock();}
  const body=JSON.parse(Buffer.concat(chunks).toString());assert.equal(body.results?.length,batch.length,'AUDIT_INCOMPLETE:result count');
  for(let j=0;j<batch.length;j++){
   const result=body.results[j];assert.ok(!result.error,'AUDIT_INCOMPLETE:query error');
   for(const v of result.vulns??[])findings.push({query:unique[batch[j].index],id:v.id,modified:v.modified});
   if(result.next_page_token)next.push({...batch[j],query:{...batch[j].query,page_token:result.next_page_token}});
  }
 }
 pending=next;
}
mkdirSync('security-evidence',{recursive:true});
const report={status:findings.length?'FINDINGS':'NO_KNOWN_ADVISORIES',checkedAt:new Date().toISOString(),source:'https://api.osv.dev/v1/querybatch',coverage:'Exact Cargo registry dependencies and all docs npm lock entries; no unpublished Tessembly vulnerability certification.',queries:unique,findings};
writeFileSync('security-evidence/dependency-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,packages:unique.length,findings},null,2));
if(findings.length)process.exitCode=1;
