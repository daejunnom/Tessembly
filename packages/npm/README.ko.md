# Tessembly

Rust와 동일한 파서·관계 검사·구조적 코덱을 사용하는 zero-dependency ESM 라이브러리입니다. WebAssembly 파일을 패키지에 포함합니다. 설치 후 Rust/Python, 네이티브 애드온, wasm-bindgen 패키지, 설치 스크립트, CDN, 외부 DB가 필요하지 않습니다.

[English](README.md) · [문서](https://daejunnom.github.io/Tessembly/ko/)

```js
import { createTessembly } from 'tessembly';
const t = await createTessembly({ language: 'ko' });
const result = t.checkPattern('P4:D(I<TS)');
const binary = t.encodePattern('P4:D(T)');
console.log(result, t.decodePattern(binary));
t.dispose();
```

브라우저에서는 `tessembly/browser`를 사용할 수 있습니다. 기본값은 패키지 옆의 tessembly.wasm을 읽습니다. 번들러가 해당 파일을 옮기지 않는 경우 직접 복사하고 wasmUrl을 지정하거나 wasm 바이트/Module을 전달하세요. 외부 CDN 접근이 아니라 자신의 앱 자산을 읽는 것입니다. 초기화 뒤 메서드는 동기·한도형이며, 반복 처리에는 Worker를 사용할 수 있습니다.

패턴: normalizePattern/checkPattern/encodePattern/decodePattern. 고급 문서: normalizeDocument/checkDocument/encodeDocument/decodeDocument. NOT_CHECKED는 PC 성공이나 만족 가능성을 증명하지 않습니다. 불투명 메타데이터를 텍스트로 바꾸다 잃는 변환은 거부합니다.

RFC2에서 A>B는 A 선행, A<B는 B 선행입니다. 같은 범위의 최초 등장끼리 비교합니다. 선행 종류가 있어야 하고 후행 종류는 없을 수 있습니다. 단독 종류는 존재 조건입니다. I<T>S와 T>IS는 같습니다. 중괄호는 가방이 아닌 범위입니다.

주 언어가 ko이면 한국어, 그 외에는 영어입니다. language 옵션이나 setLanguage로 변경할 수 있습니다. Node에서는 TESSEMBLY_LANG 및 표준 로캘 환경변수도 지원합니다. 오류 code/start/end와 기계 상태·문법·프로필은 번역하지 않습니다.

CLI: tessembly help, tessembly check input.tsm, tessembly --lang ko doc-check input.tsmd. Node.js 22 이상 또는 WebAssembly/TextEncoder를 지원하는 브라우저가 필요합니다. 모든 npm 의존성 범주와 설치 훅은 비어 있습니다.

외부 개발자용 적합성 도구는 제품 런타임이 아닙니다. 데이터셋·Clearra 등의 연결과 PC 탐색·리플레이는 소비자가 구현합니다. 패키지의 WebAssembly는 배포 전에 Rust 원본에서 빌드되며 설치 후 재컴파일하지 않습니다.

라이선스 상태는 UNLICENSED입니다. 소유자가 아직 오픈소스 라이선스를 선택하지 않았으며 공개 배포가 사용 허가를 새로 부여하지는 않습니다.
