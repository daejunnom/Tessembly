import fs from 'node:fs';
const p='apps/docs/src/lib/content/index.js';
let s=fs.readFileSync(p,'utf8');
s=s.replace('const translated = chapters.map','/** @type {import("./types").Chapter[]} */\nconst translated = chapters.map');
s=s.replace('export function getChapters(locale)', '/** @param {string} locale @returns {import("./types").Chapter[]} */\nexport function getChapters(locale)');
fs.writeFileSync(p,s);
