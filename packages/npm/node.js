import { readLimitedFile } from './file-io.js';
import { MAX_WASM_BYTES } from './limits.js';
import { fromBytes } from './runtime.js';
import { detectLanguage, TessemblyError } from './locale.js';
export { PROFILE, DOCUMENT_SCHEMA, TessemblyError } from './runtime.js';
export { resolveLanguage, detectLanguage, errorMessage } from './locale.js';
export async function createTessembly(options = {}) {
  const language = detectLanguage({ language: options.language, env: process.env,
    systemLanguage: Intl.DateTimeFormat().resolvedOptions().locale });
  let bytes = options.wasm;
  if (bytes === undefined) {
    try { bytes = await readLimitedFile(new URL('./tessembly.wasm', import.meta.url), MAX_WASM_BYTES, language); }
    catch (cause) { throw new TessemblyError('WASM_LOAD_FAILED', { language, cause }); }
  }
  return fromBytes(bytes, { language });
}
