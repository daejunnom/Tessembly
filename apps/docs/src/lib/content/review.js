/** Implemented migration documentation only. Design reviews are not published on Pages.
 * @type {Record<string,import('./types').Chapter[]>}
 */
export const reviewChapters = {
  en: [{
    slug: 'migration', title: 'RFC3 migration', kicker: 'PROFILE / MIGRATION',
    summary: 'Implemented comparator alignment: less-than means earlier. Legacy RFC2 meaning is never silently reassigned.',
    sections: [
      { id: 'meaning', title: 'The corrected direction', blocks: [
        { kind: 'table', headers: ['RFC3', 'Meaning'], rows: [['A<B', 'A precedes B'], ['A>B', 'B precedes A'], ['I<TS', 'I precedes T and S; no T/S order'], ['I<T>S', 'I and S precede T'], ['T>IS', 'Equivalent to I<T>S']] },
        { kind: 'code', text: 'P4:D(I<T)\nP4:D(I<TS)\nP4:D(I<T>S)\nP4:D(T>IS)\nP4:D(I<T,T)', language: 'tessembly' },
        { kind: 'p', text: 'First occurrence is local to the attached closed scope. The earlier kind must exist; a missing later kind is allowed. Neither present means false. Bare T requires presence. D and U remain separate; braces are not bags. Hidden future pieces are not absent.' }
      ] },
      { id: 'legacy', title: 'Do not guess the version', blocks: [
        { kind: 'p', text: 'Tessembly follows Clearra inputs and internal structure. This correction aligns the comparator with positional order and Marfung, not every prose convention. KPCA is the correct reference name; KPCO was a typo.' },
        { kind: 'note', text: 'The 0.2.0 candidate defaults to tessembly.rfc3.order.v1. An unlabelled compact string cannot identify its historical profile. Inventory and explicitly migrate old snippets before upgrading. Published 0.1.x artifacts keep their original semantics.' },
        { kind: 'p', text: 'Normal parsers and binary readers reject explicit RFC2 headers. Rust low-level parse can accept the full RFC2 profile only when explicitly supplied. Package, semantic profile, wire and test protocol versions are different contracts.' }
      ] },
      { id: 'commands', title: 'Explicit migration', blocks: [
        { kind: 'code', text: 'tessembly migrate-rfc2 old.tsm new.tsm\ntessembly doc-migrate-rfc2 old.tsmd new.tsmd\ntessembly migrate-binary-rfc2 old.tsmb new.tsmb\ntessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc', language: 'tessembly' },
        { kind: 'code', text: 'const next = t.migrateRfc2Pattern(oldText);\nconst doc = t.migrateRfc2Document(oldDocument);\nconst bytes = t.migrateRfc2PatternBinary(oldBytes);\nconst documentBytes = t.migrateRfc2DocumentBinary(oldDocumentBytes);', language: 'tessembly' },
        { kind: 'p', text: 'RFC2 D(I<T) becomes RFC3 D(T<I). Migration preserves Before/Present, scopes and state. It does not rewrite arbitrary reference strings or reverse already-structured edges. Output files are new files, never overwrites.' }
      ] },
      { id: 'wire', title: 'Stored data and executable assets', blocks: [
        { kind: 'p', text: 'TSMB/TSDC keep structural wire 1 but use semantic byte 3. An RFC2 document must migrate its nested pattern headers as well. Opaque optional metadata requires a separate handler: MIGRATION_REQUIRES_METADATA_HANDLER, not a guessed interpretation. Wasm ABI 2 prevents mixing old/new JavaScript and Wasm.' },
        { kind: 'table', headers: ['Scope', 'D(I<T)'], rows: [['IT', 'true'], ['TI', 'false'], ['IOSZ', 'true'], ['TOSZ', 'false'], ['OSZJ', 'false'], ['ITIT', 'true']] },
        { kind: 'p', text: 'Equal set sizes can hide reversed comparisons. Independent vectors check concrete queues and relationships, and legacy binary fixtures were generated before this change.' },
        { kind: 'link', text: 'Complete migration contract (English / Korean)', href: 'https://github.com/daejunnom/Tessembly/blob/main/docs/COMPARATOR_MIGRATION.md' }
      ] }
    ]
  }],
  ko: [{
    slug: 'migration', title: 'RFC3 이관', kicker: 'PROFILE / MIGRATION',
    summary: '구현된 부등호 정렬: <는 선행입니다. 기존 RFC2의 의미를 조용히 바꾸지 않습니다.',
    sections: [
      { id: 'meaning', title: '수정된 비교 방향', blocks: [
        { kind: 'table', headers: ['RFC3', '의미'], rows: [['A<B', 'A가 B보다 먼저'], ['A>B', 'B가 A보다 먼저'], ['I<TS', 'I가 T·S보다 먼저, T·S 간 순서는 무관'], ['I<T>S', 'I·S가 T보다 먼저'], ['T>IS', 'I<T>S와 동등']] },
        { kind: 'code', text: 'P4:D(I<T)\nP4:D(I<TS)\nP4:D(I<T>S)\nP4:D(T>IS)\nP4:D(I<T,T)', language: 'tessembly' },
        { kind: 'p', text: '조건이 붙은 완료된 범위의 최초 등장끼리 비교합니다. 선행 종류는 있어야 하고 후행 종류의 부재는 허용합니다. 둘 다 없으면 거짓입니다. 단독 T는 존재 조건이며 D/U는 별개입니다. 중괄호는 가방이 아니고 미관측 미래는 부재가 아닙니다.' }
      ] },
      { id: 'legacy', title: '버전을 추측하지 않습니다', blocks: [
        { kind: 'p', text: '문법의 목적은 Clearra 입력과 내부 구조의 유사성입니다. 이번 수정은 위치 순서·Marfung 비교 관례와 맞추는 것이지 모든 설명 문장의 통일을 주장하는 것이 아닙니다. KPCA가 정확한 참고 이름이며 KPCO는 오타입니다.' },
        { kind: 'note', text: '0.2.0 후보의 기본값은 tessembly.rfc3.order.v1입니다. 헤더 없는 단축 문자열에서 과거 버전을 알아낼 수는 없습니다. 저장된 입력의 버전을 확인하고 업그레이드 전에 명시적으로 이관하세요. 공개된 0.1.x 파일의 의미는 그대로입니다.' },
        { kind: 'p', text: '일반 파서와 바이너리 독자는 RFC2 헤더를 거부합니다. 저수준 Rust parse만 명시적인 전체 RFC2 프로필을 받아 이전 의미를 읽을 수 있습니다. 패키지·의미 프로필·wire·테스트 포트 버전은 서로 다른 계약입니다.' }
      ] },
      { id: 'commands', title: '명시적인 이관 방법', blocks: [
        { kind: 'code', text: 'tessembly migrate-rfc2 old.tsm new.tsm\ntessembly doc-migrate-rfc2 old.tsmd new.tsmd\ntessembly migrate-binary-rfc2 old.tsmb new.tsmb\ntessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc', language: 'tessembly' },
        { kind: 'code', text: 'const next = t.migrateRfc2Pattern(oldText);\nconst doc = t.migrateRfc2Document(oldDocument);\nconst bytes = t.migrateRfc2PatternBinary(oldBytes);\nconst documentBytes = t.migrateRfc2DocumentBinary(oldDocumentBytes);', language: 'tessembly' },
        { kind: 'p', text: '기존 RFC2 D(I<T)는 새 RFC3 D(T<I)가 됩니다. Before/Present·범위·상태를 보존하며 참조 문자열을 일괄 치환하거나 구조화된 관계를 다시 뒤집지 않습니다. 출력 파일은 새 파일이며 덮어쓰지 않습니다.' }
      ] },
      { id: 'wire', title: '저장 데이터와 실행 자산', blocks: [
        { kind: 'p', text: 'TSMB/TSDC는 구조 wire=1을 유지하고 의미 바이트=3을 사용합니다. RFC2 문서의 내장 패턴 헤더도 함께 이관합니다. 불투명 선택 메타데이터는 추측하지 않고 MIGRATION_REQUIRES_METADATA_HANDLER로 별도 처리를 요구합니다. Wasm ABI=2는 이전/새 JS와 Wasm의 혼용을 막습니다.' },
        { kind: 'table', headers: ['범위', 'D(I<T)'], rows: [['IT', 'true'], ['TI', 'false'], ['IOSZ', 'true'], ['TOSZ', 'false'], ['OSZJ', 'false'], ['ITIT', 'true']] },
        { kind: 'p', text: '집합 개수가 같아도 비교 방향이 반대일 수 있습니다. 독립 벡터에서 구체적인 큐와 관계를 확인하며, 기존 바이너리 fixture는 변경 전에 생성했습니다.' },
        { kind: 'link', text: '전체 이관 계약 — 영어·한국어', href: 'https://github.com/daejunnom/Tessembly/blob/main/docs/COMPARATOR_MIGRATION.md' }
      ] }
    ]
  }]
};
