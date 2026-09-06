/** Resource limits are enforced before copying or decoding untrusted input. */
import { TessemblyError } from './locale.js';
export const MAX_TEXT_BYTES = 65_536;
export const MAX_BINARY_BYTES = 1_048_592;
export const MAX_WASM_BYTES = 2_097_152;
export const MAX_WASM_MEMORY_BYTES = 33_554_432;
const encoder = new TextEncoder();
export function inputBytes(input, text, language) {
  if (text) {
    if (typeof input !== 'string') throw new TessemblyError('INVALID_ARGUMENTS', { language });
    // UTF-8 cannot be shorter than UTF-16 code-unit count. Avoid allocating a huge encoded copy.
    if (input.length > MAX_TEXT_BYTES) throw new TessemblyError('INPUT_LIMIT', { language });
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        const low = input.charCodeAt(++i);
        if (!(low >= 0xdc00 && low <= 0xdfff)) throw new TessemblyError('INVALID_UTF8', { language });
      } else if (c >= 0xdc00 && c <= 0xdfff) throw new TessemblyError('INVALID_UTF8', { language });
    }
    const bytes = encoder.encode(input);
    if (bytes.byteLength > MAX_TEXT_BYTES) throw new TessemblyError('INPUT_LIMIT', { language });
    return bytes;
  }
  if (!(input instanceof Uint8Array || input instanceof ArrayBuffer)) throw new TessemblyError('INVALID_ARGUMENTS', { language });
  if (typeof SharedArrayBuffer !== 'undefined' && input.buffer instanceof SharedArrayBuffer) {
    throw new TessemblyError('SHARED_INPUT_UNSUPPORTED', { language });
  }
  if (input.byteLength > MAX_BINARY_BYTES) throw new TessemblyError('INPUT_LIMIT', { language });
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}
/** Bounds the decoded HTTP stream too; Content-Length alone is not trusted. */
export async function readResponse(response, limit, language) {
  if (!response.ok) throw new TessemblyError('WASM_LOAD_FAILED', { language });
  const length = response.headers.get('content-length');
  if (length && /^\d+$/.test(length) && Number(length) > limit) {
    await response.body?.cancel();
    throw new TessemblyError('WASM_SIZE_LIMIT', { language });
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > limit - total) {
        await reader.cancel();
        throw new TessemblyError('WASM_SIZE_LIMIT', { language });
      }
      total += value.byteLength; chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out;
}
