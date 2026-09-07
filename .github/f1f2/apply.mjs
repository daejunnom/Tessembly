import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const entries=[
 ['01.patch','c6623923a5532a339909a7cd33b36cfa2568ae4249264aa5e71fce6c27376556'],
 ['02.patch','1d46dfac56a994efe65831a3f72e258f728e95027695ce7c90a98cd746db28ea'],
 ['03.patch','dcdc934372ba6d1d0e0b93e0271a13c5d16f4feac1dd0d4a866951aada81f6db'],
 ['04.patch','03033b6944199a991fad5c7720a73eb0283f042864386635821dc00c03ef93c3'],
 ['04b.patch','6f532a26f34af0711859b7aa4874414ac9d58e6a14c66c8fc3823e2e3d94d569'],
 ['05.patch','6dce16ec60b1802b701eae2ecec9926d6092d81cf8bb0d3b24bee3ad8fae2106'],
 ['06.patch','c0e3d3dd89ab910f7702e1e147cf0d21574de4f08345eb9767b96193d6e246de'],
 ['07.patch','53012626584298177f8c7d889381fd7453d5328f2eae624ba29b8d36d3bccefb']
];
const allowed=[
 'Cargo.lock','Cargo.toml','bindings/wasm/Cargo.lock','bindings/wasm/Cargo.toml','bindings/wasm/src/lib.rs',
 'crates/tessembly-cli/src/expand.rs','crates/tessembly-cli/src/port.rs','crates/tessembly-cli/tests/profile_migration.rs','crates/tessembly-cli/tests/supply_filters.rs',
 'crates/tessembly-codec/src/filter.rs','crates/tessembly-codec/src/lib.rs','crates/tessembly-conformance/Cargo.toml','crates/tessembly-conformance/src/bin/filters.rs',
 'crates/tessembly-core/src/filter.rs','crates/tessembly-core/src/lib.rs','crates/tessembly-core/src/model.rs',
 'crates/tessembly-document/src/lib.rs','crates/tessembly-document/src/parser.rs','crates/tessembly-document/src/render.rs','crates/tessembly-document/src/schema.rs','crates/tessembly-document/src/wire.rs',
 'crates/tessembly-relations/src/lib.rs','crates/tessembly-text/src/filter.rs','crates/tessembly-text/src/lib.rs','crates/tessembly-text/src/parser.rs','crates/tessembly-text/src/print.rs',
 'crates/tessembly-text/tests/order_profile.rs','crates/tessembly-text/tests/parser.rs','packages/npm/package.json','packages/npm/runtime.js','packages/npm/tests/filters.test.mjs'
];
function git(...args){return execFileSync('git',args,{encoding:'utf8',maxBuffer:2_000_000});}
assert.equal(process.env.GITHUB_REPOSITORY,'daejunnom/Tessembly');
assert.equal(process.env.GITHUB_REF,'refs/heads/main');
if(process.argv[2]==='stage'){
 const changed=git('diff','--name-only','HEAD').trim().split('\n').filter(Boolean);
 assert.ok(changed.every(p=>allowed.includes(p)),'Unexpected changed path; no documentation or Pages writes allowed');
 git('add','--',...allowed);
 assert.deepEqual(git('diff','--cached','--name-only').trim().split('\n').sort(),changed.sort());
 console.log(`Staged ${changed.length} implementation/test files only.`);
}else{
 const parts=entries.map(([file,hash])=>{
  const b=fs.readFileSync(new URL(file,import.meta.url));
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash,`Checksum mismatch: ${file}`);return b;
 });
 const data=Buffer.concat(parts);
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),'b4ea01f28e44dd05172eaca7a435e3c56ae9d8493e5e774e616916e4e06a45ea');
 const paths=[...data.toString('utf8').matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map(m=>{assert.equal(m[1],m[2]);return m[1];});
 assert.deepEqual(paths,allowed);
 const file=path.join(process.env.RUNNER_TEMP,'f1f2-reviewed.patch');fs.writeFileSync(file,data,{flag:'wx'});
 git('apply','--check',file);git('apply',file);git('add','-N','--',...allowed);
 console.log('Applied approved F1/F2 supply filters. No Q1/M1 implementation or documentation change.');
}
