// Keep the aggregate-budget regression on the current wire header; legacy golden files stay frozen.
import fs from 'node:fs';import assert from 'node:assert/strict';
const file='crates/tessembly-cli/tests/security.rs';
const text=fs.readFileSync(file,'utf8');
const old='b"TSDC\\x01\\x02"';
assert.equal(text.split(old).length,2);
fs.writeFileSync(file,text.replace(old,'b"TSDC\\x01\\x03"'));
const path=`${process.env.RUNNER_TEMP}/rfc3-paths.json`;
const files=JSON.parse(fs.readFileSync(path));assert.ok(!files.includes(file));files.push(file);fs.writeFileSync(path,JSON.stringify(files));
