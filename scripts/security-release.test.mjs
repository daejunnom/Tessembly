import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { makeTar } from './test-tar.mjs';
import { tarEntries } from './tar-reader.mjs';
import { confirmRegistry, publicationState } from './release-contract.mjs';
const license=readFileSync(new URL('../LICENSE',import.meta.url));
const bytes=makeTar([['package/LICENSE',license],['package/package.json','{}']]);
const integrity='sha512-'+createHash('sha512').update(bytes).digest('base64');
const info={name:'tessembly',version:'0.1.2',integrity,license_sha256:createHash('sha256').update(license).digest('hex')};
const m={name:info.name,version:info.version,license:'MIT',repository:{url:'git+https://github.com/daejunnom/Tessembly.git'},dist:{integrity,tarball:'https://registry.npmjs.org/tessembly/-/tessembly-0.1.2.tgz'}};
const ok=url=>url.endsWith('.tgz')?new Response(bytes):Response.json(m);
test('registry propagation slower than the old 38-second window is recoverable without publishing twice',async()=>{
  let time=0,calls=0,progress=[];
  const result=await confirmRegistry(info,async url=>++calls<=5?new Response('',{status:404}):ok(url),{now:()=>time,sleep:async n=>{time+=n;},progress:x=>progress.push(x)});
  assert.equal(result.status,'PUBLISHED_AND_VERIFIED');assert.ok(time>=50_000);assert.equal(progress.length,5);
});
test('same published artifact is idempotent but another artifact at that version is not',async()=>{
  assert.equal(await publicationState(info,async u=>ok(u)),'ALREADY_PUBLISHED_EXACT');
  assert.equal(await publicationState(info,async()=>new Response('',{status:404})),'UNPUBLISHED');
  await assert.rejects(publicationState(info,async()=>Response.json({...m,dist:{...m.dist,integrity:'sha512-other'}})),/VERSION_ALREADY_PUBLISHED_MISMATCH:integrity/);
});
test('terminal metadata or authorization failures are not disguised as visibility delay',async()=>{
  await assert.rejects(confirmRegistry(info,async()=>Response.json({...m,license:'UNLICENSED'})),/PUBLISHED_METADATA_MISMATCH:license/);
  await assert.rejects(confirmRegistry(info,async()=>new Response('',{status:403})),/REGISTRY_ACCESS_OR_PROTOCOL_ERROR:403/);
});
test('accepted but unverified state remains distinct when polling budget is exhausted',async()=>{
  let time=0;
  await assert.rejects(confirmRegistry(info,async()=>new Response('',{status:503}),{timeoutMs:25_000,now:()=>time,sleep:async n=>{time+=n;}}),/PUBLISH_ACCEPTED_BUT_UNVERIFIED/);
  assert.equal(time,25_000);
});
test('registry tarball bytes and MIT body are verified, not just metadata',async()=>{
  await assert.rejects(publicationState(info,async url=>url.endsWith('.tgz')?new Response(Buffer.from('tampered')):Response.json(m)),/TARBALL_INTEGRITY/);
  await assert.rejects(publicationState(info,async()=>Response.json({...m,dist:{...m.dist,tarball:'https://example.invalid/asset.tgz'}})),/TARBALL_URL/);
});
test('archive reader rejects traversal, absolute paths, links, duplicate entries and malformed checksums',()=>{
  for(const name of ['package/../escape','/tmp/escape','package/..\\escape','package/.npmrc'])assert.throws(()=>tarEntries(makeTar([[name,'bad']])),/UNSAFE|HIDDEN/);
  for(const type of ['1','2','x'])assert.throws(()=>tarEntries(makeTar([['package/link','',type]])),/UNSUPPORTED_TAR_ENTRY/);
  assert.throws(()=>tarEntries(makeTar([['package/a','x'],['package/a','y']])),/DUPLICATE/);
  assert.throws(()=>tarEntries(gzipSync(Buffer.alloc(2048,65))),/CHECKSUM|NUMBER/);
});
test('decompression bombs and excessive entry counts are bounded before interpretation',()=>{
  assert.throws(()=>tarEntries(gzipSync(Buffer.alloc(9_000_000))));
  assert.throws(()=>tarEntries(makeTar(Array.from({length:129},(_,i)=>[`package/f${i}`,'x']))),/ARCHIVE_ENTRY_LIMIT/);
});
test('tarball propagation can lag metadata without another upload',async()=>{
  let time=0,files=0;
  const result=await confirmRegistry(info,async url=>url.endsWith('.tgz')&&++files===1?new Response('',{status:404}):ok(url),{now:()=>time,sleep:async n=>{time+=n;}});
  assert.equal(result.status,'PUBLISHED_AND_VERIFIED');assert.equal(files,2);
});
