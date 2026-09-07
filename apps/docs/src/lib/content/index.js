import { migrationChapters } from './migration.js';
import { start } from './start.js';
import { compact } from './compact.js';
import { filters } from './filters.js';
import { advanced } from './advanced.js';
import { state } from './state.js';
import { integration } from './integration.js';
import { tools } from './tools.js';
import { translateChapter } from './english.js';
import { npmChapters } from './npm.js';
import { securityPlatformChapters } from './security-platforms.js';
/** @type {import('./types').Chapter[]} */
export const chapters = [start[0], ...compact, ...filters, ...advanced, ...state, ...integration, ...tools, npmChapters.ko, ...securityPlatformChapters.ko, ...migrationChapters.ko, start[1]];
/** @type {import("./types").Chapter[]} */
const translated = chapters.map(c => c.slug === 'npm' ? npmChapters.en : (securityPlatformChapters.en.find(x => x.slug === c.slug) ?? migrationChapters.en.find(x => x.slug === c.slug) ?? translateChapter(c)));
/** @param {string} locale @returns {import("./types").Chapter[]} */
export function getChapters(locale) { return locale === 'ko' ? chapters : translated; }
