/** Korean primary language => ko. Every other language, including C/POSIX, => en. */
export function resolveLanguage(value) {
  return typeof value === 'string' && /^ko(?:[-_.@:]|$)/i.test(value.trim()) ? 'ko' : 'en';
}
export function detectLanguage({ language, browserLanguage, env, systemLanguage } = {}) {
  if (language && language !== 'auto') return resolveLanguage(language);
  if (env) {
    for (const key of ['TESSEMBLY_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG', 'LANGUAGE']) {
      if (env[key] && env[key] !== 'auto') return resolveLanguage(env[key].split(':')[0]);
    }
  }
  return resolveLanguage(browserLanguage || systemLanguage || 'en');
}
const messages = {
  INVALID_ARGUMENTS: ['Invalid arguments.', '인수가 올바르지 않습니다.'],
  PROFILE_REQUIRED: ['Specify the semantic profile.', '의미 프로필을 지정하세요.'],
  UNSUPPORTED_PROFILE: ['This semantic profile is not supported.', '지원하지 않는 의미 프로필입니다.'],
  MIGRATION_REQUIRES_METADATA_HANDLER: ['Unknown metadata requires a profile-aware migration handler.', '알 수 없는 메타데이터에는 프로필을 아는 별도 이관 처리가 필요합니다.'],
  CONFIG_CONFLICT: ['Document and host settings conflict.', '문서 설정과 호스트 설정이 충돌합니다.'],
  INVALID_UTF8: ['Input must be valid UTF-8.', '올바른 UTF-8 입력이 필요합니다.'],
  INPUT_LIMIT: ['Input exceeds the supported size.', '입력 크기가 지원 한도를 초과했습니다.'],
  READ_FAILED: ['Could not read the file.', '파일을 읽을 수 없습니다.'],
  WRITE_FAILED: ['Could not write the file.', '파일을 쓸 수 없습니다.'],
  OPAQUE_METADATA_WOULD_BE_LOST: ['Text export would discard opaque metadata.', '텍스트 변환 시 불투명 메타데이터가 유실됩니다.'],
  WASM_LOAD_FAILED: ['Could not load the bundled WebAssembly module.', '포함된 WebAssembly 모듈을 불러올 수 없습니다.'],
  WASM_ABI_MISMATCH: ['The WebAssembly ABI does not match this package.', 'WebAssembly ABI가 패키지와 일치하지 않습니다.'],
  WASM_TRAP: ['WebAssembly processing stopped; no complete result is available.', 'WebAssembly 처리가 중단되어 완전한 결과가 없습니다.'],
  WASM_INSTANCE_FAILED: ['This instance stopped after a trap; create a new instance.', '트랩 이후 중단된 인스턴스입니다. 새 인스턴스를 만드세요.'],
  WASM_SIZE_LIMIT: ['The Wasm asset exceeds the supported limit.', 'Wasm 자산이 크기 한도를 초과했습니다.'],
  SHARED_INPUT_UNSUPPORTED: ['Copy shared input into a private buffer first.', '공유 입력을 먼저 독립 버퍼로 복사하세요.'],
  REGULAR_FILE_REQUIRED: ['Input must be a regular file.', '입력은 일반 파일이어야 합니다.'],
  EEXIST: ['Output already exists; choose a new path.', '출력 파일이 이미 존재합니다. 새 경로를 지정하세요.'],
  DISPOSED: ['This Tessembly instance has been disposed.', '종료된 테섬블리 인스턴스입니다.']
};
export function errorMessage(code, language = 'en') {
  const ko = resolveLanguage(language) === 'ko';
  if (Object.hasOwn(messages, code)) return messages[code][ko ? 1 : 0];
  if (code.startsWith('UNSUPPORTED') || code.endsWith('REQUIRES_HOST')) return ko ? '이 기능 또는 상태는 호스트의 지원이 필요합니다.' : 'This feature or state requires host support.';
  if (code.endsWith('LIMIT') || code === 'INCOMPLETE') return ko ? '처리 한도를 초과했습니다. 불가능 판정이 아닙니다.' : 'A processing limit was reached; this does not prove impossibility.';
  if (code.startsWith('DUPLICATE')) return ko ? '중복된 선언 또는 식별자입니다.' : 'A declaration or identifier is duplicated.';
  if (code.startsWith('EXPECTED') || code.startsWith('INVALID') || code.startsWith('EMPTY') || code.startsWith('UNKNOWN')) return ko ? '입력이 문법 또는 구조 계약에 맞지 않습니다.' : 'Input does not meet the syntax or structure contract.';
  return ko ? '처리할 수 없는 입력입니다. 오류 코드와 위치를 확인하세요.' : 'Input could not be processed. Check the error code and byte span.';
}
export class TessemblyError extends Error {
  constructor(code, { language = 'en', start = 0, end = 0, cause } = {}) {
    super(`${errorMessage(code, language)} [${code}]`, { cause });
    this.name = 'TessemblyError'; this.code = code; this.start = start; this.end = end;
    this.language = resolveLanguage(language);
  }
}
