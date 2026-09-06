# Tessembly Rust draft — RFC2

의미 프로필: tessembly.rfc2.precedence.v1

RFC2에서 A>B는 A 선행, A<B는 B 선행입니다. 같은 종류가 반복되면 지정
범위의 최초 등장 위치를 비교합니다. 선행 종류만 있으면 참이고, 선행 종류가
없으면 거짓입니다. 후행 종류의 실제 미래 출현은 보장하지 않습니다.
비교 부호 없는 종류는 존재를 요구합니다. TS 같은 비교 그룹은 모든 종류를
뜻하며 그룹 내부 순서를 지정하지 않습니다. 쉼표는 AND이고 연쇄는 인접
비교들의 AND입니다. {}는 범위만 묶고 가방을 만들지 않습니다.

RFC1의 < 방향을 그대로 읽지 않습니다. 기존 파일의 프로필을 추측하지 않습니다.

예제:
  P4:D(T)
  P4:D(I<TS)
  P4:D(I<T>S)   = P4:D(T>IS)
  P4:D(I>T,T)   = I 선행이고 T도 존재
  {T[^T]!}:D(I>O)P4
  P7:D(I>T)U(T>I)

명령 (파일 입력에는 프로필을 명시):
  tessembly lint --profile rfc2 [--deny-unsat] FILE...
  tessembly format --profile rfc2 FILE
  tessembly encode --profile rfc2 INPUT.tsm OUTPUT.tsmb
  tessembly decode INPUT.tsmb OUTPUT.tsm
  tessembly test-port
  tessembly-tck --report report.json -- tessembly test-port

lint는 국소 순환을 증명할 수 있습니다. 순환 미발견은 SAT 증명이 아닙니다.
사용 순서 검사는 출처 인덱스 관계만 검사하며 홀드/실제 배치 합법성을 증명하지
않습니다. 끝나지 않은 사용 범위는 NOT_CHECKED입니다.

홀드 상태 NONE, EMPTY, OCCUPIED 및 이번 턴 잠금은 별개입니다.
특정 active 미노의 홀드 금지는 고급 typed/JSON 포트에만 있고 D/U 축약형은 없습니다.

초안 한계: CONFIG 텍스트, RFC1 이관, 사용자 정의 미노 코덱, 전체 게임 규칙,
see-n 정책 평가, PC 탐색, Clearra/HF 연결, GUI, 리플레이는 구현하지 않았습니다.
