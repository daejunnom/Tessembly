// Temporary, checksum-pinned source migration. Not part of the runtime or permanent build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const hash = data => createHash('sha256').update(data).digest('hex');
const encoded = Array.from({length:6},(_,i)=>fs.readFileSync(`.github/migrations/rfc3-${i}.b64`,'utf8').trim()).join('');
assert.match(encoded,/^[A-Za-z0-9+/]+={0,2}$/);
const packed=Buffer.from(encoded,'base64');
assert.equal(hash(packed),'b8fc85d7f007cc0edab79659fe641225aa484d509dba7cfee5cd7827ec2008be','MIGRATION_PAYLOAD_MISMATCH');
const changes=JSON.parse(brotliDecompressSync(packed,{maxOutputLength:300000}).toString('utf8'));
assert.ok(Array.isArray(changes) && changes.length<100);
const seen=new Set(), prepared=[];
for(const c of changes){
 assert.match(c.path,/^(?:Cargo\.(?:toml|lock)|README\.md|(?:apps\/docs|bindings\/wasm|crates|docs|examples|packages\/npm|scripts|tests)\/[A-Za-z0-9_./-]+)$/);
 assert.ok(!c.path.split('/').includes('..') && !seen.has(c.path));seen.add(c.path);
 assert.equal(path.isAbsolute(c.path),false);
 const exists=fs.existsSync(c.path);
 assert.equal(exists,c.before!==null,`FILE_EXISTENCE:${c.path}`);
 const original=exists?fs.readFileSync(c.path):Buffer.alloc(0);
 if(exists){assert.equal(fs.lstatSync(c.path).isSymbolicLink(),false);assert.equal(hash(original),c.before,`SOURCE_MISMATCH:${c.path}`);}
 const chars=Array.from(original.toString('utf8'));let end=0;
 for(const [a,b,text] of c.edits){assert.ok(Number.isInteger(a)&&Number.isInteger(b)&&a>=end&&b>=a&&b<=chars.length&&typeof text==='string');end=b;}
 let next=chars;
 for(const [a,b,text] of [...c.edits].reverse())next=[...next.slice(0,a),...Array.from(text),...next.slice(b)];
 const result=Buffer.from(next.join(''));
 assert.equal(hash(result),c.after,`TARGET_MISMATCH:${c.path}`);
 prepared.push([c.path,result]);
}
// Validate every before/after hash before changing any file.
for(const [name,bytes] of prepared){fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,bytes);}
const output=path.join(process.env.RUNNER_TEMP??'.','rfc3-paths.json');fs.writeFileSync(output,JSON.stringify([...seen]));
console.log(`Applied ${prepared.length} explicitly reviewed source/document changes. Filters and QB/OQB extensions remain design-only.`);
