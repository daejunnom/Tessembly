/** @type {import("./types").Chapter[]} */
export const integration = [
  {
    "slug": "wire",
    "title": "바이너리와 버전",
    "kicker": "INTERCHANGE",
    "summary": "공급을 전수 열거하거나 원문을 다시 해석하지 않고, 문법 구조와 환경을 저장합니다.",
    "sections": [
      {
        "id": "formats",
        "title": "두 개의 명시적인 wire",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "형식",
              "용도"
            ],
            "rows": [
              [
                "TSMB / AST wire v1",
                "표준 미노 단축 패턴의 노드·D/U 조건·원문 위치"
              ],
              [
                "TSDC / document wire v1",
                "고급 환경·공급 선언·사용자 정의 ID·관계·자료 참조"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "TSMB의 헤더는 ASCII TSMB 뒤 wire=1, RFC=3입니다. TSDC는 ASCII TSDC 뒤 document-wire=1, RFC=3입니다. 바이너리 버전과 의미 프로필은 패키지 버전이나 테스트 포트 버전과 별도로 관리합니다."
          },
          {
            "kind": "p",
            "text": "P7P4는 연결된 두 순열 노드로 저장합니다. 미노를 전수 열거해서 넣지 않습니다. 저장 표현은 작게 유지하고, 소비자는 실행에 적합한 자체 메모리 구조로 변환할 수 있습니다. 파일을 C/Rust 구조체 메모리 그대로 쓰지 않습니다."
          }
        ]
      },
      {
        "id": "layout",
        "title": "문서 wire의 구조",
        "blocks": [
          {
            "kind": "p",
            "text": "TSDC는 32비트 little-endian 섹션 수와 ID·필수 플래그·길이를 사용합니다. 섹션 1은 필수 문서 본문입니다. 값은 boolean, u64, 문자열, 식별자, 목록, 호출 데이터, 내장 TSMB AST로 태그를 구분합니다. 일반 문자열을 실행하거나 파서에 다시 넘겨 의미를 복원하지 않습니다."
          },
          {
            "kind": "p",
            "text": "표준 미노는 기존 TSMB의 작은 코드와 종류 마스크를 사용합니다. 커스텀 ID는 문서의 registry와 문자열 ID로 보존합니다. 홀드의 없음·빈 슬롯·미노 보유·턴 잠금을 미노 코드 하나에 섞지 않습니다."
          },
          {
            "kind": "note",
            "text": "문서 wire의 초기 버전은 의도적으로 단순한 구조적 인코딩입니다. 모든 필드를 비트 단위로 최소 압축하는 코덱이 아니며, 최단 크기나 고속 무복사 실행을 보장하지 않습니다."
          }
        ]
      },
      {
        "id": "safety",
        "title": "손실과 잘못된 입력",
        "blocks": [
          {
            "kind": "p",
            "text": "알 수 없는 선택 섹션은 바이트 그대로 보존합니다. 알 수 없는 필수 섹션은 UNSUPPORTED_CRITICAL_EXTENSION입니다. 중복 섹션, 잘린 길이, 잘못된 태그, 초과 깊이, 후행 바이트를 거부합니다."
          },
          {
            "kind": "p",
            "text": "고급 문서에 불투명 메타데이터가 있으면 to_text/doc-decode는 이를 몰래 버리지 않고 OPAQUE_METADATA_WOULD_BE_LOST를 반환합니다. 소비자가 명시적으로 보존 전략을 선택해야 합니다. 원문 위치를 포함한 구조 왕복과 논리적으로 동등한 모든 문서를 최소화하는 것은 다른 목표입니다."
          }
        ]
      },
      {
        "id": "limits",
        "title": "기본 참조 구현의 한도",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "항목",
              "한도"
            ],
            "rows": [
              [
                "텍스트 입력",
                "65,536 bytes"
              ],
              [
                "중첩 깊이",
                "48"
              ],
              [
                "문법 노드 / 관계 항",
                "각 4,096"
              ],
              [
                "유한 공급 길이",
                "256"
              ],
              [
                "고급 바이너리",
                "1 MiB"
              ],
              [
                "선택 확장",
                "최대 64개"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "이 한도는 호스트 전체의 게임 길이를 제한한다는 뜻이 아니라, 이 버전의 한 번의 형식 처리 경계를 제한합니다. 한도를 넘은 결과를 성공한 빈 공급이나 완전한 탐색으로 반환하지 않습니다. 대규모 실행은 외부 소비자의 영역입니다."
          }
        ]
      },
      {
        "id": "filters",
        "title": "F1/F2의 구조적 필터 확장",
        "blocks": [
          {
            "kind": "p",
            "text": "기존 Present/Before는 그대로입니다. 새로운 필터는 필수 관계 tag=2와 길이가 붙은 TSFL 버전 1 payload에 저장합니다. 노드는 Present, Before, Count, All, Any, Not, In이며 선택자는 종류 ID와 1-based 차수를 보존합니다. 원문 재파싱이나 지수적인 DNF/CNF 전개를 하지 않습니다."
          },
          {
            "kind": "note",
            "text": "이 확장을 모르는 이전 독자는 거부해야 합니다. 파일 wire=1/의미=3은 유지되지만 필수 관계 기능이 늘었습니다. npm wrapper와 Wasm은 ABI=3으로 일치해야 하며 이전 ABI=2 자산의 혼용을 거부합니다."
          }
        ]
      }
    ]
  },
  {
    "slug": "integrators",
    "title": "외부 개발자 가이드",
    "kicker": "INTEGRATION & CONFORMANCE",
    "summary": "필요한 기능만 채택하고 실제 요청 경로를 시험하세요. 데이터셋과 게임 엔진은 소비자가 연결합니다.",
    "sections": [
      {
        "id": "boundary",
        "title": "가져갈 크레이트 선택",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "작업물",
              "역할"
            ],
            "rows": [
              [
                "tessembly-core",
                "AST·오류·표준 홀드 공급 상태"
              ],
              [
                "tessembly-text",
                "단축 문법 parse/format"
              ],
              [
                "tessembly-relations",
                "논리·개수·구간·등장 관계와 국소 모순 증명"
              ],
              [
                "tessembly-codec",
                "표준 패턴 AST 바이너리"
              ],
              [
                "tessembly-document",
                "고급 선언·설정·참조·문서 바이너리"
              ],
              [
                "tessembly-cli",
                "파일 처리와 참조 테스트 포트"
              ],
              [
                "tessembly-conformance",
                "외부 프로그램용 독립 적합성 테스트"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "라이브러리 사용자는 필요 없는 CLI, 문서 사이트, 적합성 도구를 함께 배포할 필요가 없습니다. TCK는 제품 파서·평가기를 import해서 기대값을 만들지 않고, 작은 독립 오라클과 고정 시험 벡터를 사용합니다."
          }
        ]
      },
      {
        "id": "tck",
        "title": "자신의 프로그램에 테스트 포트 연결",
        "blocks": [
          {
            "kind": "code",
            "text": "cargo build --locked --workspace\ntarget/debug/tessembly-tck --report report.json -- my-host test-port\ntarget/debug/tessembly-filter-tck --report filters.json -- my-host test-port",
            "language": "shell"
          },
          {
            "kind": "p",
            "text": "기본 포트는 tessembly.test-port.v1이며 요청에 id, protocol, profile, op를 넣습니다. capabilities, compile, enumerate_D, evaluate_U_witness, encode/decode, hold_step, check_adapter, resolve_config를 다룹니다. stdout은 JSON Lines 응답 전용이고 로그는 stderr를 사용합니다."
          },
          {
            "kind": "code",
            "text": "{\"id\":1,\"protocol\":\"tessembly.test-port.v1\",\"profile\":\"tessembly.rfc3.order.v1\",\"op\":\"compile\",\"text\":\"P4:D(I<T&T)\"}",
            "language": "json"
          },
          {
            "kind": "p",
            "text": "고급 문서는 별도 tessembly.document-test-port.v1과 참조 CLI doc-port를 사용합니다. validate, roundtrip, project, decode, hold, resolve를 지원합니다. project는 표준 AST를 투영할 뿐 환경을 실행하지 않습니다. 반환된 문서 환경을 잃지 않고 함께 전달하세요."
          },
          {
            "kind": "note",
            "text": "테스트 러너는 신뢰한 개발용 실행 파일을 구동하는 도구이며 샌드박스가 아닙니다. 통과 보고서는 해당 버전과 시험 범위에 대한 증거입니다. 외부 앱이나 데이터셋을 자동 인증하는 기능이 아닙니다."
          }
        ]
      },
      {
        "id": "e2e",
        "title": "실제 연결 검증",
        "blocks": [
          {
            "kind": "p",
            "text": "테스트 포트는 실제 입력 → 요청 컴파일 → 실행 경계 → 결과 경로에 연결해야 합니다. 테스트용 별도 파서만 호출해서 통과하면 앱 본체의 연결을 검증하지 못합니다. GUI 입력·버튼·결과의 E2E 어댑터는 외부 개발자가 작성합니다."
          },
          {
            "kind": "p",
            "text": "D/U 변경, 지역 범위 변경, NONE/EMPTY/점유 홀드 전환이 실제 출력에 반영되는지 검사하세요. 숨은 공급만 바꾸었을 때 현재 관측이 같으면 미래를 미리 읽어 결정을 달리해서는 안 됩니다. 합법적인 공개가 이루어진 뒤에는 분기할 수 있습니다."
          }
        ]
      },
      {
        "id": "results",
        "title": "결과 계약",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "상태",
              "의미"
            ],
            "rows": [
              [
                "INVALID_SYNTAX / INVALID_DOCUMENT",
                "구문·구조 위반"
              ],
              [
                "CONFIG_CONFLICT",
                "환경의 명시적 충돌"
              ],
              [
                "UNSAT",
                "명시한 영역에서 만족 불가능한 증거"
              ],
              [
                "NOT_CHECKED",
                "아직 충분히 검사하지 않음"
              ],
              [
                "UNSUPPORTED / UNSUPPORTED_STATE",
                "기능 또는 상태 범위 밖"
              ],
              [
                "INCOMPLETE",
                "한도·취소 등으로 미완료"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "관계 만족, 공급 합법성, 홀드 전이, 실제 배치 성공은 다른 주장입니다. complete=true인 정확한 0개와 미완료 결과를 구분하세요. 사용 조건만 검사한 결과를 PC 해법이라고 표시하지 않습니다."
          }
        ]
      },
      {
        "id": "datasets",
        "title": "호스트가 공급을 감싸는 방식",
        "blocks": [
          {
            "kind": "p",
            "text": "외부 프로그램이 파일·DB에서 공급을 가져와 Tessembly에 전달합니다. 조회·캐시·셋업·성공률·정책 인덱스는 호스트가 관리합니다. Tessembly는 제공받은 공급과 관계의 의미만 처리하고 Q1/M1/MATCH를 새로 제공하지 않습니다."
          },
          {
            "kind": "p",
            "text": "필수 조건을 지원하지 못하면 UNSUPPORTED를 반환하세요. 그 조건을 삭제하거나 큰 공급집합으로 바꾸면 동등 변환이 아닙니다. 공급 입력·홀드·공개 정보의 대응 시험은 실제 어댑터 경로에 연결해야 합니다."
          }
        ]
      }
    ]
  }
];
