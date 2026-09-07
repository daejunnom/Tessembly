// Authored Pages blocks also supply Markdown and native CLI help. --check never writes.
import { readFileSync, writeFileSync } from 'node:fs';
import { getChapters } from '../apps/docs/src/lib/content/index.js';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
function block(b) {
  if (b.kind === 'table') {
    const escape = s => String(s).replaceAll('|', '\\|').replaceAll('\n', '<br>');
    return [b.headers.map(escape).join(' | '), b.headers.map(() => '---').join(' | '), ...b.rows.map(r=>r.map(escape).join(' | '))].map(x=>'| '+x+' |').join('\n');
  }
  if (b.kind === 'code') return '```'+(b.language==='tessembly'?'text':b.language??'text')+'\n'+b.text+'\n```';
  if (b.kind === 'link') return `[${b.text}](${b.href})`;
  if (b.kind === 'list') return b.items.map(x=>'- '+x).join('\n');
  return b.kind === 'note' ? '> '+b.text : b.text;
}
for (const lang of ['en','ko']) {
  const chapters=getChapters(lang).filter(c=>['compact','filters','advanced'].includes(c.slug));
  let text=lang==='en'?'# Tessembly — English help':'# Tessembly — 한국어 도움말';
  text+='\n\n'+(lang==='en'?'Implemented reference:':'구현된 참조 사양:')+' `tessembly.rfc3.order.v1`, F1/F2 in 0.3.x.\n\n';
  text+=chapters.map(c=>'## '+c.title+'\n\n'+c.summary+'\n\n'+c.sections.map(s=>'### '+s.title+'\n\n'+s.blocks.map(block).join('\n\n')).join('\n\n')).join('\n\n');
  text+='\n\n## '+(lang==='en'?'Commands and migration':'명령과 명시적 이관')+'\n\n```sh\ntessembly --lang '+lang+' help\ntessembly check --profile rfc3 input.tsm\ntessembly format --profile rfc3 input.tsm\ntessembly encode --profile rfc3 input.tsm new.tsmb\ntessembly decode input.tsmb new.tsm\ntessembly doc-check input.tsmd\ntessembly doc-format input.tsmd\ntessembly doc-encode input.tsmd new.tsdc\ntessembly doc-decode input.tsdc new.tsmd\ntessembly migrate-rfc2 old.tsm new.tsm\ntessembly doc-migrate-rfc2 old.tsmd new.tsmd\ntessembly migrate-binary-rfc2 old.tsmb new.tsmb\ntessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc\n```\n\n';
  text+=(lang==='en'?'Output files must be new files. Language changes presentation, not codes or stored meaning. A repository build is not npm publication.':'출력 파일은 새 파일이어야 합니다. 언어 변경은 표시만 바꾸고 오류 코드·저장 의미는 바꾸지 않습니다. 저장소 빌드는 npm 공개 배포와 별개입니다.')+'\n';
  const file=resolve(root,`docs/HELP.${lang}.md`);
  if(check){if(readFileSync(file,'utf8')!==text)throw new Error(`Stale generated help: ${file}`);}else writeFileSync(file,text);
}
console.log(`LANGUAGE_REFERENCE_${check?'CHECKED':'WRITTEN'} 2`);
