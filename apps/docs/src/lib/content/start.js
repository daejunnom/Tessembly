const p = (text) => ({ kind: 'p', text });
const code = (text, language = 'shell') => ({ kind: 'code', text, language });
const note = (text) => ({ kind: 'note', text });
/** @type {import('./types').Chapter[]} */
export const start = [{
  slug: 'quickstart', title: '시작하기', kicker: 'GET STARTED',
  summary: '큐를 적고, 조건을 붙이고, 원하는 프로그램으로 전달하세요. 테섬블리는 실행 엔진이 아닌 공급 형식입니다.',
  sections: [
    { id: 'first', title: '처음 쓰는 한 줄', blocks: [code('P4:D(I>TS)', 'tessembly'), p('표준 일곱 종류에서 중복 없이 네 개를 고르는 패턴입니다. T와 S가 I보다 먼저 등장해야 하고, T와 S 사이의 순서는 정하지 않습니다. I가 범위에 없어도 두 선행 종류가 있으면 조건을 만족합니다.'), note('RFC3에서 A<B는 A 선행, A>B는 B 선행입니다. 위치 숫자의 대소가 아닙니다. 과거 RFC1 파일을 같은 의미로 자동 해석하지 않습니다.')] },
    { id: 'build', title: 'Rust로 빌드', blocks: [p('저장소에서 Rust 1.85.0 도구체인과 커밋된 Cargo.lock을 사용합니다. Python은 필요하지 않습니다. SvelteKit과 Node.js는 문서 사이트를 개발할 때만 필요합니다.'), code('git clone https://github.com/daejunnom/Tessembly.git\ncd Tessembly\ncargo +1.85.0 build --locked --workspace\ncargo +1.85.0 test --locked --workspace --all-targets'), p('기본 라이브러리는 core, text, relations, codec으로 나뉩니다. 고급 선언이 필요한 프로그램만 document를 사용하면 됩니다. 적합성 테스트 실행 파일은 제품 의존성이 아닙니다.')] },
    { id: 'compact', title: '단축 문법 파일 검사', blocks: [code('cargo run --locked -p tessembly-cli -- check --profile rfc3 examples/groups.tsm\ncargo run --locked -p tessembly-cli -- format --profile rfc3 examples/groups.tsm'), p('단축 파일은 스스로 의미 버전을 포함하지 않으므로 입력 프로필을 명시합니다. check는 구문과 증명 가능한 국소 모순을 검사합니다. NOT_CHECKED는 성공 가능한 큐나 PC 해법을 증명했다는 뜻이 아닙니다.')] },
    { id: 'advanced', title: '고급 문서로 확장', blocks: [code('tessembly "tessembly.rfc3.order.v1";\nconfig {\n    rule = seven_bag();\n    start = boundary();\n    see = view(next=5, active=true, hold=true, memory=history);\n    hold = slot(initial=empty);\n}\nsupply("P4");\ndraw(I>TS, I);', 'tessembly'), code('cargo run --locked -p tessembly-cli -- doc-check examples/advanced/basic.tsmd\ncargo run --locked -p tessembly-cli -- doc-encode examples/advanced/basic.tsmd basic.tsmb\ncargo run --locked -p tessembly-cli -- doc-decode basic.tsmb restored.tsmd'), p('고급 문서는 버전, 불변 환경, 구조화된 공급, 조건을 함께 저장합니다. draw의 마지막 I는 이 범위에 I도 존재해야 한다는 뜻입니다.')] }
  ]
}, {
  slug: 'scope', title: '프로젝트의 경계', kicker: 'DESIGN CONTRACT',
  summary: '작고 독립적인 형식으로 완결합니다. 외부 탐색기와 데이터셋을 제품 안으로 끌어들이지 않습니다.',
  sections: [
    { id: 'owns', title: '테섬블리가 제공하는 것', blocks: [p('단축·고급 문법 파싱, 정형화, 설정·참조 검사, 최초 등장 관계, 국소 모순 진단, 구조적 바이너리 교환, 작은 홀드 공급 전이, CLI를 제공합니다. 문서 사이트는 이 계약을 설명하는 정적 SvelteKit 앱입니다.'), p('사용자 정의 미노·가방·가중치·외부 정책·see-n·QB/OQB 선택 시점은 선언으로 검증하고 보존합니다. 선언을 표현할 수 있다는 것과 그 정책을 실행하거나 최적화한다는 것은 구별합니다.')] },
    { id: 'host', title: '소비자 프로그램이 담당하는 것', blocks: [p('PC 탐색, 기하·회전·도달성, 실제 게임 진행, see-n 정책 평가, 가중 샘플링, 상태 기반 공급 실행, 리플레이 재현은 외부 프로그램의 역할입니다. 이들은 테섬블리 완성을 기다리는 내부 미구현 기능 목록이 아닙니다.'), note('Clearra·CTK3·Fumen·Sfinder 어댑터와 HF 등 외부 데이터셋 연결은 사용자 또는 외부 개발자가 작성합니다. 이 저장소는 외부 자료를 자동 조회하거나 외부 코드를 다운로드해 실행하지 않습니다.')] },
    { id: 'tests', title: '적합성 테스트의 사용자는 외부 개발자', blocks: [p('tessembly-conformance는 소비자 프로그램의 실제 입출력 경계에 연결해 사용하는 독립 개발 도구입니다. 테섬블리 실행에 필수인 내부 런타임이나 탐색 엔진이 아닙니다. 저장소 CI에서 참조 CLI에 실행하는 것은 배포하는 도구와 참조 구현의 회귀 점검입니다.'), p('유한한 테스트 통과는 모든 입력의 정확성 증명이나 외부 앱 인증이 아닙니다. 테스트 전용 우회 파서 대신 실제 앱 요청 경로에 연결해야 합니다. GUI E2E에는 외부 개발자가 UI용 연결부를 제공해야 합니다.')] },
    { id: 'versions', title: '호환성은 버전으로', blocks: [p('RFC3 의미 프로필, 고급 문서 스키마, 바이너리 wire, 테스트 포트 버전은 서로 별개입니다. RFC1은 자동 변환하지 않고 명시적으로 거부합니다. 커스텀 실행이나 참조 해석을 지원하지 않는 소비자는 조건을 버리지 말고 UNSUPPORTED 또는 UNSUPPORTED_STATE를 반환해야 합니다.')] }
  ]
}];
