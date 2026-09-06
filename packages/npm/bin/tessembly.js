#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { createTessembly, detectLanguage, errorMessage, PROFILE } from '../node.js';
import { readLimitedFile } from '../file-io.js';
import { MAX_TEXT_BYTES, MAX_BINARY_BYTES } from '../limits.js';
const args = process.argv.slice(2);
let language; let profile = PROFILE; let deny = false;
function option(name) {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  if (!args[i+1] || args[i+1].startsWith('--')) throw Object.assign(new Error(), { code: 'INVALID_ARGUMENTS' });
  const value = args[i+1]; args.splice(i,2);
  if (args.includes(name)) throw Object.assign(new Error(), { code: 'INVALID_ARGUMENTS' });
  return value;
}
async function main() {
  language = option('--lang'); profile = option('--profile') ?? PROFILE;
  const i = args.indexOf('--deny-unsat'); if (i >= 0) { deny = true; args.splice(i,1); }
  language = detectLanguage({language, env:process.env, systemLanguage:Intl.DateTimeFormat().resolvedOptions().locale});
  const command = args.shift() ?? 'help';
  if (['help','--help','-h'].includes(command)) {
    console.log(language === 'ko' ? 'Tessembly — 한국어 도움말\nRFC2: A>B는 A 선행, A<B는 B 선행입니다.\n존재: D(T). 범위: {}. 비교는 최초 등장 기준입니다.\n명령: check, format, encode, decode, doc-check, doc-format, doc-encode, doc-decode\n입력 파일 뒤에 바이너리/텍스트 출력 파일을 지정합니다(변환 명령).\n--lang ko|en|auto  --profile rfc2  --deny-unsat\n이 도구는 PC 탐색·외부 DB 조회를 하지 않습니다.' : 'Tessembly — English help\nRFC2: A>B means A first; A<B means B first.\nPresence: D(T). Scope: {}. Comparisons use the first occurrence.\nCommands: check, format, encode, decode, doc-check, doc-format, doc-encode, doc-decode\nConversion commands take an input file followed by an output file.\n--lang ko|en|auto  --profile rfc2  --deny-unsat\nNo PC search or external dataset lookup is performed.');
    return;
  }
  const operations = {check:'checkPattern', lint:'checkPattern', format:'normalizePattern', encode:'encodePattern', decode:'decodePattern',
    'doc-check':'checkDocument', 'doc-format':'normalizeDocument', 'doc-encode':'encodeDocument', 'doc-decode':'decodeDocument'};
  const op = Object.hasOwn(operations, command) ? operations[command] : undefined; const conversion = /(?:en|de)code$/.test(command);
  if (!op || args.length !== (conversion ? 2 : 1) || args.some(s=>s.startsWith('--'))) throw Object.assign(new Error(),{code:'INVALID_ARGUMENTS'});
  const t = await createTessembly({language});
  try {
    const input = await readLimitedFile(args[0], command.endsWith('decode') ? MAX_BINARY_BYTES : MAX_TEXT_BYTES, language);
    const value = t[op](command.endsWith('decode') ? input : new TextDecoder('utf-8',{fatal:true}).decode(input), {profile});
    if (conversion) await writeFile(args[1], value, { flag: 'wx' });
    else if (typeof value === 'string') console.log(value);
    else { console.log(JSON.stringify(value)); if (deny && (value.draw==='UNSAT' || value.usage==='UNSAT')) process.exitCode=1; }
  } finally { t.dispose(); }
}
main().catch(error => {
  const code = error.code ?? 'INVALID_ARGUMENTS';
  const lang = language ?? detectLanguage({env:process.env,systemLanguage:Intl.DateTimeFormat().resolvedOptions().locale});
  console.error(`${errorMessage(code,lang)} [${code}] ${error.start ?? 0}..${error.end ?? 0}`);
  process.exitCode=2;
});
