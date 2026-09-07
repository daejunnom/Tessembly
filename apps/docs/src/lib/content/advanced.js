/** @type {import("./types").Chapter[]} */
export const advanced = [
  {
    "slug": "advanced",
    "title": "고급 선언 문법",
    "kicker": "LANGUAGE / DOCUMENT V1",
    "summary": "함수형 선언으로 공급·환경·F1/F2 조건을 보존합니다. 고급 표기는 단축 문법과 같은 관계 모델을 사용합니다.",
    "sections": [
      {
        "id": "structure",
        "title": "문서의 기본 구조",
        "blocks": [
          {
            "kind": "code",
            "text": "tessembly \"tessembly.rfc3.order.v1\";\nconfig {\n    rule = seven_bag();\n    start = boundary();\n    see = view(next=5);\n    hold = slot(initial=empty);\n}\nsupply(\"P7\");\ndraw(IN(1,3,T)&I<T,T);\nuse(I<T|!T);",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "config, supply, draw, use는 각각 한 번만 선언합니다. 같은 설정 키나 함수의 같은 명명 인수를 두 번 쓰면 값이 같아도 거부합니다. 선언 순서로 전역 환경을 덮어쓰지 않습니다. reference와 select는 서로 다른 식별자를 사용해 여러 개 선언할 수 있습니다."
          },
          {
            "kind": "p",
            "text": "문장 끝은 세미콜론입니다. // 주석, UTF-8 문자열, true/false, 부호 없는 정수, 목록, 위치 인수와 명명 인수를 지원합니다. 명명 인수를 쓴 뒤 위치 인수를 다시 쓰지 않습니다. 임의 스크립트, 반복문, 함수 실행, 네트워크 호출은 지원하지 않습니다."
          }
        ]
      },
      {
        "id": "sources",
        "title": "공급 함수",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "함수",
              "표현하는 데이터"
            ],
            "rows": [
              [
                "pattern(\"P4\") 또는 \"P4\"",
                "기존 단축 공급 AST"
              ],
              [
                "queue(\"IOT\")",
                "정확한 유한 공급"
              ],
              [
                "shuffle(\"TTI\")",
                "다중집합의 서로 다른 순열"
              ],
              [
                "bag(\"IOTSZJL\")",
                "소진 후 같은 구성을 보충하는 가방 스트림"
              ],
              [
                "pool(\"IT\")",
                "매번 복원 추출하는 스트림"
              ],
              [
                "take(10, bag(\"IOTSZJL\"))",
                "앞 10개의 유한 범위"
              ],
              [
                "repeat(3, shuffle(\"SZ\"))",
                "유한 공급 표현을 독립적으로 3회 반복"
              ],
              [
                "concat(queue(\"IT\"), shuffle(\"SZ\"))",
                "공급 연결"
              ],
              [
                "either(queue(\"IT\"), queue(\"TI\"))",
                "동일 길이 대안"
              ],
              [
                "external(\"vendor.rule\", revision=\"v1\", length=10)",
                "버전이 고정된 외부 정책 참조"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "take는 유한 공급보다 큰 개수를 요구할 수 없습니다. repeat의 대상은 유한해야 합니다. 끝나지 않는 스트림 뒤에 다른 공급을 연결하면 거부합니다. 파서는 이런 길이 계약을 검사하지만 순열 전체를 펼치거나 실제 미노를 뽑지는 않습니다."
          },
          {
            "kind": "p",
            "text": "문자열 묶음은 표준 일곱 종류에 사용합니다. 다중 문자 사용자 정의 ID는 목록으로 표현합니다. 기본 관계 도구로 변환할 수 없는 커스텀 공급은 SOURCE_REQUIRES_HOST로 남고 임의의 표준 큐로 대체하지 않습니다."
          }
        ]
      },
      {
        "id": "relations",
        "title": "동일한 논리식과 명시적 함수",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "단축 조건",
              "고급 표기"
            ],
            "rows": [
              [
                "T",
                "present(\"T\")"
              ],
              [
                "I<T",
                "before(\"I\",\"T\")"
              ],
              [
                "T[2]",
                "present(nth(\"T\",2))"
              ],
              [
                "I[2]<T",
                "before(nth(\"I\",2),\"T\")"
              ],
              [
                "T=2",
                "count(\"T\",\"=\",2)"
              ],
              [
                "I&T / I|T",
                "all(present(\"I\"),present(\"T\")) / any(present(\"I\"),present(\"T\"))"
              ],
              [
                "!T",
                "not(present(\"T\"))"
              ],
              [
                "IN(1,3,T)",
                "within(1,3,present(\"T\"))"
              ]
            ]
          },
          {
            "kind": "code",
            "text": "tessembly \"tessembly.rfc3.order.v1\";\nconfig { registry=[\"PENTO_P\"]; rule=from_source; }\nsupply(take(8, bag([\"I\",\"PENTO_P\",\"PENTO_P\"])));\ndraw(all(count(\"PENTO_P\",\">=\",2),before(nth(\"PENTO_P\",2),\"I\")));",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "draw/use는 표준 종류의 논리식을 직접 받거나 위 함수형 표기를 받습니다. 출력기는 all/any/not/count/within/nth/before/present를 명시적으로 출력합니다. before(A,B)는 언제나 A 선행입니다. 함수 인수 수·종류·등록된 ID를 검사하며 함수를 실행하지 않습니다."
          },
          {
            "kind": "note",
            "text": "사용자 정의 ID는 registry에 등록하고 문자열로 적습니다. 이 예시는 커스텀 가방이며 표준 7-bag가 아닙니다. 공급 관련 함수의 숫자·문자열 안에 있는 기호를 부등호 이관으로 치환하지 않습니다."
          }
        ]
      },
      {
        "id": "environment",
        "title": "환경의 단일 권한",
        "blocks": [
          {
            "kind": "p",
            "text": "설정 없는 문서 조각을 읽고 쓰는 것은 가능합니다. 실제 실행 요청에서는 rule, start, see, hold를 호스트와 결합해 하나로 확정해야 합니다. with_host_config는 없는 키만 채우고, 이미 존재하는 키의 값이 다르면 CONFIG_CONFLICT를 반환합니다. 자동으로 마지막 값을 선택하지 않습니다."
          },
          {
            "kind": "p",
            "text": "rule=seven_bag()의 균등 정책은 변경 불가입니다. from_source는 공급 선언 자체가 정책을 설명한다는 뜻입니다. 커스텀 실행기의 설정은 external(\"id\",revision=\"...\")로 명시할 수 있습니다. 그 ID를 보고 코드를 자동 로드하지 않습니다."
          }
        ]
      },
      {
        "id": "references",
        "title": "기존 참조 선언의 호환성 경계",
        "blocks": [
          {
            "kind": "note",
            "text": "기본 reference/select 레코드는 기존 파일의 호환성을 위해 읽고 보존합니다. 새 공급 입력에는 필요하지 않습니다. Q1·M1·MATCH나 QB/OQB 전용 탐색 문법은 추가하지 않았으며 권장 공급 문법에 포함하지 않습니다."
          },
          {
            "kind": "p",
            "text": "reference는 고유 ID와 format/value, 선택적인 page/revision을 저장합니다. select는 기존 reference ID 목록과 오름차순 at 값을 저장합니다. 이를 읽는다는 사실은 자료 조회·셋업 선택·정책 탐색 지원을 뜻하지 않습니다. 셋업·평가값·데이터셋 로직은 소비자 문서가 Tessembly 공급을 감싸는 방식으로 관리하세요."
          }
        ]
      }
    ]
  }
];
