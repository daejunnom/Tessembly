import { resolveLanguage, TessemblyError } from './locale.js';
export { TessemblyError } from './locale.js';
export const PROFILE = 'tessembly.rfc2.precedence.v1';
export const DOCUMENT_SCHEMA = 'tessembly.document.v1';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
export async function fromBytes(bytes, { language = 'en' } = {}) {
  let instance;
  try {
    const loaded = await WebAssembly.instantiate(bytes, {});
    instance = loaded instanceof WebAssembly.Instance ? loaded : loaded.instance;
  } catch (cause) { throw new TessemblyError('WASM_LOAD_FAILED', { language, cause }); }
  const x = instance.exports;
  if (!(x.memory instanceof WebAssembly.Memory) || typeof x.ts_abi_version !== 'function' || x.ts_abi_version() !== 1 ||
      ['ts_reserve_input','ts_run','ts_output_ptr','ts_output_len','ts_error_start','ts_error_end','ts_reset'].some(k => typeof x[k] !== 'function')) {
    throw new TessemblyError('WASM_ABI_MISMATCH', { language });
  }
  let lang = resolveLanguage(language); let disposed = false;
  function invoke(op, input) {
    if (disposed) throw new TessemblyError('DISPOSED', { language: lang });
    const textInput = ![4,8].includes(op);
    if (textInput ? typeof input !== 'string' : !(input instanceof Uint8Array || input instanceof ArrayBuffer)) {
      throw new TessemblyError('INVALID_ARGUMENTS', { language: lang });
    }
    const data = textInput ? encoder.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input);
    if (data.byteLength > 1_100_000) throw new TessemblyError('INPUT_LIMIT', { language: lang });
    try {
      const ptr = x.ts_reserve_input(data.byteLength);
      if (!ptr && data.byteLength) throw new TessemblyError('INPUT_LIMIT', { language: lang });
      new Uint8Array(x.memory.buffer, ptr, data.byteLength).set(data);
      const status = x.ts_run(op);
      // Copy the output: later calls may grow memory or overwrite the Rust buffer.
      const out = new Uint8Array(x.memory.buffer, x.ts_output_ptr(), x.ts_output_len()).slice();
      if (status !== 0) throw new TessemblyError(decoder.decode(out), {
        language: lang, start: x.ts_error_start(), end: x.ts_error_end()
      });
      return out;
    } catch (cause) {
      if (cause instanceof TessemblyError) throw cause;
      throw new TessemblyError('WASM_TRAP', { language: lang, cause });
    }
  }
  function profile(options) {
    if (options?.profile !== undefined && options.profile !== PROFILE && options.profile !== 'rfc2') {
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
    dispose() { if (!disposed) x.ts_reset(); disposed = true; }
  });
}
