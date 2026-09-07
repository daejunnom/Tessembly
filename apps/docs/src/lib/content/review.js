/** @type {Record<string,import('./types').Chapter[]>} */
export const reviewChapters={
  "en": [
    {
      "slug": "migration",
      "title": "RFC3 migration",
      "kicker": "PROFILE / REVIEW",
      "summary": "Implemented comparator alignment: less-than means earlier. Legacy RFC2 meaning is never silently reassigned.",
      "sections": [
        {
          "id": "meaning",
          "title": "The corrected direction",
          "blocks": [
            {
              "kind": "table",
              "headers": [
                "RFC3",
                "Meaning"
              ],
              "rows": [
                [
                  "A<B",
                  "A precedes B"
                ],
                [
                  "A>B",
                  "B precedes A"
                ],
                [
                  "I<TS",
                  "I precedes T and S; no T/S order"
                ],
                [
                  "I<T>S",
                  "I and S precede T"
                ],
                [
                  "T>IS",
                  "Equivalent to I<T>S"
                ]
              ]
            },
            {
              "kind": "code",
              "text": "P4:D(I<T)\nP4:D(I<TS)\nP4:D(I<T>S)\nP4:D(T>IS)\nP4:D(I<T,T)",
              "language": "tessembly"
            },
            {
              "kind": "p",
              "text": "First occurrence is local to the attached closed scope. The earlier kind must exist; a missing later kind is allowed. Neither present means false. Bare T requires presence. D and U remain separate; braces are not bags. Hidden future pieces are not absent."
            }
          ]
        },
        {
          "id": "legacy",
          "title": "Do not guess the version",
          "blocks": [
            {
              "kind": "p",
              "text": "Tessembly follows Clearra inputs and internal structure. This correction aligns the comparator with positional order and Marfung, not every prose convention. KPCA is the correct reference name; KPCO was a typo."
            },
            {
              "kind": "note",
              "text": "The 0.2.0 candidate defaults to tessembly.rfc3.order.v1. An unlabelled compact string cannot identify its historical profile. Inventory and explicitly migrate old snippets before upgrading. Published 0.1.x artifacts keep their original semantics."
            },
            {
              "kind": "p",
              "text": "Normal parsers and binary readers reject explicit RFC2 headers. Rust low-level parse can accept the full RFC2 profile only when explicitly supplied. Package, semantic profile, wire and test protocol versions are different contracts."
            }
          ]
        },
        {
          "id": "commands",
          "title": "Explicit migration",
          "blocks": [
            {
              "kind": "code",
              "text": "tessembly migrate-rfc2 old.tsm new.tsm\ntessembly doc-migrate-rfc2 old.tsmd new.tsmd\ntessembly migrate-binary-rfc2 old.tsmb new.tsmb\ntessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc",
              "language": "tessembly"
            },
            {
              "kind": "code",
              "text": "const next = t.migrateRfc2Pattern(oldText);\nconst doc = t.migrateRfc2Document(oldDocument);\nconst bytes = t.migrateRfc2PatternBinary(oldBytes);\nconst documentBytes = t.migrateRfc2DocumentBinary(oldDocumentBytes);",
              "language": "tessembly"
            },
            {
              "kind": "p",
              "text": "RFC2 D(I<T) becomes RFC3 D(T<I). Migration preserves Before/Present, scopes and state. It does not rewrite arbitrary reference strings or reverse already-structured edges. Output files are new files, never overwrites."
            }
          ]
        },
        {
          "id": "wire",
          "title": "Stored data and executable assets",
          "blocks": [
            {
              "kind": "p",
              "text": "TSMB/TSDC keep structural wire 1 but use semantic byte 3. An RFC2 document must migrate its nested pattern headers as well. Opaque optional metadata requires a separate handler: MIGRATION_REQUIRES_METADATA_HANDLER, not a guessed interpretation. Wasm ABI 2 prevents mixing old/new JavaScript and Wasm."
            },
            {
              "kind": "table",
              "headers": [
                "Scope",
                "D(I<T)"
              ],
              "rows": [
                [
                  "IT",
                  "true"
                ],
                [
                  "TI",
                  "false"
                ],
                [
                  "IOSZ",
                  "true"
                ],
                [
                  "TOSZ",
                  "false"
                ],
                [
                  "OSZJ",
                  "false"
                ],
                [
                  "ITIT",
                  "true"
                ]
              ]
            },
            {
              "kind": "p",
              "text": "Equal set sizes can hide reversed comparisons. Independent vectors check concrete queues and relationships, and legacy binary fixtures were generated before this change."
            },
            {
              "kind": "link",
              "text": "Complete migration contract (English / Korean)",
              "href": "https://github.com/daejunnom/Tessembly/blob/main/docs/COMPARATOR_MIGRATION.md"
            }
          ]
        }
      ]
    },
    {
      "slug": "review-plan",
      "title": "GO/NO-GO review plan",
      "kicker": "PROFILE / REVIEW",
      "summary": "Design only. Logical filters and richer QB/OQB declarations require owner approval; this page does not enable them.",
      "sections": [
        {
          "id": "gate",
          "title": "Approval boundary",
          "blocks": [
            {
              "kind": "note",
              "text": "AWAITING OWNER GO/NO-GO. Only comparator alignment and explicit migration are implemented in this change. Existing basic reference/select declarations remain unchanged."
            },
            {
              "kind": "table",
              "headers": [
                "Unit",
                "Proposal",
                "State"
              ],
              "rows": [
                [
                  "F1",
                  "Boolean AST and per-kind counts",
                  "Awaiting GO"
                ],
                [
                  "F2",
                  "Subwindows and occurrence selectors",
                  "Separate GO after F1"
                ],
                [
                  "Q1",
                  "Observation/decision/goal/common-prefix references",
                  "Awaiting GO"
                ],
                [
                  "M1",
                  "Versioned external evidence and result units",
                  "Optional; awaiting GO"
                ],
                [
                  "R1",
                  "Arbitrary regex / expression execution",
                  "Recommend NO-GO"
                ]
              ]
            },
            {
              "kind": "link",
              "text": "Full English review plan",
              "href": "https://github.com/daejunnom/Tessembly/blob/main/docs/plans/FILTERS_QB_OQB.en.md"
            }
          ]
        },
        {
          "id": "filters",
          "title": "F1: proposed logical filters",
          "blocks": [
            {
              "kind": "code",
              "text": "P7:D(I<T | S<Z)\nP7:D(!(I<T))\nP4:D(T=1)\nP4:D(T=0)\nP7:D((I<T | S<Z), T)",
              "language": "tessembly"
            },
            {
              "kind": "p",
              "text": "These examples are proposals and are NOT supported by the current parser. Comma AND, | OR, ! NOT and parentheses are proposed. Precedence is atom, NOT, AND, OR. Counts initially use one kind per atom; source []/!/; keep their old meanings."
            },
            {
              "kind": "p",
              "text": "NOT(I<T) is not T<I when both kinds are absent. Evaluate complete supplies separately from partial knowledge. An impossible OR branch does not kill survivors; do not add negated edges to a positive cycle graph. Preserve ASTs instead of exponential DNF/CNF expansion."
            }
          ]
        },
        {
          "id": "selectors",
          "title": "F2: scope and occurrence",
          "blocks": [
            {
              "kind": "p",
              "text": "Propose explicit zero-based end-exclusive subwindows, never physical bag inference or silent clipping. Keep bare I<T as first occurrence. A future Occurrence(kind,n,scope) would be explicit; do not change TT<I into an occurrence selector. Supply occurrence and a held token origin are different concepts."
            },
            {
              "kind": "p",
              "text": "External Marfung adapters must preserve cumulative scopes, multiplicity, OR and window endpoints. Unsupported regex or occurrence features must be rejected, not dropped. Adapter implementation belongs to consumers."
            }
          ]
        },
        {
          "id": "decisions",
          "title": "Q1: data, not a policy engine",
          "blocks": [
            {
              "kind": "table",
              "headers": [
                "Axis",
                "Proposed data"
              ],
              "rows": [
                [
                  "Choice",
                  "Setup variant, finishing branch or retained inventory"
                ],
                [
                  "Time",
                  "Anchor, lock count and spawn/reveal phase"
                ],
                [
                  "Information",
                  "Active/hold/preview, history and public inference"
                ],
                [
                  "Progress",
                  "External common-prefix reference"
                ],
                [
                  "Goal",
                  "Current PC, saved inventory or long-term value"
                ]
              ]
            },
            {
              "kind": "p",
              "text": "QB commits a declared choice at a declared start observation. OQB permits later refinement after shared progress. Do not hardcode one or two locks. Observation conditions never filter or regenerate the actual supply. Extra decision times never undo earlier actions."
            },
            {
              "kind": "p",
              "text": "Preserve correlated {SZ,ZS} knowledge, NONE/EMPTY/OCCUPIED, hold locks and origins. Sorted active/hold pairs are optional host-proven projections. Legal common progress, policy nonanticipation, optimality and universal success remain host checks."
            }
          ]
        },
        {
          "id": "evidence",
          "title": "M1: external evidence contract",
          "blocks": [
            {
              "kind": "p",
              "text": "Propose provider/revision, graph ID, state-index ID, rule/view/hold assumptions, metric units, action encoding and coverage. Expected future PC count is not current-PC success probability. A recorded recommendation is not all possible actions."
            },
            {
              "kind": "p",
              "text": "Separate unsupported state, missing entry, recorded no-action, revision mismatch and true contradictory input. A bag mask must identify the cursor it follows. No downloading, database lookup, cache, solver, replay or new Clearra feature is part of this proposal."
            }
          ]
        },
        {
          "id": "acceptance",
          "title": "After an explicit GO",
          "blocks": [
            {
              "kind": "p",
              "text": "Keep zero npm dependencies and bounded AST depth, predicates, windows, output and CPU work. Optional external developer TCK vectors must compare exact small sets independently and cover missing pieces, NOT, OR branches, scopes, hold locks and unsupported versions. The TCK is not an internal runtime or a certification service."
            },
            {
              "kind": "note",
              "text": "Owner decision: F1 ___ / F2 ___ / Q1 ___ / M1 ___ . All are unapproved. GO can be granted per unit; documentation publication is not approval."
            }
          ]
        }
      ]
    }
  ],
  "ko": [
    {
      "slug": "migration",
      "title": "RFC3 이관",
      "kicker": "PROFILE / REVIEW",
      "summary": "구현된 부등호 정렬: <는 선행입니다. 기존 RFC2의 의미를 조용히 바꾸지 않습니다.",
      "sections": [
        {
          "id": "meaning",
          "title": "수정된 비교 방향",
          "blocks": [
            {
              "kind": "table",
              "headers": [
                "RFC3",
                "의미"
              ],
              "rows": [
                [
                  "A<B",
                  "A가 B보다 먼저"
                ],
                [
                  "A>B",
                  "B가 A보다 먼저"
                ],
                [
                  "I<TS",
                  "I가 T·S보다 먼저, T·S 간 순서는 무관"
                ],
                [
                  "I<T>S",
                  "I·S가 T보다 먼저"
                ],
                [
                  "T>IS",
                  "I<T>S와 동등"
                ]
              ]
            },
            {
              "kind": "code",
              "text": "P4:D(I<T)\nP4:D(I<TS)\nP4:D(I<T>S)\nP4:D(T>IS)\nP4:D(I<T,T)",
              "language": "tessembly"
            },
            {
              "kind": "p",
              "text": "조건이 붙은 완료된 범위의 최초 등장끼리 비교합니다. 선행 종류는 있어야 하고 후행 종류의 부재는 허용합니다. 둘 다 없으면 거짓입니다. 단독 T는 존재 조건이며 D/U는 별개입니다. 중괄호는 가방이 아니고 미관측 미래는 부재가 아닙니다."
            }
          ]
        },
        {
          "id": "legacy",
          "title": "버전을 추측하지 않습니다",
          "blocks": [
            {
              "kind": "p",
              "text": "문법의 목적은 Clearra 입력과 내부 구조의 유사성입니다. 이번 수정은 위치 순서·Marfung 비교 관례와 맞추는 것이지 모든 설명 문장의 통일을 주장하는 것이 아닙니다. KPCA가 정확한 참고 이름이며 KPCO는 오타입니다."
            },
            {
              "kind": "note",
              "text": "0.2.0 후보의 기본값은 tessembly.rfc3.order.v1입니다. 헤더 없는 단축 문자열에서 과거 버전을 알아낼 수는 없습니다. 저장된 입력의 버전을 확인하고 업그레이드 전에 명시적으로 이관하세요. 공개된 0.1.x 파일의 의미는 그대로입니다."
            },
            {
              "kind": "p",
              "text": "일반 파서와 바이너리 독자는 RFC2 헤더를 거부합니다. 저수준 Rust parse만 명시적인 전체 RFC2 프로필을 받아 이전 의미를 읽을 수 있습니다. 패키지·의미 프로필·wire·테스트 포트 버전은 서로 다른 계약입니다."
            }
          ]
        },
        {
          "id": "commands",
          "title": "명시적인 이관 방법",
          "blocks": [
            {
              "kind": "code",
              "text": "tessembly migrate-rfc2 old.tsm new.tsm\ntessembly doc-migrate-rfc2 old.tsmd new.tsmd\ntessembly migrate-binary-rfc2 old.tsmb new.tsmb\ntessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc",
              "language": "tessembly"
            },
            {
              "kind": "code",
              "text": "const next = t.migrateRfc2Pattern(oldText);\nconst doc = t.migrateRfc2Document(oldDocument);\nconst bytes = t.migrateRfc2PatternBinary(oldBytes);\nconst documentBytes = t.migrateRfc2DocumentBinary(oldDocumentBytes);",
              "language": "tessembly"
            },
            {
              "kind": "p",
              "text": "기존 RFC2 D(I<T)는 새 RFC3 D(T<I)가 됩니다. Before/Present·범위·상태를 보존하며 참조 문자열을 일괄 치환하거나 구조화된 관계를 다시 뒤집지 않습니다. 출력 파일은 새 파일이며 덮어쓰지 않습니다."
            }
          ]
        },
        {
          "id": "wire",
          "title": "저장 데이터와 실행 자산",
          "blocks": [
            {
              "kind": "p",
              "text": "TSMB/TSDC는 구조 wire=1을 유지하고 의미 바이트=3을 사용합니다. RFC2 문서의 내장 패턴 헤더도 함께 이관합니다. 불투명 선택 메타데이터는 추측하지 않고 MIGRATION_REQUIRES_METADATA_HANDLER로 별도 처리를 요구합니다. Wasm ABI=2는 이전/새 JS와 Wasm의 혼용을 막습니다."
            },
            {
              "kind": "table",
              "headers": [
                "범위",
                "D(I<T)"
              ],
              "rows": [
                [
                  "IT",
                  "true"
                ],
                [
                  "TI",
                  "false"
                ],
                [
                  "IOSZ",
                  "true"
                ],
                [
                  "TOSZ",
                  "false"
                ],
                [
                  "OSZJ",
                  "false"
                ],
                [
                  "ITIT",
                  "true"
                ]
              ]
            },
            {
              "kind": "p",
              "text": "집합 개수가 같아도 비교 방향이 반대일 수 있습니다. 독립 벡터에서 구체적인 큐와 관계를 확인하며, 기존 바이너리 fixture는 변경 전에 생성했습니다."
            },
            {
              "kind": "link",
              "text": "전체 이관 계약 — 영어·한국어",
              "href": "https://github.com/daejunnom/Tessembly/blob/main/docs/COMPARATOR_MIGRATION.md"
            }
          ]
        }
      ]
    },
    {
      "slug": "review-plan",
      "title": "GO/NO-GO 검토 계획",
      "kicker": "PROFILE / REVIEW",
      "summary": "설계 전용입니다. 논리 필터·QB/OQB 선언 확장은 소유자 승인 후 구현하며, 이 페이지가 기능을 활성화하지 않습니다.",
      "sections": [
        {
          "id": "gate",
          "title": "승인 경계",
          "blocks": [
            {
              "kind": "note",
              "text": "AWAITING OWNER GO/NO-GO. 이번에는 부등호 정렬과 명시적 이관만 구현했습니다. 기존 기본 reference/select 선언은 그대로입니다."
            },
            {
              "kind": "table",
              "headers": [
                "단위",
                "제안",
                "상태"
              ],
              "rows": [
                [
                  "F1",
                  "논리 AST와 종류별 개수",
                  "GO 대기"
                ],
                [
                  "F2",
                  "부분 범위와 등장 차수",
                  "F1 이후 별도 GO"
                ],
                [
                  "Q1",
                  "관측·결정·목표·공통 진행 참조",
                  "GO 대기"
                ],
                [
                  "M1",
                  "외부 근거의 버전과 결과 단위",
                  "선택적 기능, GO 대기"
                ],
                [
                  "R1",
                  "임의 정규식·표현식 실행",
                  "NO-GO 권고"
                ]
              ]
            },
            {
              "kind": "link",
              "text": "한국어 전체 검토 계획",
              "href": "https://github.com/daejunnom/Tessembly/blob/main/docs/plans/FILTERS_QB_OQB.ko.md"
            }
          ]
        },
        {
          "id": "filters",
          "title": "F1: 제안하는 논리 필터",
          "blocks": [
            {
              "kind": "code",
              "text": "P7:D(I<T | S<Z)\nP7:D(!(I<T))\nP4:D(T=1)\nP4:D(T=0)\nP7:D((I<T | S<Z), T)",
              "language": "tessembly"
            },
            {
              "kind": "p",
              "text": "위 예시는 계획이며 현재 파서가 지원하지 않습니다. 쉼표 AND, | OR, ! NOT, 괄호를 제안합니다. 우선순위는 원자→NOT→AND→OR입니다. 개수는 처음에는 종류 하나씩 비교하고 공급 본문의 []/!/; 의미는 유지합니다."
            },
            {
              "kind": "p",
              "text": "두 종류가 모두 없을 때 NOT(I<T)와 T<I는 다릅니다. 완성된 공급과 관측 지식을 분리하고, 불가능한 OR 가지가 나머지를 제거하지 않게 합니다. 부정 조건을 긍정 순환 그래프에 합치지 않고 지수적으로 DNF/CNF를 전개하지 않습니다."
            }
          ]
        },
        {
          "id": "selectors",
          "title": "F2: 범위와 발생 선택",
          "blocks": [
            {
              "kind": "p",
              "text": "0-based 끝 제외의 하위 범위를 명시적으로 제안하며 가방 경계를 추측하거나 구간을 조용히 자르지 않습니다. 기본 I<T는 최초 등장입니다. 향후 Occurrence(kind,n,scope)는 명시적으로 쓰며 TT<I의 기존 의미를 바꾸지 않습니다. 공급 발생 차수와 홀드의 개체 출처는 별개입니다."
            },
            {
              "kind": "p",
              "text": "외부 Marfung 어댑터는 누적 필터 범위·중복 개수·OR·구간 끝점을 보존해야 합니다. 정규식이나 발생 차수를 지원하지 못하면 삭제하지 않고 거부합니다. 어댑터 구현은 소비자의 책임입니다."
            }
          ]
        },
        {
          "id": "decisions",
          "title": "Q1: 정책 실행기가 아닌 선언",
          "blocks": [
            {
              "kind": "table",
              "headers": [
                "축",
                "제안하는 정보"
              ],
              "rows": [
                [
                  "선택",
                  "셋업 변형·마무리 분기·남길 재고"
                ],
                [
                  "시점",
                  "기준점·lock 수·스폰/공개 전후"
                ],
                [
                  "정보",
                  "현재/홀드/넥스트·이력·공개 규칙 추론"
                ],
                [
                  "진행",
                  "외부 공통 진행 자료 참조"
                ],
                [
                  "목표",
                  "현재 PC·세이브 재고·장기 가치"
                ]
              ]
            },
            {
              "kind": "p",
              "text": "QB는 시작 관측으로 지정 선택을 확정하고, OQB는 공통 진행 후 추가 정보로 구체화합니다. 1~2개 배치로 고정하지 않습니다. 관측 조건은 실제 공급을 필터링하거나 재생성하지 않고 추가 결정 시점이 앞선 배치를 취소하지 않습니다."
            },
            {
              "kind": "p",
              "text": "연결된 SZ/ZS 지식, NONE/EMPTY/OCCUPIED, 홀드 잠금·출처를 보존합니다. 현재/홀드를 정렬한 쌍은 외부 엔진이 동등성을 보장할 때만 사용하는 투영입니다. 공통 진행의 합법성·정책의 비예견성·최적성·전 경우 성공은 호스트의 검사입니다."
            }
          ]
        },
        {
          "id": "evidence",
          "title": "M1: 외부 근거의 의미 계약",
          "blocks": [
            {
              "kind": "p",
              "text": "제공자/리비전·그래프 ID·상태 인덱스·가방/관측/홀드 전제·결과 단위·행동 인코딩·포함 범위를 제안합니다. 장기 기대 PC 수는 이번 PC 성공 확률이 아니며, 추천 행동 하나는 가능한 모든 행동 목록이 아닙니다."
            },
            {
              "kind": "p",
              "text": "상태 미지원·자료 없음·기록된 무행동·리비전 불일치·조건 모순을 구별합니다. 가방 마스크는 어느 커서 뒤인지 명시합니다. 다운로드·DB 조회·캐시·탐색기·리플레이·Clearra 새 기능은 이번 제안에 포함하지 않습니다."
            }
          ]
        },
        {
          "id": "acceptance",
          "title": "명시적인 GO 이후",
          "blocks": [
            {
              "kind": "p",
              "text": "npm 의존성 0개와 AST 깊이·조건·범위·출력·CPU 예산을 유지합니다. 외부 개발자용 선택적 TCK는 작은 정확한 집합을 독립적으로 비교하고 부재·NOT·OR 분기·범위·홀드 잠금·미지원 버전을 검사합니다. TCK는 내부 제품 런타임이나 인증 서비스가 아닙니다."
            },
            {
              "kind": "note",
              "text": "소유자 결정: F1 ___ / F2 ___ / Q1 ___ / M1 ___ . 현재 모두 미승인입니다. 단위별로 승인할 수 있으며 문서 공개는 구현 승인이 아닙니다."
            }
          ]
        }
      ]
    }
  ]
};
