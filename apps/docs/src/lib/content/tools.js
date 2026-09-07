/** @type {import('./types').Chapter[]} */
export const tools = [{
  slug: 'tools', title: '적합성 도구 사용법', kicker: 'FOR EXTERNAL DEVELOPERS',
  summary: '자신의 프로그램을 표준 포트에 연결해 검사하는 선택적 도구입니다. 제품 실행에는 필요하지 않습니다.',
  sections: [
    { id: 'run', title: '두 실행 파일, 두 계약', blocks: [
      { kind: 'p', text: 'tessembly-tck는 단축 문법과 표준 공급/홀드 포트를 검사합니다. tessembly-document-tck는 고급 문서, 환경 결합, 커스텀 선언 보존, 바이너리 왕복과 고급 홀드 연결을 검사합니다. 둘 다 소비자 소스코드를 읽지 않습니다.' },
      { kind: 'code', language: 'shell', text: 'cargo build --locked --workspace\n\ncargo run --locked -p tessembly-conformance -- \\\n  --report compact-report.json -- target/debug/tessembly test-port\n\ncargo run --locked -p tessembly-conformance --bin tessembly-document-tck -- \\\n  --report document-report.json -- target/debug/tessembly doc-port' },
      { kind: 'p', text: '위 명령은 제공된 참조 CLI를 검사하는 예입니다. 실제 통합 검사에서는 -- 뒤를 자신의 실행 파일과 인수로 교체합니다. Windows에서는 실행 파일에 .exe를 붙입니다. JSON 보고서는 시험 이름·통과 여부·실패 응답과 의미/전송 버전을 기록합니다.' }
    ] },
    { id: 'connect', title: '고급 포트 요청', blocks: [
      { kind: 'code', language: 'json', text: '{"id":1,"protocol":"tessembly.document-test-port.v1","profile":"tessembly.rfc3.order.v1","op":"validate","text":"tessembly \\\"tessembly.rfc3.order.v1\\\"; supply(\\\"P4\\\"); draw(I>TS);"}' },
      { kind: 'p', text: '각 줄에 JSON 요청 하나를 보내고 JSON 응답 하나를 받습니다. id와 profile을 그대로 결속합니다. validate는 구문·선언만 검사하고 실행 성공을 주장하지 않습니다. roundtrip, project, decode, hold, resolve 작업은 DOCUMENT.md에 정의되어 있습니다.' },
      { kind: 'note', text: '고급 포트는 표현과 경계를 시험합니다. 외부 DB의 실제 질의, 공개 정보 준수, 회전/배치 합법성은 소비자의 별도 통합 시험이 필요합니다. 참조 CLI를 우회 호출하는 포트로는 앱 본체를 검증할 수 없습니다.' }
    ] },
    { id: 'boundaries', title: '정확한 0개와 미완료는 다릅니다', blocks: [
      { kind: 'p', text: '지원하지 않는 정책이나 빈 홀드 상태를 임의로 바꾸지 않습니다. 공급 정보가 아직 필요한 경우 NOT_CHECKED, 한도를 초과하면 INCOMPLETE, 조건의 불가능성을 증명하면 해당 영역의 UNSAT로 보고합니다. D와 U 또는 서로 다른 범위의 관계를 섞지 않습니다.' },
      { kind: 'p', text: '도구는 응답 크기와 시간을 제한하고 잘못된 JSON·프로필·중복 결과를 검사합니다. 하지만 신뢰한 개발용 명령을 실행하는 것이지 임의 코드용 샌드박스는 아닙니다. 테섬블리 라이브러리의 배포물에 테스트 실행 파일을 포함할 필요가 없습니다.' }
    ] }
  ]
}];
