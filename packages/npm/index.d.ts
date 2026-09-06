export type Language = 'en' | 'ko';
export const PROFILE: 'tessembly.rfc2.precedence.v1';
export const DOCUMENT_SCHEMA: 'tessembly.document.v1';
export interface Options { language?: string; wasm?: BufferSource | WebAssembly.Module; wasmUrl?: string | URL; }
export interface PatternOptions { profile?: typeof PROFILE | 'rfc2'; }
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
  dispose(): void;
}
export class TessemblyError extends Error { readonly code: string; readonly start: number; readonly end: number; readonly language: Language; }
export function createTessembly(options?: Options): Promise<Tessembly>;
export function resolveLanguage(value?: string): Language;
export function detectLanguage(options?: {language?: string; browserLanguage?: string; systemLanguage?: string; env?: Record<string,string|undefined>}): Language;
export function errorMessage(code: string, language?: string): string;
