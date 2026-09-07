import type { Language } from './locale.js';
export { TessemblyError, resolveLanguage, detectLanguage, errorMessage } from './locale.js';
export type { Language } from './locale.js';
export const PROFILE: 'tessembly.rfc3.order.v1';
export const LEGACY_PROFILE: 'tessembly.rfc2.precedence.v1';
export const DOCUMENT_SCHEMA: 'tessembly.document.v1';
export interface Options { language?: string; wasm?: BufferSource | WebAssembly.Module; wasmUrl?: string | URL; }
export interface PatternOptions { profile?: typeof PROFILE | 'rfc3'; }
export interface CheckResult {
  profile: typeof PROFILE; syntax: 'VALID'; draw: 'UNSAT' | 'NOT_CHECKED'; usage: 'UNSAT' | 'NOT_CHECKED';
  normalized: string; executionChecked: false; externalDataAccessed: false;
}
export interface Tessembly {
  readonly profile: typeof PROFILE; readonly language: Language;
  setLanguage(language: string): void;
  normalizePattern(text: string, options?: PatternOptions): string;
  checkPattern(text: string, options?: PatternOptions): CheckResult;
  encodePattern(text: string, options?: PatternOptions): Uint8Array;
  decodePattern(bytes: Uint8Array | ArrayBuffer): string;
  normalizeDocument(text: string): string;
  checkDocument(text: string): CheckResult & { schema: typeof DOCUMENT_SCHEMA };
  encodeDocument(text: string): Uint8Array;
  decodeDocument(bytes: Uint8Array | ArrayBuffer): string;
  /** Explicit migration; never auto-detected. Returned text/binary uses RFC3. */
  migrateRfc2Pattern(text: string): string;
  migrateRfc2Document(text: string): string;
  migrateRfc2PatternBinary(bytes: Uint8Array | ArrayBuffer): Uint8Array;
  migrateRfc2DocumentBinary(bytes: Uint8Array | ArrayBuffer): Uint8Array;
  dispose(): void;
}
export function createTessembly(options?: Options): Promise<Tessembly>;
