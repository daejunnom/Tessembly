/** @type {import("./types").Chapter[]} */
export const start = [
  {
    "slug": "quickstart",
    "title": "시작하기",
    "kicker": "GET STARTED",
    "summary": "큐를 적고, 조건을 붙이고, 원하는 프로그램으로 전달하세요. 테섬블리는 실행 엔진이 아닌 공급 형식입니다.",
    "sections": [
      {
        "id": "first",
        "title": "처음 쓰는 한 줄",
        "blocks": [
          {
            "kind": "code",
            "text": "P4:D(I<T,T)",
            "language": "tessembly"
          },
          {
            "kind": "p",
            "text": "표준 7종에서 중복 없이 4개를 공급합니다. I가 T보다 먼저이고 T도 있어야 합니다. <는 먼저, >는 나중입니다. 마지막 ,T를 빼면 T가 없는 범위에서 I가 있는 경우도 통과합니다."
          },
          {
            "kind": "note",
            "text": "이 사이트는 저장소의 0.3.x 구현을 설명합니다. npm의 dist-tag는 별도 배포 상태입니다. 새 기호가 거부되면 설치 버전을 확인하세요. 0.1.x의 반대 비교 방향은 명시적으로 이관해야 합니다."
          }
        ]
      },
      {
        "id": "build",
        "title": "Rust로 빌드",
        "blocks": [
          {
            "kind": "p",
            "text": "Rust 1.85.0과 커밋된 Cargo.lock을 사용합니다. 네이티브 라이브러리·CLI 실행에는 Python이나 Node가 필요하지 않습니다. Node는 npm 사용과 문서·일부 개발용 연결 시험에 사용합니다."
          },
          {
            "kind": "code",
            "text": "git clone https://github.com/daejunnom/Tessembly.git\ncd Tessembly\ncargo +1.85.0 build --locked --workspace\ncargo +1.85.0 test --locked --workspace --all-targets",
            "language": "shell"
          },
          {
            "kind": "p",
            "text": "기본 라이브러리는 core, text, relations, codec으로 나뉩니다. 고급 선언이 필요한 프로그램만 document를 사용하면 됩니다. 적합성 테스트 실행 파일은 제품 의존성이 아닙니다."
          }
        ]
      },
      {
        "id": "compact",
        "title": "단축 문법 파일 검사",
        "blocks": [
          {
            "kind": "code",
            "text": "cargo run --locked -p tessembly-cli -- check --profile rfc3 examples/groups.tsm\ncargo run --locked -p tessembly-cli -- format --profile rfc3 examples/groups.tsm",
            "language": "shell"
          },
          {
            "kind": "p",
            "text": "단축 파일은 스스로 의미 버전을 포함하지 않으므로 입력 프로필을 명시합니다. check는 구문과 증명 가능한 국소 모순을 검사합니다. NOT_CHECKED는 성공 가능한 큐나 PC 해법을 증명했다는 뜻이 아닙니다."
          }
        ]
      },
      {
        "id": "advanced",
        "title": "고급 문서로 확장",
        "blocks": [
          {
            "kind": "code",
            "text": "tessembly \"tessembly.rfc3.order.v1\";\nconfig {\n    rule = seven_bag();\n    start = boundary();\n    see = view(next=5);\n    hold = slot(initial=empty);\n}\nsupply(\"P7\");\ndraw(IN(1,3,T)&I<T,T);\nuse(I<T|!T);",
            "language": "tessembly"
          },
          {
            "kind": "code",
            "text": "cargo run --locked -p tessembly-cli -- doc-check examples/advanced/basic.tsmd\ncargo run --locked -p tessembly-cli -- doc-encode examples/advanced/basic.tsmd basic.tsmb\ncargo run --locked -p tessembly-cli -- doc-decode basic.tsmb restored.tsmd",
            "language": "shell"
          },
          {
            "kind": "p",
            "text": "IN은 1~3번째 공급을 검사하고 마지막 T는 전체 범위의 존재를 요구합니다. 고급 문서는 의미 헤더·환경·공급·관계를 저장합니다. 검사 통과가 배치 성공을 뜻하지 않습니다."
          }
        ]
      }
    ]
  },
  {
    "slug": "scope",
    "title": "프로젝트의 경계",
    "kicker": "DESIGN CONTRACT",
    "summary": "작고 독립적인 형식으로 완결합니다. 외부 탐색기와 데이터셋을 제품 안으로 끌어들이지 않습니다.",
    "sections": [
      {
        "id": "owns",
        "title": "공급 형식의 책임",
        "blocks": [
          {
            "kind": "p",
            "text": "Tessembly는 Clearra와 유사한 큐 입력·내부 구조를 바탕으로 공급열, 공급 상태, 공개 범위, D/U 관계를 파싱·검사·정형화·교환합니다. F1/F2는 이미 구현된 공급 조건이며 검토 중인 계획이 아닙니다."
          },
          {
            "kind": "p",
            "text": "셋업 선택·PC 목표·평가값·정책 그래프·외부 데이터셋 계약은 공급 밖입니다. Q1/M1 및 MATCH는 추가하지 않습니다. 기존 reference/select는 호환 레코드로만 보존하고 기능 확장을 위한 진입점으로 삼지 않습니다."
          }
        ]
      },
      {
        "id": "host",
        "title": "소비자 프로그램이 담당하는 것",
        "blocks": [
          {
            "kind": "p",
            "text": "PC 탐색, 기하·회전·도달성, 실제 게임 진행, see-n 정책 평가, 가중 샘플링, 상태 기반 공급 실행, 리플레이 재현은 외부 프로그램의 역할입니다. 이들은 테섬블리 완성을 기다리는 내부 미구현 기능 목록이 아닙니다."
          },
          {
            "kind": "note",
            "text": "Clearra·CTK3·Fumen·Sfinder 어댑터와 HF 등 외부 데이터셋 연결은 사용자 또는 외부 개발자가 작성합니다. 이 저장소는 외부 자료를 자동 조회하거나 외부 코드를 다운로드해 실행하지 않습니다."
          }
        ]
      },
      {
        "id": "tests",
        "title": "적합성 테스트의 사용자는 외부 개발자",
        "blocks": [
          {
            "kind": "p",
            "text": "tessembly-conformance는 소비자 프로그램의 실제 입출력 경계에 연결해 사용하는 독립 개발 도구입니다. 테섬블리 실행에 필수인 내부 런타임이나 탐색 엔진이 아닙니다. 저장소 CI에서 참조 CLI에 실행하는 것은 배포하는 도구와 참조 구현의 회귀 점검입니다."
          },
          {
            "kind": "p",
            "text": "유한한 테스트 통과는 모든 입력의 정확성 증명이나 외부 앱 인증이 아닙니다. 테스트 전용 우회 파서 대신 실제 앱 요청 경로에 연결해야 합니다. GUI E2E에는 외부 개발자가 UI용 연결부를 제공해야 합니다."
          }
        ]
      },
      {
        "id": "versions",
        "title": "기능 지원과 의미 버전",
        "blocks": [
          {
            "kind": "p",
            "text": "RFC3는 < 선행을 고정합니다. F1/F2는 filters.logic.v1, filters.count.v1, filters.window.v1, filters.occurrence.v1 기능으로 구분합니다. 미지원 필수 관계는 거부해야 합니다. 문서 wire=1·의미=3과 npm Wasm ABI=3은 서로 다른 계약입니다."
          },
          {
            "kind": "p",
            "text": "완료된 사용자 안내만 Pages에 게시합니다. 미구현 제안은 대화에서 검토하며 사이트에는 올리지 않습니다. RFC2 자료는 이관 도구로 처리하고 헤더 없는 문자열의 원래 버전을 추측하지 않습니다."
          }
        ]
      }
    ]
  }
];
