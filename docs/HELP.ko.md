# Tessembly — 한국어 도움말

의미 프로필: tessembly.rfc3.order.v1

RFC3에서 A<B는 A 선행, A>B는 B 선행입니다. 같은 종류는 지정 범위의
최초 등장끼리 비교합니다. 선행 종류는 있어야 하고 후행 종류는 없을 수
있습니다. 둘 다 없으면 거짓이며 후행 종류가 미래에 등장함을 보장하지 않습니다.
단독 미노는 존재 조건입니다. TS는 모두 존재하되 인접이나 순서를 뜻하지
않습니다. 쉼표는 AND, 연쇄는 인접 비교의 AND입니다. {}는 가방이 아닌
적용 범위를 묶습니다. RFC1 파일을 추측하거나 자동 이관하지 않습니다.

예제:
  P4:D(T)
  P4:D(I>TS)
  P4:D(I>T<S) = P4:D(T<IS)
  P4:D(I<T,T)
  {T[^T]!}:D(I<O)P4
  P7:D(I<T)U(T<I)

명령:
  tessembly [--lang en|ko|auto] help
  tessembly lint --profile rfc3 [--deny-unsat] FILE...
  tessembly format --profile rfc3 FILE
  tessembly encode --profile rfc3 INPUT.tsm OUTPUT.tsmb
  tessembly decode INPUT.tsmb OUTPUT.tsm
  tessembly doc-check [--deny-unsat] FILE.tsmd...
  tessembly doc-format FILE.tsmd
  tessembly doc-encode INPUT.tsmd OUTPUT.tsmb
  tessembly doc-decode INPUT.tsmb OUTPUT.tsmd

네이티브 CLI 언어는 --lang, TESSEMBLY_LANG, 표준 로캘 환경변수 순으로
결정합니다. 한국어가 아니면 영어입니다. 로캘 환경변수가 없는 데스크톱에서는
--lang을 지정하거나 플랫폼 Intl 로캘을 읽는 npm CLI를 사용할 수 있습니다.
기계 JSON·오류 코드·바이트 위치·문법·저장 데이터는 번역하지 않습니다.

외부 개발자용 선택적 도구(제품 런타임이 아님):
  tessembly-tck --report report.json -- YOUR_HOST test-port
  tessembly-document-tck --report report.json -- YOUR_HOST doc-port

국소 모순 미발견은 SAT/PC 증명이 아닙니다. U는 사용 관계이지 배치 합법성
검사가 아닙니다. NONE·EMPTY·점유 홀드·턴 잠금은 별개입니다. 특정 active
미노의 홀드 금지는 고급 입력에만 있으며 단축 옵션은 없습니다.

고급 선언은 환경·커스텀 공급·관측·홀드·참조·결정 시점을 보존합니다.
실제 공급 실행·see-n 평가·PC 탐색·리플레이·외부 데이터셋/앱 연결은 소비자가
구현합니다. 참조를 자동 조회하지 않고 문서·적합성 도구는 런타임과 분리됩니다.

RFC2 → RFC3 명시적 이관(기존 텍스트를 자동 판별하지 않습니다):
  tessembly migrate-rfc2 OLD.tsm NEW.tsm
  tessembly doc-migrate-rfc2 OLD.tsmd NEW.tsmd
  tessembly migrate-binary-rfc2 OLD.tsmb NEW.tsmb
  tessembly doc-migrate-binary-rfc2 OLD.tsdc NEW.tsdc
불투명 선택 메타데이터는 별도 이관 핸들러가 필요하며 출력 파일을 덮어쓰지 않습니다.
D(I<T): IT=참, TI=거짓, IOSZ=참, TOSZ=거짓, OSZJ=거짓. 미관측과 부재는 다릅니다.
논리 필터·확장 QB/OQB 선언은 설계 전용이며 소유자의 GO를 기다립니다.
