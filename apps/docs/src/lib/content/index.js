import { start } from './start.js';
import { compact } from './compact.js';
import { advanced } from './advanced.js';
import { state } from './state.js';
import { integration } from './integration.js';
/** @type {import('./types').Chapter[]} */
export const chapters = [start[0], ...compact, ...advanced, ...state, ...integration, start[1]];
