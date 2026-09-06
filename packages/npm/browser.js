import { readResponse, MAX_WASM_BYTES } from './limits.js';
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
      const response = await fetch(options.wasmUrl ?? new URL('./tessembly.wasm', import.meta.url), { signal: AbortSignal.timeout(15_000), credentials: 'same-origin' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      bytes = await readResponse(response, MAX_WASM_BYTES, language);
    } catch (cause) { if (cause instanceof TessemblyError) throw cause; throw new TessemblyError('WASM_LOAD_FAILED', { language, cause }); }
  }
  return fromBytes(bytes, { language });
}
