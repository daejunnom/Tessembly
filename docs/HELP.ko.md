# Tessembly — RFC2 공급 형식과 개발 도구

의미 프로필: tessembly.rfc2.precedence.v1
고급 문서 스키마: tessembly.document.v1

RFC2에서 A>B는 A 선행, A<B는 B 선행입니다. 같은 종류가 반복되면 지정
범위의 최초 등장 위치를 비교합니다. 선행 종류만 있으면 참이고, 선행 종류가
없으면 거짓입니다. 후행 종류의 실제 미래 출현은 보장하지 않습니다.
비교 부호 없는 종류는 존재를 요구합니다. TS 같은 비교 그룹은 모든 종류를
뜻하며 그룹 내부 순서를 지정하지 않습니다. 쉼표는 AND이고 연쇄는 인접
비교들의 AND입니다. {}는 범위만 묶고 가방을 만들지 않습니다.

RFC1의 < 방향을 그대로 읽지 않습니다. 기존 파일의 프로필을 추측하거나
자동 이관하지 않습니다. HAS, D?, U?, ::는 RFC2 단축 문법이 아닙니다.

예제:
  P4:D(T)
  P4:D(I<TS)
  P4:D(I<T>S)   = P4:D(T>IS)
  P4:D(I>T,T)   = I 선행이고 T도 존재
  {T[^T]!}:D(I>O)P4
  P7:D(I>T)U(T>I)

단축 파일 명령 (프로필을 명시):
  tessembly check --profile rfc2 [--deny-unsat] FILE...
  tessembly lint --profile rfc2 [--deny-unsat] FILE...
  tessembly format --profile rfc2 FILE
  tessembly encode --profile rfc2 INPUT.tsm OUTPUT.tsmb
  tessembly decode INPUT.tsmb OUTPUT.tsm

고급 문서 명령 (문서 헤더에 프로필 포함):
  tessembly doc-check [--deny-unsat] FILE...
  tessembly doc-format FILE
  tessembly doc-encode INPUT.tsmd OUTPUT.tsmb
  tessembly doc-decode INPUT.tsmb OUTPUT.tsmd

고급 문서 예:
  tessembly "tessembly.rfc2.precedence.v1";
  config {
      rule = seven_bag(); start = boundary();
      see = view(next=5); hold = slot(initial=empty);
  }
  supply("P4");
  draw(I<TS, I);

공급 선언: pattern, queue, shuffle, bag, pool, take, repeat, concat, either,
external. 사용자 정의 ID는 config의 registry에 선언하고 목록으로 전달합니다.
표준 seven_bag()는 균등 모델이며, 가중치·중복은 명시적인 커스텀 공급입니다.
파싱은 어떤 큐를 무작위로 고르거나 순열을 전부 생성하지 않습니다.

고급 상태: hold=none(), slot(initial=empty), slot(initial=token("T",origin=9)).
이번 턴 잠금 used, 정책 allowed, 현재 미노별 제한 deny는 별개입니다.
deny=["T"]는 홀드 요청 전 active가 T인 동안 홀드 행동을 금지합니다.
T의 일반 배치나 다른 턴의 동작을 금지하지 않습니다. D/U 축약형은 없습니다.
관측 view의 active/next/hold/memory/reveal/bag와 all()은 정보 계약이며,
실제 see-n 정책 평가는 호스트가 담당합니다. 빈 홀드가 미래 정보를 추가하지 않습니다.

외부 개발자용 적합성 도구:
  tessembly test-port
  tessembly-tck --report compact-report.json -- MY-HOST test-port
  tessembly doc-port
  tessembly-document-tck --report document-report.json -- MY-HOST doc-port

TCK는 외부 프로그램의 실제 입출력 경계를 검증하는 별도 도구입니다.
제품 실행에 필요한 내부 런타임이 아닙니다. 이 저장소 CI에서 참조 CLI에
적용하는 것은 참조 구현의 회귀 점검이며, 외부 앱·GUI·데이터셋 인증이 아닙니다.
시험용 JSON Lines는 최종 바이너리 형식과 다릅니다. 신뢰한 실행 파일에만 사용하세요.

검사기는 국소 순환을 증명할 수 있습니다. 순환 미발견은 SAT 증명이 아닙니다.
U 관계 검사는 실제 홀드/배치 합법성을 증명하지 않습니다. 끝나지 않은 사용 범위와
공급 정보 대기는 NOT_CHECKED입니다. 미지원 상태·모순·미완료를 성공한 0개로
처리하지 않습니다. 문서·호스트 환경 충돌을 마지막 값 우선으로 덮어쓰지 않습니다.

책임 경계:
  제공: 선언 파싱·정규화·유효성 검사·관계·구조적 바이너리·작은 홀드 공급 전이.
  외부 소비자: PC 탐색·커스텀 공급 실행·확률/see-n 평가·배치/리플레이 실행.
  사용자/외부 개발자: Clearra·CTK3·Fumen·Sfinder·HF 등 어댑터와 데이터셋 연결.
reference/select는 연결할 자료와 결정 시점을 보존할 뿐 조회하거나 실행하지 않습니다.
외부 연결은 테섬블리 내부의 미구현 기능으로 간주하지 않습니다.

SvelteKit 설명 문서 소스: apps/docs
바이너리: TSMB AST wire v1 / TSDC document wire v1, 모두 RFC2를 명시합니다.
불투명 메타데이터를 텍스트로 무손실 표현할 수 없으면 손실 변환을 거부합니다.
