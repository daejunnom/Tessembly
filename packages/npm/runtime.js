import { resolveLanguage, TessemblyError } from './locale.js';
import { inputBytes, MAX_BINARY_BYTES, MAX_WASM_BYTES } from './limits.js';
export { TessemblyError } from './locale.js';
export const PROFILE = 'tessembly.rfc3.order.v1';
export const LEGACY_PROFILE = 'tessembly.rfc2.precedence.v1';
export const DOCUMENT_SCHEMA = 'tessembly.document.v1';
const decoder = new TextDecoder('utf-8', { fatal: true });
export async function fromBytes(bytes, { language = 'en' } = {}) {
  let x;
  try {
    // Caller-supplied Wasm is trusted executable code, never a document or plugin fetched from input.
    const suppliedModule = bytes instanceof WebAssembly.Module;
    if (!suppliedModule && (!ArrayBuffer.isView(bytes) && !(bytes instanceof ArrayBuffer))) {
      throw new TessemblyError('INVALID_ARGUMENTS', { language });
    }
    if (!suppliedModule && bytes.byteLength > MAX_WASM_BYTES) throw new TessemblyError('WASM_SIZE_LIMIT', { language });
    const module = suppliedModule ? bytes : await WebAssembly.compile(bytes);
    if (WebAssembly.Module.imports(module).length) throw new TessemblyError('WASM_ABI_MISMATCH', { language });
    x = (await WebAssembly.instantiate(module, {})).exports;
  } catch (cause) {
    if (cause instanceof TessemblyError) throw cause;
    throw new TessemblyError('WASM_LOAD_FAILED', { language, cause });
  }
  if (!(x.memory instanceof WebAssembly.Memory) || typeof x.ts_abi_version !== 'function' || x.ts_abi_version() !== 3 ||
      ['ts_reserve_input','ts_run','ts_output_ptr','ts_output_len','ts_error_start','ts_error_end','ts_reset'].some(k => typeof x[k] !== 'function')) {
    throw new TessemblyError('WASM_ABI_MISMATCH', { language });
  }
  let lang = resolveLanguage(language); let disposed = false; let failed = false;
  function invoke(op, input) {
    if (disposed) throw new TessemblyError('DISPOSED', { language: lang });
    if (failed) throw new TessemblyError('WASM_INSTANCE_FAILED', { language: lang });
    const data = inputBytes(input, ![4,8,11,12].includes(op), lang);
    try {
      const ptr = x.ts_reserve_input(data.byteLength);
      if (!ptr && data.byteLength) throw new TessemblyError('INPUT_LIMIT', { language: lang });
      new Uint8Array(x.memory.buffer, ptr, data.byteLength).set(data);
      const status = x.ts_run(op);
      const outLength = x.ts_output_len();
      if (outLength > MAX_BINARY_BYTES) throw new RangeError('WASM_OUTPUT_LIMIT');
      // Own this snapshot; later calls may overwrite buffers or grow memory.
      const out = new Uint8Array(x.memory.buffer, x.ts_output_ptr(), outLength).slice();
      if (status !== 0) throw new TessemblyError(decoder.decode(out), {
        language: lang, start: x.ts_error_start(), end: x.ts_error_end()
      });
      return out;
    } catch (cause) {
      if (cause instanceof TessemblyError) throw cause;
      // A trap may skip Rust destructors. Never reuse potentially poisoned RefCell/allocator state.
      failed = true; x = null;
      throw new TessemblyError('WASM_TRAP', { language: lang, cause });
    }
  }
  function profile(options) {
    if (options?.profile !== undefined && options.profile !== PROFILE && options.profile !== 'rfc3') {
      throw new TessemblyError('UNSUPPORTED_PROFILE', { language: lang });
    }
  }
  function pattern(op, input, options) { profile(options); return invoke(op, input); }
  function report(out) {
    return { profile: PROFILE, syntax: 'VALID', draw: out[0] ? 'UNSAT' : 'NOT_CHECKED',
      usage: out[1] ? 'UNSAT' : 'NOT_CHECKED', normalized: decoder.decode(out.subarray(2)),
      executionChecked: false, externalDataAccessed: false };
  }
  return Object.freeze({
    profile: PROFILE,
    get language() { return lang; },
    setLanguage(value) { lang = resolveLanguage(value); },
    normalizePattern: (text, options) => decoder.decode(pattern(1,text,options)),
    checkPattern: (text, options) => report(pattern(2,text,options)),
    encodePattern: (text, options) => pattern(3,text,options),
    decodePattern: (bytes) => decoder.decode(invoke(4,bytes)),
    normalizeDocument: (text) => decoder.decode(invoke(5,text)),
    checkDocument: (text) => ({ ...report(invoke(6,text)), schema: DOCUMENT_SCHEMA }),
    encodeDocument: (text) => invoke(7,text),
    decodeDocument: (bytes) => decoder.decode(invoke(8,bytes)),
    migrateRfc2Pattern: (text) => decoder.decode(invoke(9,text)),
    migrateRfc2Document: (text) => decoder.decode(invoke(10,text)),
    migrateRfc2PatternBinary: (bytes) => invoke(11,bytes),
    migrateRfc2DocumentBinary: (bytes) => invoke(12,bytes),
    dispose() {
      if (disposed) return;
      try { x?.ts_reset(); } catch { failed = true; }
      finally { disposed = true; x = null; }
    }
  });
}
