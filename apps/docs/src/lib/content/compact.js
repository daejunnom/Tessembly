/** @type {import("./types").Chapter[]} */
export const compact = [
  {
    "slug": "compact",
    "title": "단축 문법",
    "kicker": "LANGUAGE / COMPACT",
    "summary": "Clearra의 큐·패턴 뒤에 대문자 D·U를 붙입니다. 조건 범위는 입력의 구조로 결정됩니다.",
    "sections": [
      {
        "id": "patterns",
        "title": "기본 공급 표현",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "표현",
              "정확한 의미"
            ],
            "rows": [
              [
                "IOTSZJL",
                "고정 공급 순서"
              ],
              [
                "P4",
                "표준 7종에서 중복 없이 4개를 쓰는 모든 순서"
              ],
              [
                "P7P4",
                "독립 순열 구간 두 개의 연결"
              ],
              [
                "[ITO]",
                "I·T·O 중 하나"
              ],
              [
                "[ITO]2",
                "해당 종류에서 중복 없이 두 개"
              ],
              [
                "[ITO]!",
                "해당 집합 전체의 순열"
              ],
              [
                "[^T]",
                "T를 제외한 표준 종류 중 하나"
              ],
              [
                "* / *!",
                "임의의 한 종류 / 표준 전체 순열"
              ],
              [
                "IOT;ITO",
                "두 대안의 합집합"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "대괄호 안의 반복 문자는 종류의 중복 표기입니다. [TTI]!는 T가 두 개인 가방이 아닙니다. 중복 개수가 필요한 경우 고급 bag 또는 shuffle 선언을 사용하세요. 대안은 이 프로필에서 같은 길이여야 합니다."
          }
        ]
      },
      {
        "id": "local",
        "title": "콜론과 중괄호",
        "blocks": [
          {
            "kind": "code",
            "text": "P7:D(I<T)P4\nP7P4:D(I<T)\n{T[^T]!}:D(I<O)P4\n{P7P4}:D(I<T)\nP7:D(I<T,T)U(T<I)",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "콜론은 바로 앞의 완전한 공급 표현에 붙습니다. 첫 줄은 P7, 둘째 줄은 P4만 검사합니다. {}는 여러 표현을 한 범위로 묶습니다. 한 콜론 뒤에 D와 U를 이어 쓸 수 있지만, 같은 범위에서 같은 블록을 두 번 쓰지는 않습니다."
          },
          {
            "kind": "note",
            "text": "{}는 가방 경계를 만들지 않습니다. P3P3는 두 독립 구간이고 P6와 다릅니다. []는 선택·순열 구문이며 {}와 서로 바꿀 수 없습니다."
          }
        ]
      },
      {
        "id": "direction",
        "title": "부등호·그룹·혼합 연쇄",
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
                "I가 T·S보다 먼저; T/S 사이의 순서는 무관"
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
            "text": "기본 비교는 지정 범위의 최초 등장 위치끼리 합니다. 그룹은 모든 교차 쌍의 AND입니다. 혼합 연쇄는 인접 그룹 사이의 비교만 추가합니다. I<IT에는 I<I가 포함되므로 참이 될 수 없습니다. 같은 종류를 두 번 적는 TT는 두 번째 T를 지정하지 않습니다."
          }
        ]
      },
      {
        "id": "presence",
        "title": "존재·부재·부분 정보",
        "blocks": [
          {
            "kind": "p",
            "text": "단독 T는 존재 조건입니다. TS는 T와 S가 모두 존재한다는 뜻이며 연속 순서·OR가 아닙니다. D(I<T)에서 선행 I는 반드시 있어야 하고 후행 T는 없을 수 있습니다. T도 필요하면 D(I<T,T)를 씁니다."
          },
          {
            "kind": "table",
            "headers": [
              "완료된 범위",
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
              ],
              [
                "TIIT",
                "false"
              ]
            ]
          },
          {
            "kind": "code",
            "text": "P4:D(T)\nP4:D(TS)\nP4:D(I<T,T)",
            "language": "tessembly"
          },
          {
            "kind": "note",
            "text": "범위 밖의 미노를 읽지 않습니다. 후행 종류의 부재는 미래 출현을 보장하지 않습니다. 아직 보이지 않는 미노는 부재가 아닙니다. 미완료 관측창이나 사용창을 완료된 공급으로 취급하지 마세요."
          }
        ]
      },
      {
        "id": "chain",
        "title": "조건 목록과 D/U",
        "blocks": [
          {
            "kind": "code",
            "text": "P7:D(I<T<S)\nP7:D(I<T,T<S)\nP7:D(I<T<S<I)\nP7:D(I<T)U(T<I)",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "쉼표는 각 완전한 조건식을 AND로 연결합니다. I<T<S는 I<T와 T<S의 AND입니다. D는 공급 순서, U는 해당 공급 출처에 속한 사용 순서를 검사합니다. 두 영역을 같은 순환 그래프로 합치지 않습니다."
          },
          {
            "kind": "p",
            "text": "순환도 구문은 유효하지만 동일 범위의 엄격한 순환은 UNSAT입니다. 모순 미발견은 NOT_CHECKED이며 PC·홀드·배치 가능성의 증명이 아닙니다. 한도 소진은 INCOMPLETE이고 정확한 빈 결과와 다릅니다."
          }
        ]
      },
      {
        "id": "counts",
        "title": "집합 크기와 구체적인 사례",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "패턴",
              "서로 다른 공급 수"
            ],
            "rows": [
              [
                "P4",
                "840"
              ],
              [
                "P4:D(T)",
                "480"
              ],
              [
                "P4:D(TS)",
                "240"
              ],
              [
                "P4:D(I<T)",
                "360"
              ],
              [
                "P4:D(I<T,T)",
                "120"
              ],
              [
                "P4:D(I<TS)",
                "272"
              ],
              [
                "P4:D(I<T>S)",
                "176"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "표준 7종의 순수 패턴 집합이며 초기 상태·PC 성공률과 무관합니다. 반대 방향도 같은 개수가 나올 수 있으므로 참·거짓 표와 구체적인 큐를 함께 검증합니다."
          }
        ]
      }
    ]
  }
];
