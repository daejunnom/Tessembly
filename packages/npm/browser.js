import { fromBytes } from './runtime.js';
import { detectLanguage, TessemblyError } from './locale.js';
export { PROFILE, DOCUMENT_SCHEMA, TessemblyError } from './runtime.js';
export { resolveLanguage, detectLanguage, errorMessage } from './locale.js';
export async function createTessembly(options = {}) {
  const language = detectLanguage({ language: options.language,
    browserLanguage: globalThis.navigator?.language,
    systemLanguage: Intl.DateTimeFormat().resolvedOptions().locale });
  let bytes = options.wasm;
  if (bytes === undefined) {
    try {
      const response = await fetch(options.wasmUrl ?? new URL('./tessembly.wasm', import.meta.url));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      bytes = await response.arrayBuffer();
    } catch (cause) { throw new TessemblyError('WASM_LOAD_FAILED', { language, cause }); }
  }
  return fromBytes(bytes, { language });
}
