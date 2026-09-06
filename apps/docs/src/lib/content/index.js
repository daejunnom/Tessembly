import { start } from './start.js';
import { compact } from './compact.js';
import { advanced } from './advanced.js';
import { state } from './state.js';
import { integration } from './integration.js';
import { tools } from './tools.js';
import { translateChapter } from './english.js';
import { npmChapters } from './npm.js';
/** @type {import('./types').Chapter[]} */
export const chapters = [start[0], ...compact, ...advanced, ...state, ...integration, ...tools, npmChapters.ko, start[1]];
// One source of executable examples for both presentation languages.
const requestBlock = chapters.find(c=>c.slug==='tools').sections.find(s=>s.id==='connect').blocks[0];
requestBlock.text = JSON.stringify({id:1,protocol:'tessembly.document-test-port.v1',profile:'tessembly.rfc2.precedence.v1',op:'validate',text:'tessembly "tessembly.rfc2.precedence.v1"; supply("P4"); draw(I<TS);'});
const translated = chapters.map(c=>c.slug==='npm'?npmChapters.en:translateChapter(c));
export function getChapters(locale) { return locale==='ko' ? chapters : translated; }
