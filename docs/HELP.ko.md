# Tessembly — 한국어 도움말

구현된 참조 사양: `tessembly.rfc3.order.v1`, F1/F2 in 0.3.x.

## 단축 문법

Clearra의 큐·패턴 뒤에 대문자 D·U를 붙입니다. 조건 범위는 입력의 구조로 결정됩니다.

### 기본 공급 표현

| 표현 | 정확한 의미 |
| --- | --- |
| IOTSZJL | 고정 공급 순서 |
| P4 | 표준 7종에서 중복 없이 4개를 쓰는 모든 순서 |
| P7P4 | 독립 순열 구간 두 개의 연결 |
| [ITO] | I·T·O 중 하나 |
| [ITO]2 | 해당 종류에서 중복 없이 두 개 |
| [ITO]! | 해당 집합 전체의 순열 |
| [^T] | T를 제외한 표준 종류 중 하나 |
| * / *! | 임의의 한 종류 / 표준 전체 순열 |
| IOT;ITO | 두 대안의 합집합 |

대괄호 안의 반복 문자는 종류의 중복 표기입니다. [TTI]!는 T가 두 개인 가방이 아닙니다. 중복 개수가 필요한 경우 고급 bag 또는 shuffle 선언을 사용하세요. 대안은 이 프로필에서 같은 길이여야 합니다.

### 콜론과 중괄호

```text
P7:D(I<T)P4
P7P4:D(I<T)
{T[^T]!}:D(I<O)P4
{P7P4}:D(I<T)
P7:D(I<T,T)U(T<I)
```

콜론은 바로 앞의 완전한 공급 표현에 붙습니다. 첫 줄은 P7, 둘째 줄은 P4만 검사합니다. {}는 여러 표현을 한 범위로 묶습니다. 한 콜론 뒤에 D와 U를 이어 쓸 수 있지만, 같은 범위에서 같은 블록을 두 번 쓰지는 않습니다.

> {}는 가방 경계를 만들지 않습니다. P3P3는 두 독립 구간이고 P6와 다릅니다. []는 선택·순열 구문이며 {}와 서로 바꿀 수 없습니다.

### 부등호·그룹·혼합 연쇄

| RFC3 | 의미 |
| --- | --- |
| A<B | A가 B보다 먼저 |
| A>B | B가 A보다 먼저 |
| I<TS | I가 T·S보다 먼저; T/S 사이의 순서는 무관 |
| I<T>S | I·S가 T보다 먼저 |
| T>IS | I<T>S와 동등 |

```text
P4:D(I<T)
P4:D(I<TS)
P4:D(I<T>S)
P4:D(T>IS)
P4:D(I<T,T)
```

기본 비교는 지정 범위의 최초 등장 위치끼리 합니다. 그룹은 모든 교차 쌍의 AND입니다. 혼합 연쇄는 인접 그룹 사이의 비교만 추가합니다. I<IT에는 I<I가 포함되므로 참이 될 수 없습니다. 같은 종류를 두 번 적는 TT는 두 번째 T를 지정하지 않습니다.

### 존재·부재·부분 정보

단독 T는 존재 조건입니다. TS는 T와 S가 모두 존재한다는 뜻이며 연속 순서·OR가 아닙니다. D(I<T)에서 선행 I는 반드시 있어야 하고 후행 T는 없을 수 있습니다. T도 필요하면 D(I<T,T)를 씁니다.

| 완료된 범위 | D(I<T) |
| --- | --- |
| IT | true |
| TI | false |
| IOSZ | true |
| TOSZ | false |
| OSZJ | false |
| ITIT | true |
| TIIT | false |

```text
P4:D(T)
P4:D(TS)
P4:D(I<T,T)
```

> 범위 밖의 미노를 읽지 않습니다. 후행 종류의 부재는 미래 출현을 보장하지 않습니다. 아직 보이지 않는 미노는 부재가 아닙니다. 미완료 관측창이나 사용창을 완료된 공급으로 취급하지 마세요.

### 조건 목록과 D/U

```text
P7:D(I<T<S)
P7:D(I<T,T<S)
P7:D(I<T<S<I)
P7:D(I<T)U(T<I)
```

쉼표는 각 완전한 조건식을 AND로 연결합니다. I<T<S는 I<T와 T<S의 AND입니다. D는 공급 순서, U는 해당 공급 출처에 속한 사용 순서를 검사합니다. 두 영역을 같은 순환 그래프로 합치지 않습니다.

순환도 구문은 유효하지만 동일 범위의 엄격한 순환은 UNSAT입니다. 모순 미발견은 NOT_CHECKED이며 PC·홀드·배치 가능성의 증명이 아닙니다. 한도 소진은 INCOMPLETE이고 정확한 빈 결과와 다릅니다.

### 집합 크기와 구체적인 사례

| 패턴 | 서로 다른 공급 수 |
| --- | --- |
| P4 | 840 |
| P4:D(T) | 480 |
| P4:D(TS) | 240 |
| P4:D(I<T) | 360 |
| P4:D(I<T,T) | 120 |
| P4:D(I<TS) | 272 |
| P4:D(I<T>S) | 176 |

표준 7종의 순수 패턴 집합이며 초기 상태·PC 성공률과 무관합니다. 반대 방향도 같은 개수가 나올 수 있으므로 참·거짓 표와 구체적인 큐를 함께 검증합니다.

## 논리 필터·구간·등장 차수

0.3.x에 구현된 &, |, !, 개수 비교, IN과 미노[n]의 정확한 의미와 오류를 설명합니다.

### 논리 연산은 비트 연산이 아닙니다

```text
P4:D(I<T&T)
P4:D(I<T|S<Z)
P4:D(!T)
P4:D(!(I<T))
P4:D((I<T|S<Z)&T)
```

| 기호 | 의미 |
| --- | --- |
| & | 논리 AND; C의 && 의미 |
| \| | 논리 OR; C의 \|\| 의미 |
| ! | 논리 NOT; !T는 T 부재 |
| () | 조건식 묶음 |

우선순위는 괄호·조건 원자, NOT, AND, OR입니다. 구문·지원 기능·모든 구간을 먼저 검사하고 유효한 조건만 왼쪽부터 단락 평가합니다. T|IN(1,5,I)는 P4에서 T가 있어도 범위 오류입니다.

> !(I<T)는 T<I와 다릅니다. 둘 다 없는 범위에서는 전자만 참입니다. !I<T는 추측해서 고치지 않고 거부합니다. 논리 연산이 C와 유사해도 미노 그룹·연쇄 비교와 쉼표 목록은 Tessembly의 계약입니다.

### 쉼표·괄호·연쇄의 구분

| 입력 | 동등한 입력 |
| --- | --- |
| D(I\|T&S) | D(I\|(T&S)) |
| D(I\|T,S) | D((I\|T)&S) |
| D(I<T<S) | D(I<T&T<S) |
| D(I<T>S) | D(T>IS) |

```text
P4:D(I|T&S)
P4:D(I|T,S)
P4:D((I|T)&S)
```

쉼표는 최상위 조건 목록 구분자입니다. 괄호로 묶는 Boolean 그룹 안에서는 &와 |를 쓰세요. IN·고급 함수의 쉼표는 그 함수의 인수 구분입니다. 의미가 다른 쉼표를 문자열 치환으로 합치지 않습니다.

### 종류별 개수와 단독 미노

```text
P4:D(T=1&S=0)
P4:D(T!=0)
P4:D(T<=0)
P4:D(T>=1)
```

| 형식 | 의미 |
| --- | --- |
| T | T가 한 번 이상 |
| T=1 | 정확히 한 번 |
| T=0 / !T | T 없음 |
| T!=1 | 정확히 한 번이 아님 |
| T<2 / T<=2 / T>2 / T>=2 | 해당 종류 개수의 비교 |

=는 대입이 아닌 개수 일치입니다. 숫자는 0~256의 정수이며 하나의 종류에만 적용합니다. TS=1은 그룹 합계가 아니므로 거부합니다. T[2]=1도 개수가 아닌 선택자이므로 거부합니다. 표준 7-bag 하나에서는 같은 종류가 한 번뿐이지만 여러 가방·커스텀 다중집합에는 개수 조건이 유용합니다.

### IN: 공급을 유지한 채 일부 위치 검사

```text
P7:D(IN(1,3,T))
P7:D(IN(2,5,I<T&T))
P7:D(IN(1,3,T)&IN(4,7,I))
```

IN(start,end,condition)은 1-based 양 끝 포함 구간입니다. IN(2,2,T)는 두 번째 위치의 T를 검사합니다. 원래 공급 길이·가방·후보 상관관계를 바꾸지 않습니다. P7:D(IN(1,3,T))를 P3:D(T)P4로 다시 생성하면 다른 집합이 됩니다.

끝점은 현재 범위 안에 있어야 합니다. 0, 역전 구간, 확정 길이 밖의 위치는 INVALID_FILTER_WINDOW입니다. 자동으로 자르지 않습니다. 중첩 IN의 위치는 바로 바깥 구간 기준이고 구간 안의 미노 부재는 그 구간 안에서만 판단합니다.

> F2 구간은 D 전용입니다. U의 IN은 UNSUPPORTED_USE_SELECTOR입니다. 아직 진행 중인 공급·관측을 완료된 구간으로 가장하지 마세요.

### 미노[n]: 개체 ID가 아닌 등장 차수

```text
{P7P7}:D(I[2]<T[2])
{P7P7}:D(I[2]<T[2],T[2])
{P7P7}:D(IN(5,12,T[2]<I))
```

미노[n]은 현재 검사 범위에서 그 종류의 n번째 등장입니다. n은 1~256입니다. I는 I[1]과 같고 II는 종류 그룹의 중복 표기여서 I[2]가 아닙니다. IN 안에서는 해당 구간에서 다시 셉니다.

| 조건 | 상태 | 결과 |
| --- | --- | --- |
| I[2]<T[2] | 두 번째 I만 있음 | true |
| I[2]<T[2] | 두 번째 I가 없음 | false |
| I[2]<T[2],T[2] | 두 번째 T가 없음 | false |

번호가 전체 개체 출처나 홀드 ID를 의미하지 않습니다. U에서는 n>1 선택자를 거부합니다. n=1은 기존 최초 등장 표기와 동일합니다.

### 지원하지 않는 표기와 판정

| 거부하는 표기 | 대신 사용할 표기 |
| --- | --- |
| T&&I / T\|\|I | T&I / T\|I |
| T==1 | T=1 |
| !I<T | !(I<T) |
| HAS(T) / D?(I<T) | T / D(I<T) |
| P4::D(T) / [=P4]:D(T) | P4:D(T) / {P4}:D(T) |
| TS=1 | 종류별 조건을 명시 |

구문 오류, 미지원 기능, 정확한 UNSAT, 아직 검사하지 않은 NOT_CHECKED, 한도 때문에 끝내지 못한 INCOMPLETE를 구분합니다. OR의 불가능한 한 가지가 다른 가지를 삭제하지 않고 NOT나 서로 다른 구간을 하나의 긍정 순환 그래프로 합치지 않습니다.

## 고급 선언 문법

함수형 선언으로 공급·환경·F1/F2 조건을 보존합니다. 고급 표기는 단축 문법과 같은 관계 모델을 사용합니다.

### 문서의 기본 구조

```text
tessembly "tessembly.rfc3.order.v1";
config {
    rule = seven_bag();
    start = boundary();
    see = view(next=5);
    hold = slot(initial=empty);
}
supply("P7");
draw(IN(1,3,T)&I<T,T);
use(I<T|!T);
```

config, supply, draw, use는 각각 한 번만 선언합니다. 같은 설정 키나 함수의 같은 명명 인수를 두 번 쓰면 값이 같아도 거부합니다. 선언 순서로 전역 환경을 덮어쓰지 않습니다. reference와 select는 서로 다른 식별자를 사용해 여러 개 선언할 수 있습니다.

문장 끝은 세미콜론입니다. // 주석, UTF-8 문자열, true/false, 부호 없는 정수, 목록, 위치 인수와 명명 인수를 지원합니다. 명명 인수를 쓴 뒤 위치 인수를 다시 쓰지 않습니다. 임의 스크립트, 반복문, 함수 실행, 네트워크 호출은 지원하지 않습니다.

### 공급 함수

| 함수 | 표현하는 데이터 |
| --- | --- |
| pattern("P4") 또는 "P4" | 기존 단축 공급 AST |
| queue("IOT") | 정확한 유한 공급 |
| shuffle("TTI") | 다중집합의 서로 다른 순열 |
| bag("IOTSZJL") | 소진 후 같은 구성을 보충하는 가방 스트림 |
| pool("IT") | 매번 복원 추출하는 스트림 |
| take(10, bag("IOTSZJL")) | 앞 10개의 유한 범위 |
| repeat(3, shuffle("SZ")) | 유한 공급 표현을 독립적으로 3회 반복 |
| concat(queue("IT"), shuffle("SZ")) | 공급 연결 |
| either(queue("IT"), queue("TI")) | 동일 길이 대안 |
| external("vendor.rule", revision="v1", length=10) | 버전이 고정된 외부 정책 참조 |

take는 유한 공급보다 큰 개수를 요구할 수 없습니다. repeat의 대상은 유한해야 합니다. 끝나지 않는 스트림 뒤에 다른 공급을 연결하면 거부합니다. 파서는 이런 길이 계약을 검사하지만 순열 전체를 펼치거나 실제 미노를 뽑지는 않습니다.

문자열 묶음은 표준 일곱 종류에 사용합니다. 다중 문자 사용자 정의 ID는 목록으로 표현합니다. 기본 관계 도구로 변환할 수 없는 커스텀 공급은 SOURCE_REQUIRES_HOST로 남고 임의의 표준 큐로 대체하지 않습니다.

### 동일한 논리식과 명시적 함수

| 단축 조건 | 고급 표기 |
| --- | --- |
| T | present("T") |
| I<T | before("I","T") |
| T[2] | present(nth("T",2)) |
| I[2]<T | before(nth("I",2),"T") |
| T=2 | count("T","=",2) |
| I&T / I\|T | all(present("I"),present("T")) / any(present("I"),present("T")) |
| !T | not(present("T")) |
| IN(1,3,T) | within(1,3,present("T")) |

```text
tessembly "tessembly.rfc3.order.v1";
config { registry=["PENTO_P"]; rule=from_source; }
supply(take(8, bag(["I","PENTO_P","PENTO_P"])));
draw(all(count("PENTO_P",">=",2),before(nth("PENTO_P",2),"I")));
```

draw/use는 표준 종류의 논리식을 직접 받거나 위 함수형 표기를 받습니다. 출력기는 all/any/not/count/within/nth/before/present를 명시적으로 출력합니다. before(A,B)는 언제나 A 선행입니다. 함수 인수 수·종류·등록된 ID를 검사하며 함수를 실행하지 않습니다.

> 사용자 정의 ID는 registry에 등록하고 문자열로 적습니다. 이 예시는 커스텀 가방이며 표준 7-bag가 아닙니다. 공급 관련 함수의 숫자·문자열 안에 있는 기호를 부등호 이관으로 치환하지 않습니다.

### 환경의 단일 권한

설정 없는 문서 조각을 읽고 쓰는 것은 가능합니다. 실제 실행 요청에서는 rule, start, see, hold를 호스트와 결합해 하나로 확정해야 합니다. with_host_config는 없는 키만 채우고, 이미 존재하는 키의 값이 다르면 CONFIG_CONFLICT를 반환합니다. 자동으로 마지막 값을 선택하지 않습니다.

rule=seven_bag()의 균등 정책은 변경 불가입니다. from_source는 공급 선언 자체가 정책을 설명한다는 뜻입니다. 커스텀 실행기의 설정은 external("id",revision="...")로 명시할 수 있습니다. 그 ID를 보고 코드를 자동 로드하지 않습니다.

### 기존 참조 선언의 호환성 경계

> 기본 reference/select 레코드는 기존 파일의 호환성을 위해 읽고 보존합니다. 새 공급 입력에는 필요하지 않습니다. Q1·M1·MATCH나 QB/OQB 전용 탐색 문법은 추가하지 않았으며 권장 공급 문법에 포함하지 않습니다.

reference는 고유 ID와 format/value, 선택적인 page/revision을 저장합니다. select는 기존 reference ID 목록과 오름차순 at 값을 저장합니다. 이를 읽는다는 사실은 자료 조회·셋업 선택·정책 탐색 지원을 뜻하지 않습니다. 셋업·평가값·데이터셋 로직은 소비자 문서가 Tessembly 공급을 감싸는 방식으로 관리하세요.

## 명령과 명시적 이관

```sh
tessembly --lang ko help
tessembly check --profile rfc3 input.tsm
tessembly format --profile rfc3 input.tsm
tessembly encode --profile rfc3 input.tsm new.tsmb
tessembly decode input.tsmb new.tsm
tessembly doc-check input.tsmd
tessembly doc-format input.tsmd
tessembly doc-encode input.tsmd new.tsdc
tessembly doc-decode input.tsdc new.tsmd
tessembly migrate-rfc2 old.tsm new.tsm
tessembly doc-migrate-rfc2 old.tsmd new.tsmd
tessembly migrate-binary-rfc2 old.tsmb new.tsmb
tessembly doc-migrate-binary-rfc2 old.tsdc new.tsdc
```

출력 파일은 새 파일이어야 합니다. 언어 변경은 표시만 바꾸고 오류 코드·저장 의미는 바꾸지 않습니다. 저장소 빌드는 npm 공개 배포와 별개입니다.
