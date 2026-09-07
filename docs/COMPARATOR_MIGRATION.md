# Comparator alignment: RFC3 / 부등호 관례 정렬

**Implemented in the 0.2.0 candidate; not an npm publication. / 0.2.0 후보에 구현, npm 공개 배포와 별개입니다.**

Tessembly's compact syntax exists to stay close to Clearra's queue inputs and internal structure. It does not claim existing sfinder/Marfung notation is missing or useless. Clearra/CTK3 are native integration targets; adapters and datasets remain consumer-owned. KPCA is the intended reference name (the earlier “KPCO” was a typo).

테섬블리의 새 문법은 Clearra의 큐 입력과 내부 구조에 가깝게 연결하기 위한 선택입니다. 기존 Sfinder·Marfung 표기를 대체해야만 가치가 있다는 전제가 아닙니다. Clearra/CTK3를 네이티브 연동 대상으로 두되 외부 어댑터·데이터셋은 사용자 또는 외부 개발자의 책임입니다. 이전 KPCO 표기는 KPCA의 오타입니다.

## Exact semantics / 정확한 의미

Active profile: `tessembly.rfc3.order.v1`.

| RFC3 | Meaning / 의미 |
|---|---|
| `I<T` | I precedes T / I가 T보다 먼저 |
| `I>T` | T precedes I / T가 I보다 먼저 |
| `I<TS` | I precedes both T and S; T/S unordered / I가 T·S보다 먼저, T·S 간 순서는 무관 |
| `I<T>S` | I and S precede T / I·S가 T보다 먼저 |
| `T>IS` | Equivalent to `I<T>S` / 위 조건과 동등 |
| `I<T,T` | I precedes T, and T must exist / I 선행 + T 존재 요구 |

Comparisons use first occurrence **inside the attached closed scope**, not every occurrence or an occurrence outside it. Bare kinds require presence. Groups and commas mean AND; chains add adjacent cross-group comparisons only. The first/earlier kind must exist. If only it exists, Before is true. If only the later kind exists, or neither exists, Before is false. `I<I` is always false. Unobserved is not absent. D and U remain separate domains; U does not establish physical legality. `{}` never creates a bag.

최초 등장은 조건이 붙은 완료된 범위 안에서만 비교합니다. 단독 미노는 존재 조건, 그룹과 쉼표는 AND, 연쇄는 인접 그룹의 모든 교차 비교입니다. 선행 종류는 존재해야 합니다. 선행 종류만 있으면 참, 후행 종류만 있거나 둘 다 없으면 거짓입니다. `I<I`는 거짓이며, 아직 관측되지 않았다는 사실을 부재로 취급하지 않습니다. D와 U는 다른 영역이고 U 판정은 실제 배치 가능성의 증명이 아닙니다. `{}`는 가방을 만들지 않습니다.

| Scope / 범위 | `D(I<T)` |
|---|---|
| `IT` | true |
| `TI` | false |
| `IOSZ` | true |
| `TOSZ` | false |
| `OSZJ` | false |
| `ITIT` | true |
| `TIIT` | false |

Order sentences use `I → T`, not `I > T`. Alignment is with positional comparison and Marfung's executable Before convention, not a claim that all prose in all Tetris communities follows one notation.

진행 순서를 설명하는 문장에는 `I → T`를 사용합니다. 이번 변경은 위치 비교와 Marfung 실행 문법의 관례에 맞추는 것이며, 모든 테트리스 커뮤니티의 문장 표기가 동일하다는 주장이 아닙니다.

## Legacy handling / 기존 파일 처리

RFC2 `tessembly.rfc2.precedence.v1` is frozen: `I<T` meant T first. Normal RFC3 CLI, npm APIs, advanced parsers and binary readers reject that explicit profile/header. The low-level Rust text parser can still parse the full RFC2 identifier **only when explicitly supplied** for migration. There is no text heuristic or locale-dependent direction.

기존 RFC2의 `I<T`는 T 선행으로 동결합니다. 일반 RFC3 CLI/npm/고급 파서/바이너리 읽기는 RFC2 프로필·헤더를 거부합니다. 저수준 Rust 텍스트 파서만 명시적인 RFC2 식별자를 받아 이전 의미를 읽을 수 있습니다. 문법 모양이나 로캘로 버전을 추측하지 않습니다.

An unlabelled compact string cannot reveal its historical version. Before upgrading stored snippets, inventory their source version and call explicit migration. The npm default changes with the deliberate 0.2.0 package boundary; old 0.1.x artifacts are not overwritten. Store a semantic profile with compact text or use a self-describing document/binary.

헤더 없는 단축 문자열만으로 과거 버전을 알아낼 수는 없습니다. 저장된 입력의 버전을 확인한 뒤 명시적으로 이관해야 합니다. npm 기본값 변경은 0.2.0 경계에서 이루어지고 기존 0.1.x 파일은 덮어쓰지 않습니다. 단축 텍스트에는 프로필을 함께 저장하거나 헤더 있는 문서/바이너리를 사용하세요.

| Original RFC2 / 기존 | Equivalent RFC3 / 같은 의미 |
|---|---|
| `D(I<T)` | `D(T<I)` |
| `D(I<TS)` | `D(T<I,S<I)` |
| `D(I<T>S)` | `D(T<I,T<S)` |
| `D(T)` | `D(T)` |

```sh
# Native / 네이티브: input then NEW output path
 tessembly migrate-rfc2 old.tsm new.tsm
 tessembly doc-migrate-rfc2 old.tsmd new.tsmd
 tessembly migrate-binary-rfc2 old.tsmb new.tsmb
 tessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc
```

```js
const newText = t.migrateRfc2Pattern(oldText);
const newDocument = t.migrateRfc2Document(oldDocument);
const newBytes = t.migrateRfc2PatternBinary(oldBytes);
const newDocumentBytes = t.migrateRfc2DocumentBinary(oldDocumentBytes);
```

Migration parses RFC2 and preserves `Before`/`Present` relations. It does not blindly replace characters in references, quoted identifiers or external payloads. TSMB/TSDC semantic byte changes 2→3; structural wire remains 1. Nested pattern headers must match the outer document. Both directions of JS/Wasm mismatch fail because the The initial RFC3 Wasm ABI was 2; current F1/F2 requires ABI 3. Binary migration with opaque optional metadata fails with `MIGRATION_REQUIRES_METADATA_HANDLER` rather than assuming that unknown metadata is profile-independent.

이관은 RFC2를 파싱하여 Before/Present를 보존합니다. 참조 문자열·식별자·외부 값의 부등호를 일괄 치환하지 않습니다. TSMB/TSDC 의미 바이트는 2→3, 구조 wire는 1을 유지합니다. 내장 패턴과 외부 문서의 헤더도 일치해야 합니다. 초기 RFC3 ABI는 2였고 현재 F1/F2 ABI는 3이므로 이전 JS와 새 Wasm, 새 JS와 이전 Wasm의 혼합을 거부합니다. 불투명 선택 메타데이터의 의미를 알 수 없으면 `MIGRATION_REQUIRES_METADATA_HANDLER`로 멈춥니다.

## Current implementation / 현재 구현

F1/F2 logic, counts, windows and ordinals are implemented in 0.3.x. The comparator migration
started in 0.2.0. Current wrapper/Wasm ABI is 3 (initial RFC3-only builds used ABI 2).
Q1/M1/MATCH and setup/policy/dataset extensions are not added. Basic reference/select records
are retained for file compatibility.

F1/F2는 0.3.x에 구현되어 있습니다. 최초 RFC3 변경은 0.2.0에서 시작했고 현재
wrapper/Wasm ABI는 3입니다. 초기 ABI=2 자산과 혼용하지 마세요. Q1/M1/MATCH는
추가하지 않고 기존 reference/select 레코드만 호환 목적으로 보존합니다.

## Sources / 근거

- Marfung's Before notation, first occurrence and missing-later rule: https://github.com/Marfung37/ExtendedSfinderPieces#before
- Sfinder pattern reference: https://github.com/knewjade/solution-finder
- KPCA / PC INFO KOREA (human setup explanations are not a universal parser specification): https://sites.google.com/view/pcinfokorea/

Golden legacy text and wire fixtures in `tests/fixtures/rfc2` were generated from the verified 0.1.2 artifact before this change. Exact members/edges are checked: equal cardinalities cannot detect a reversed comparator.
