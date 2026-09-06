// Runs against the ACTUALLY INSTALLED npm artifact, not a source-only implementation.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync,mkdtempSync,rmSync } from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=resolve(process.argv[2]);const p=JSON.parse(readFileSync(join(dir,'package.json')));
for(const k of ['dependencies','peerDependencies','optionalDependencies','bundledDependencies','devDependencies'])assert.equal(Object.keys(p[k]??{}).length,0);
assert.equal(p.license,'MIT');
const {createTessembly}=await import(pathToFileURL(join(dir,'node.js')));const t=await createTessembly({language:'ko'});
assert.equal(t.checkPattern('P7:D(I<T<I)').draw,'UNSAT');
assert.equal(t.normalizePattern('P4:D(I<T>S)'),t.normalizePattern('P4:D(T>IS)'));
assert.equal(t.decodePattern(t.encodePattern('P4:D(T)')),t.normalizePattern('P4:D(T)'));
assert.throws(()=>t.normalizePattern('I'.repeat(70000)),{code:'INPUT_LIMIT'});t.dispose();
const root=mkdtempSync(join(tmpdir(),'tessembly-경로 & '));
try{
 const input=join(root,'입력 (1).tsm');writeFileSync(input,'P4:D(T)');
 const r=spawnSync(process.execPath,[join(dir,'bin/tessembly.js'),'check',input],{encoding:'utf8',timeout:10000});
 assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).syntax,'VALID');
}finally{rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify({status:'INSTALLED_PACKAGE_VERIFIED',version:p.version,platform:process.platform,arch:process.arch,node:process.version}));
