# Tessembly

Rust와 동일한 파서·관계 검사·구조적 코덱을 사용하는 zero-dependency ESM 라이브러리입니다. WebAssembly를 패키지에 포함하며 설치 후 Rust/Python·네이티브 애드온·wasm-bindgen 패키지·설치 스크립트·CDN·외부 DB가 필요하지 않습니다.

[English](README.md) · [문서](https://daejunnom.github.io/Tessembly/ko/)

```js
import { createTessembly } from 'tessembly';
const t = await createTessembly({ language: 'ko' });
const result = t.checkPattern('P4:D(I<TS)');
const binary = t.encodePattern('P4:D(T)');
console.log(result, t.decodePattern(binary));
t.dispose();
```

브라우저는 `tessembly/browser`를 사용합니다. 기본값은 인접한 tessembly.wasm 자산이며, 번들러가 복사하지 않으면 wasmUrl 또는 신뢰한 wasm 바이트/Module을 지정하세요. 외부 CDN이 아닌 자신의 앱 자산을 제공합니다. 초기화 뒤 메서드는 동기식이며 공개 서비스는 Worker/프로세스 격리와 자원 제한을 적용해야 합니다.

패턴: normalizePattern/checkPattern/encodePattern/decodePattern. 고급 문서: 동일한 *Document 메서드. NOT_CHECKED는 PC 성공이나 만족 가능성의 증명이 아닙니다. U 관계 검사는 실제 배치 검증이 아니며 불투명 메타데이터가 유실되는 텍스트 변환은 거부합니다.

**RFC2에서 A>B는 A 선행, A<B는 B 선행입니다.** 같은 범위의 최초 등장끼리 비교합니다. 선행 종류가 있어야 하고 후행 종류는 없을 수 있습니다. 단독 종류는 존재 조건, I<T>S와 T>IS는 동일한 의미, 중괄호는 가방이 아닌 범위입니다.

주 언어가 ko이면 한국어, 그 외는 영어입니다. language/setLanguage로 변경하며 Node는 TESSEMBLY_LANG·표준 로캘 변수도 지원합니다. 오류 code/start/end·기계 상태·문법·저장 데이터는 번역하지 않습니다.

CLI: tessembly help, tessembly check input.tsm, tessembly --lang ko doc-check input.tsmd. 변환 출력은 새 파일이어야 하며 기존 파일을 덮어쓰지 않습니다. Node.js 22 이상이 필요하고 npm 의존성 범주·설치 훅은 모두 비어 있습니다.

## 실행 환경과 자원 제한

같은 압축 파일을 Ubuntu 22.04·24.04, Windows x64, macOS Intel·Apple Silicon과 Node 22·24에 설치해 검사합니다. 브라우저는 Chromium의 한국어·영어·기본 언어 대체를 시험하며 모든 OS/브라우저를 인증하지 않습니다.

포함된 Wasm의 **인스턴스별 선형 메모리 상한은 32MiB**이며 프로세스 RSS나 동시 인스턴스 합계가 아닙니다. UTF-8 입력 65,536바이트와 내장 패턴 전체 예산을 적용합니다. 예상하지 못한 트랩 이후 인스턴스는 재사용하지 않지만 일반 입력 오류는 인스턴스를 오염시키지 않습니다. dispose는 참조 해제이지 즉각적인 GC 보장이 아닙니다. 대체 Wasm·URL·파일 경로는 신뢰한 호스트 설정이어야 합니다.

[보안 정책·점검](https://github.com/daejunnom/Tessembly/blob/main/SECURITY.md) · [실행 환경 계약](https://github.com/daejunnom/Tessembly/blob/main/docs/PLATFORMS.md). 0.1.2에서도 RFC2와 zero-dependency를 유지하며 모든 공격에 대한 안전을 보증하지 않습니다.

외부 개발자용 적합성 도구는 제품 런타임이 아닙니다. 데이터셋·Clearra 등의 연결과 PC 탐색·공급 실행·리플레이는 소비자가 구현합니다. Wasm은 배포 전에 Rust 원본에서 빌드되며 설치 후 재컴파일하지 않습니다.

## 라이선스

[MIT](LICENSE). Copyright (c) 2026 daejunnom. 소스·문서에 적용되며 제3자 구성요소는 각자의 라이선스를 유지합니다.
