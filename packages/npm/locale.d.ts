export type Language = 'en' | 'ko';
export function resolveLanguage(value?: string): Language;
export function detectLanguage(options?: {language?: string; browserLanguage?: string; systemLanguage?: string; env?: Record<string,string|undefined>}): Language;
export function errorMessage(code: string, language?: string): string;
export class TessemblyError extends Error {
  constructor(code: string, options?: {language?: string; start?: number; end?: number; cause?: unknown});
  readonly code: string; readonly start: number; readonly end: number; readonly language: Language;
}
