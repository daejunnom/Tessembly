/** @type {import("./types").Chapter[]} */
export const filters = [
  {
    "slug": "filters",
    "title": "논리 필터·구간·등장 차수",
    "kicker": "IMPLEMENTED / F1 + F2",
    "summary": "0.3.x에 구현된 &, |, !, 개수 비교, IN과 미노[n]의 정확한 의미와 오류를 설명합니다.",
    "sections": [
      {
        "id": "logic",
        "title": "논리 연산은 비트 연산이 아닙니다",
        "blocks": [
          {
            "kind": "code",
            "text": "P4:D(I<T&T)\nP4:D(I<T|S<Z)\nP4:D(!T)\nP4:D(!(I<T))\nP4:D((I<T|S<Z)&T)",
            "language": "tessembly"
          },
          {
            "kind": "table",
            "headers": [
              "기호",
              "의미"
            ],
            "rows": [
              [
                "&",
                "논리 AND; C의 && 의미"
              ],
              [
                "|",
                "논리 OR; C의 || 의미"
              ],
              [
                "!",
                "논리 NOT; !T는 T 부재"
              ],
              [
                "()",
                "조건식 묶음"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "우선순위는 괄호·조건 원자, NOT, AND, OR입니다. 구문·지원 기능·모든 구간을 먼저 검사하고 유효한 조건만 왼쪽부터 단락 평가합니다. T|IN(1,5,I)는 P4에서 T가 있어도 범위 오류입니다."
          },
          {
            "kind": "note",
            "text": "!(I<T)는 T<I와 다릅니다. 둘 다 없는 범위에서는 전자만 참입니다. !I<T는 추측해서 고치지 않고 거부합니다. 논리 연산이 C와 유사해도 미노 그룹·연쇄 비교와 쉼표 목록은 Tessembly의 계약입니다."
          }
        ]
      },
      {
        "id": "precedence",
        "title": "쉼표·괄호·연쇄의 구분",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "입력",
              "동등한 입력"
            ],
            "rows": [
              [
                "D(I|T&S)",
                "D(I|(T&S))"
              ],
              [
                "D(I|T,S)",
                "D((I|T)&S)"
              ],
              [
                "D(I<T<S)",
                "D(I<T&T<S)"
              ],
              [
                "D(I<T>S)",
                "D(T>IS)"
              ]
            ]
          },
          {
            "kind": "code",
            "text": "P4:D(I|T&S)\nP4:D(I|T,S)\nP4:D((I|T)&S)",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "쉼표는 최상위 조건 목록 구분자입니다. 괄호로 묶는 Boolean 그룹 안에서는 &와 |를 쓰세요. IN·고급 함수의 쉼표는 그 함수의 인수 구분입니다. 의미가 다른 쉼표를 문자열 치환으로 합치지 않습니다."
          }
        ]
      },
      {
        "id": "count",
        "title": "종류별 개수와 단독 미노",
        "blocks": [
          {
            "kind": "code",
            "text": "P4:D(T=1&S=0)\nP4:D(T!=0)\nP4:D(T<=0)\nP4:D(T>=1)",
            "language": "tessembly"
          },
          {
            "kind": "table",
            "headers": [
              "형식",
              "의미"
            ],
            "rows": [
              [
                "T",
                "T가 한 번 이상"
              ],
              [
                "T=1",
                "정확히 한 번"
              ],
              [
                "T=0 / !T",
                "T 없음"
              ],
              [
                "T!=1",
                "정확히 한 번이 아님"
              ],
              [
                "T<2 / T<=2 / T>2 / T>=2",
                "해당 종류 개수의 비교"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "=는 대입이 아닌 개수 일치입니다. 숫자는 0~256의 정수이며 하나의 종류에만 적용합니다. TS=1은 그룹 합계가 아니므로 거부합니다. T[2]=1도 개수가 아닌 선택자이므로 거부합니다. 표준 7-bag 하나에서는 같은 종류가 한 번뿐이지만 여러 가방·커스텀 다중집합에는 개수 조건이 유용합니다."
          }
        ]
      },
      {
        "id": "window",
        "title": "IN: 공급을 유지한 채 일부 위치 검사",
        "blocks": [
          {
            "kind": "code",
            "text": "P7:D(IN(1,3,T))\nP7:D(IN(2,5,I<T&T))\nP7:D(IN(1,3,T)&IN(4,7,I))",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "IN(start,end,condition)은 1-based 양 끝 포함 구간입니다. IN(2,2,T)는 두 번째 위치의 T를 검사합니다. 원래 공급 길이·가방·후보 상관관계를 바꾸지 않습니다. P7:D(IN(1,3,T))를 P3:D(T)P4로 다시 생성하면 다른 집합이 됩니다."
          },
          {
            "kind": "p",
            "text": "끝점은 현재 범위 안에 있어야 합니다. 0, 역전 구간, 확정 길이 밖의 위치는 INVALID_FILTER_WINDOW입니다. 자동으로 자르지 않습니다. 중첩 IN의 위치는 바로 바깥 구간 기준이고 구간 안의 미노 부재는 그 구간 안에서만 판단합니다."
          },
          {
            "kind": "note",
            "text": "F2 구간은 D 전용입니다. U의 IN은 UNSUPPORTED_USE_SELECTOR입니다. 아직 진행 중인 공급·관측을 완료된 구간으로 가장하지 마세요."
          }
        ]
      },
      {
        "id": "occurrence",
        "title": "미노[n]: 개체 ID가 아닌 등장 차수",
        "blocks": [
          {
            "kind": "code",
            "text": "{P7P7}:D(I[2]<T[2])\n{P7P7}:D(I[2]<T[2],T[2])\n{P7P7}:D(IN(5,12,T[2]<I))",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "미노[n]은 현재 검사 범위에서 그 종류의 n번째 등장입니다. n은 1~256입니다. I는 I[1]과 같고 II는 종류 그룹의 중복 표기여서 I[2]가 아닙니다. IN 안에서는 해당 구간에서 다시 셉니다."
          },
          {
            "kind": "table",
            "headers": [
              "조건",
              "상태",
              "결과"
            ],
            "rows": [
              [
                "I[2]<T[2]",
                "두 번째 I만 있음",
                "true"
              ],
              [
                "I[2]<T[2]",
                "두 번째 I가 없음",
                "false"
              ],
              [
                "I[2]<T[2],T[2]",
                "두 번째 T가 없음",
                "false"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "번호가 전체 개체 출처나 홀드 ID를 의미하지 않습니다. U에서는 n>1 선택자를 거부합니다. n=1은 기존 최초 등장 표기와 동일합니다."
          }
        ]
      },
      {
        "id": "errors",
        "title": "지원하지 않는 표기와 판정",
        "blocks": [
          {
            "kind": "table",
            "headers": [
              "거부하는 표기",
              "대신 사용할 표기"
            ],
            "rows": [
              [
                "T&&I / T||I",
                "T&I / T|I"
              ],
              [
                "T==1",
                "T=1"
              ],
              [
                "!I<T",
                "!(I<T)"
              ],
              [
                "HAS(T) / D?(I<T)",
                "T / D(I<T)"
              ],
              [
                "P4::D(T) / [=P4]:D(T)",
                "P4:D(T) / {P4}:D(T)"
              ],
              [
                "TS=1",
                "종류별 조건을 명시"
              ]
            ]
          },
          {
            "kind": "p",
            "text": "구문 오류, 미지원 기능, 정확한 UNSAT, 아직 검사하지 않은 NOT_CHECKED, 한도 때문에 끝내지 못한 INCOMPLETE를 구분합니다. OR의 불가능한 한 가지가 다른 가지를 삭제하지 않고 NOT나 서로 다른 구간을 하나의 긍정 순환 그래프로 합치지 않습니다."
          }
        ]
      }
    ]
  }
];
