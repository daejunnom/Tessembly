import { start } from './start.js';
import { compact } from './compact.js';
import { advanced } from './advanced.js';
import { state } from './state.js';
import { integration } from './integration.js';
import { tools } from './tools.js';
/** @type {import('./types').Chapter[]} */
export const chapters = [start[0], ...compact, ...advanced, ...state, ...integration, ...tools, start[1]];
