import fs from 'node:fs';
import { getChapters } from '../../apps/docs/src/lib/content/index.js';
const get=structuredClone({en:getChapters('en'),ko:getChapters('ko')});
const chapter=(l,s)=>get[l].find(c=>c.slug===s);
const section=(l,s,id)=>chapter(l,s).sections.find(x=>x.id===id);
const p=text=>({kind:'p',text}), note=text=>({kind:'note',text});
const code=(text,language='tessembly')=>({kind:'code',text,language});
const table=(headers,rows)=>({kind:'table',headers,rows});
function set(l,s,id,title,blocks){const c=chapter(l,s),v={id,title,blocks};const i=c.sections.findIndex(x=>x.id===id);if(i>=0)c.sections[i]=v;else c.sections.push(v);}
const example='tessembly "tessembly.rfc3.order.v1";\nconfig {\n    rule = seven_bag();\n    start = boundary();\n    see = view(next=5);\n    hold = slot(initial=empty);\n}\nsupply("P7");\ndraw(IN(1,3,T)&I<T,T);\nuse(I<T|!T);';
for(const l of ['en','ko']){
 const ko=l==='ko';
 set(l,'compact','local',ko?'콜론과 중괄호':'Colon and braces',[
 code('P7:D(I<T)P4\nP7P4:D(I<T)\n{T[^T]!}:D(I<O)P4\n{P7P4}:D(I<T)\nP7:D(I<T,T)U(T<I)'),
 p(ko?'콜론은 바로 앞의 완전한 공급 표현에 붙습니다. 첫 줄은 P7, 둘째 줄은 P4만 검사합니다. {}는 여러 표현을 한 범위로 묶습니다. 한 콜론 뒤에 D와 U를 이어 쓸 수 있지만, 같은 범위에서 같은 블록을 두 번 쓰지는 않습니다.':'A colon attaches to the immediately preceding complete supply expression: P7 in the first line, P4 in the second. Braces group expressions into one scope. D and U can follow one colon, but each block appears at most once per scope.'),
 note(ko?'{}는 가방 경계를 만들지 않습니다. P3P3는 두 독립 구간이고 P6와 다릅니다. []는 선택·순열 구문이며 {}와 서로 바꿀 수 없습니다.':'Braces do not create bag boundaries. P3P3 consists of independent pools and is not P6. Brackets specify choices/permutations, not a brace scope.')]);
 set(l,'compact','direction',ko?'부등호·그룹·혼합 연쇄':'Order, groups and mixed chains',[
 table(['RFC3',ko?'의미':'Meaning'],[['A<B',ko?'A가 B보다 먼저':'A precedes B'],['A>B',ko?'B가 A보다 먼저':'B precedes A'],['I<TS',ko?'I가 T·S보다 먼저; T/S 사이의 순서는 무관':'I precedes T and S; T/S remain unordered'],['I<T>S',ko?'I·S가 T보다 먼저':'I and S precede T'],['T>IS',ko?'I<T>S와 동등':'Equivalent to I<T>S']]),
 code('P4:D(I<T)\nP4:D(I<TS)\nP4:D(I<T>S)\nP4:D(T>IS)\nP4:D(I<T,T)'),
 p(ko?'기본 비교는 지정 범위의 최초 등장 위치끼리 합니다. 그룹은 모든 교차 쌍의 AND입니다. 혼합 연쇄는 인접 그룹 사이의 비교만 추가합니다. I<IT에는 I<I가 포함되므로 참이 될 수 없습니다. 같은 종류를 두 번 적는 TT는 두 번째 T를 지정하지 않습니다.':'Bare kinds compare first occurrences inside the attached scope. Groups mean all cross-pairs (AND); mixed chains compare adjacent groups only. I<IT includes I<I and cannot hold. Repeating a kind as TT does not select its second occurrence.')]);
 set(l,'compact','presence',ko?'존재·부재·부분 정보':'Presence, absence and partial information',[
 p(ko?'단독 T는 존재 조건입니다. TS는 T와 S가 모두 존재한다는 뜻이며 연속 순서·OR가 아닙니다. D(I<T)에서 선행 I는 반드시 있어야 하고 후행 T는 없을 수 있습니다. T도 필요하면 D(I<T,T)를 씁니다.':'Bare T requires presence; TS requires both kinds, not adjacency, an order or OR. In D(I<T), earlier I must exist while later T may be absent. Use D(I<T,T) to require T as well.'),
 table([ko?'완료된 범위':'Closed scope','D(I<T)'],[['IT','true'],['TI','false'],['IOSZ','true'],['TOSZ','false'],['OSZJ','false'],['ITIT','true'],['TIIT','false']]),
 code('P4:D(T)\nP4:D(TS)\nP4:D(I<T,T)'),
 note(ko?'범위 밖의 미노를 읽지 않습니다. 후행 종류의 부재는 미래 출현을 보장하지 않습니다. 아직 보이지 않는 미노는 부재가 아닙니다. 미완료 관측창이나 사용창을 완료된 공급으로 취급하지 마세요.':'Do not inspect pieces outside the scope. An absent later kind is not a promise of future arrival. Hidden is not absent: an unfinished observation/use window must not be treated as a closed supply.')]);
 set(l,'compact','chain',ko?'조건 목록과 D/U':'Condition lists and D/U',[
 code('P7:D(I<T<S)\nP7:D(I<T,T<S)\nP7:D(I<T<S<I)\nP7:D(I<T)U(T<I)'),
 p(ko?'쉼표는 각 완전한 조건식을 AND로 연결합니다. I<T<S는 I<T와 T<S의 AND입니다. D는 공급 순서, U는 해당 공급 출처에 속한 사용 순서를 검사합니다. 두 영역을 같은 순환 그래프로 합치지 않습니다.':'Commas AND complete expressions. I<T<S means I<T AND T<S. D checks supply order; U checks the use-order projection for the same source scope. These domains must not share a contradiction graph.'),
 p(ko?'순환도 구문은 유효하지만 동일 범위의 엄격한 순환은 UNSAT입니다. 모순 미발견은 NOT_CHECKED이며 PC·홀드·배치 가능성의 증명이 아닙니다. 한도 소진은 INCOMPLETE이고 정확한 빈 결과와 다릅니다.':'A strict cycle is syntactically valid but proves UNSAT in its own scope. No proof means NOT_CHECKED, not PC/hold/placement legality. Resource exhaustion is INCOMPLETE, not an exact empty result.')]);
 set(l,'compact','counts',ko?'집합 크기와 구체적인 사례':'Counts and concrete cases',[
 table([ko?'패턴':'Pattern',ko?'서로 다른 공급 수':'Distinct supplies'],[['P4','840'],['P4:D(T)','480'],['P4:D(TS)','240'],['P4:D(I<T)','360'],['P4:D(I<T,T)','120'],['P4:D(I<TS)','272'],['P4:D(I<T>S)','176']]),
 p(ko?'표준 7종의 순수 패턴 집합이며 초기 상태·PC 성공률과 무관합니다. 반대 방향도 같은 개수가 나올 수 있으므로 참·거짓 표와 구체적인 큐를 함께 검증합니다.':'These are pure standard-kind sets, not initial-state filters or PC success rates. Reversed comparisons can have identical counts, so exact queues and truth-table members are checked too.')]);
 get[l].splice(get[l].findIndex(c=>c.slug==='compact')+1,0,{slug:'filters',title:ko?'논리 필터·구간·등장 차수':'Logic, windows and occurrences',kicker:'IMPLEMENTED / F1 + F2',summary:ko?'0.3.x에 구현된 &, |, !, 개수 비교, IN과 미노[n]의 정확한 의미와 오류를 설명합니다.':'Implemented in 0.3.x: &, |, !, count comparisons, IN windows and kind[n] selectors, including errors.',sections:[]});
 set(l,'filters','logic',ko?'논리 연산은 비트 연산이 아닙니다':'Logical, not bitwise operators',[
 code('P4:D(I<T&T)\nP4:D(I<T|S<Z)\nP4:D(!T)\nP4:D(!(I<T))\nP4:D((I<T|S<Z)&T)'),
 table([ko?'기호':'Symbol',ko?'의미':'Meaning'],[['&',ko?'논리 AND; C의 && 의미':'Logical AND; semantics of C &&'],['|',ko?'논리 OR; C의 || 의미':'Logical OR; semantics of C ||'],['!',ko?'논리 NOT; !T는 T 부재':'Logical NOT; !T requires T absent'],['()',ko?'조건식 묶음':'Boolean grouping']]),
 p(ko?'우선순위는 괄호·조건 원자, NOT, AND, OR입니다. 구문·지원 기능·모든 구간을 먼저 검사하고 유효한 조건만 왼쪽부터 단락 평가합니다. T|IN(1,5,I)는 P4에서 T가 있어도 범위 오류입니다.':'Precedence is grouped/atomic conditions, NOT, AND, OR. Validate the entire syntax, features and windows first; then short-circuit valid conditions left to right. T|IN(1,5,I) is a window error on P4 even when T is present.'),
 note(ko?'!(I<T)는 T<I와 다릅니다. 둘 다 없는 범위에서는 전자만 참입니다. !I<T는 추측해서 고치지 않고 거부합니다. 논리 연산이 C와 유사해도 미노 그룹·연쇄 비교와 쉼표 목록은 Tessembly의 계약입니다.':'!(I<T) is not T<I: with neither kind present, only the former is true. !I<T is rejected rather than guessed. Logical operators borrow C semantics, but kind groups, comparison chains and comma lists retain Tessembly semantics.')]);
 set(l,'filters','precedence',ko?'쉼표·괄호·연쇄의 구분':'Commas, grouping and chains',[
 table([ko?'입력':'Input',ko?'동등한 입력':'Equivalent'],[['D(I|T&S)','D(I|(T&S))'],['D(I|T,S)','D((I|T)&S)'],['D(I<T<S)','D(I<T&T<S)'],['D(I<T>S)','D(T>IS)']]),
 code('P4:D(I|T&S)\nP4:D(I|T,S)\nP4:D((I|T)&S)'),
 p(ko?'쉼표는 최상위 조건 목록 구분자입니다. 괄호로 묶는 Boolean 그룹 안에서는 &와 |를 쓰세요. IN·고급 함수의 쉼표는 그 함수의 인수 구분입니다. 의미가 다른 쉼표를 문자열 치환으로 합치지 않습니다.':'A comma separates outer condition-list items. Use & and | inside a Boolean grouping. Commas in IN and advanced calls delimit their arguments. Do not conflate these contexts by textual replacement.')]);
 set(l,'filters','count',ko?'종류별 개수와 단독 미노':'Per-kind counts and bare presence',[
 code('P4:D(T=1&S=0)\nP4:D(T!=0)\nP4:D(T<=0)\nP4:D(T>=1)'),
 table([ko?'형식':'Form',ko?'의미':'Meaning'],[['T',ko?'T가 한 번 이상':'At least one T'],['T=1',ko?'정확히 한 번':'Exactly one T'],['T=0 / !T',ko?'T 없음':'No T'],['T!=1',ko?'정확히 한 번이 아님':'Not exactly one T'],['T<2 / T<=2 / T>2 / T>=2',ko?'해당 종류 개수의 비교':'Comparison of the number of T occurrences']]),
 p(ko?'=는 대입이 아닌 개수 일치입니다. 숫자는 0~256의 정수이며 하나의 종류에만 적용합니다. TS=1은 그룹 합계가 아니므로 거부합니다. T[2]=1도 개수가 아닌 선택자이므로 거부합니다. 표준 7-bag 하나에서는 같은 종류가 한 번뿐이지만 여러 가방·커스텀 다중집합에는 개수 조건이 유용합니다.':'= tests equality, never assignment. Counts are integers from 0 to 256 for one kind. TS=1 is not a group total and is rejected; T[2]=1 is also rejected because an occurrence is not a kind count. One standard 7-bag has no repeated kind; counts are also useful across bags and in custom multisets.')]);
 set(l,'filters','window',ko?'IN: 공급을 유지한 채 일부 위치 검사':'IN: inspect positions without resampling',[
 code('P7:D(IN(1,3,T))\nP7:D(IN(2,5,I<T&T))\nP7:D(IN(1,3,T)&IN(4,7,I))'),
 p(ko?'IN(start,end,condition)은 1-based 양 끝 포함 구간입니다. IN(2,2,T)는 두 번째 위치의 T를 검사합니다. 원래 공급 길이·가방·후보 상관관계를 바꾸지 않습니다. P7:D(IN(1,3,T))를 P3:D(T)P4로 다시 생성하면 다른 집합이 됩니다.':'IN(start,end,condition) uses inclusive one-based bounds. IN(2,2,T) tests position two. It does not change supply length, bags or correlations. Resampling P7:D(IN(1,3,T)) as P3:D(T)P4 produces a different set.'),
 p(ko?'끝점은 현재 범위 안에 있어야 합니다. 0, 역전 구간, 확정 길이 밖의 위치는 INVALID_FILTER_WINDOW입니다. 자동으로 자르지 않습니다. 중첩 IN의 위치는 바로 바깥 구간 기준이고 구간 안의 미노 부재는 그 구간 안에서만 판단합니다.':'Bounds must fit the current scope. Zero, reversed bounds or positions beyond a known length produce INVALID_FILTER_WINDOW; no silent clipping. Nested IN bounds are relative to their immediate window, and absence is local to that window.'),
 note(ko?'F2 구간은 D 전용입니다. U의 IN은 UNSUPPORTED_USE_SELECTOR입니다. 아직 진행 중인 공급·관측을 완료된 구간으로 가장하지 마세요.':'F2 windows are D-only. IN in U returns UNSUPPORTED_USE_SELECTOR. Do not pass a still-open supply/observation as a closed window.')]);
 set(l,'filters','occurrence',ko?'미노[n]: 개체 ID가 아닌 등장 차수':'kind[n]: occurrence, not token identity',[
 code('{P7P7}:D(I[2]<T[2])\n{P7P7}:D(I[2]<T[2],T[2])\n{P7P7}:D(IN(5,12,T[2]<I))'),
 p(ko?'미노[n]은 현재 검사 범위에서 그 종류의 n번째 등장입니다. n은 1~256입니다. I는 I[1]과 같고 II는 종류 그룹의 중복 표기여서 I[2]가 아닙니다. IN 안에서는 해당 구간에서 다시 셉니다.':'kind[n] selects the nth occurrence inside the current inspection scope (n=1..256). I equals I[1]; repeated II remains a kind group, not I[2]. Inside IN, count again from that window.'),
 table([ko?'조건':'Condition',ko?'상태':'State',ko?'결과':'Result'],[['I[2]<T[2]',ko?'두 번째 I만 있음':'Only second I exists','true'],['I[2]<T[2]',ko?'두 번째 I가 없음':'No second I','false'],['I[2]<T[2],T[2]',ko?'두 번째 T가 없음':'No second T','false']]),
 p(ko?'번호가 전체 개체 출처나 홀드 ID를 의미하지 않습니다. U에서는 n>1 선택자를 거부합니다. n=1은 기존 최초 등장 표기와 동일합니다.':'The ordinal is not a global token-origin or hold ID. U rejects n>1 selectors; n=1 remains ordinary first-occurrence semantics.')]);
 set(l,'filters','errors',ko?'지원하지 않는 표기와 판정':'Unsupported spellings and outcomes',[
 table([ko?'거부하는 표기':'Rejected spelling',ko?'대신 사용할 표기':'Use instead'],[['T&&I / T||I','T&I / T|I'],['T==1','T=1'],['!I<T','!(I<T)'],['HAS(T) / D?(I<T)','T / D(I<T)'],['P4::D(T) / [=P4]:D(T)','P4:D(T) / {P4}:D(T)'],['TS=1',ko?'종류별 조건을 명시':'Write per-kind counts explicitly']]),
 p(ko?'구문 오류, 미지원 기능, 정확한 UNSAT, 아직 검사하지 않은 NOT_CHECKED, 한도 때문에 끝내지 못한 INCOMPLETE를 구분합니다. OR의 불가능한 한 가지가 다른 가지를 삭제하지 않고 NOT나 서로 다른 구간을 하나의 긍정 순환 그래프로 합치지 않습니다.':'Distinguish invalid syntax, unsupported features, proven UNSAT, NOT_CHECKED and budget-limited INCOMPLETE. One impossible OR branch must not delete surviving branches; NOT and different windows must not leak into one positive cycle graph.')]);
 chapter(l,'advanced').summary=ko?'함수형 선언으로 공급·환경·F1/F2 조건을 보존합니다. 고급 표기는 단축 문법과 같은 관계 모델을 사용합니다.':'Preserve supply, environment and F1/F2 conditions in declarative calls, using the same relation model as compact syntax.';
 section(l,'advanced','structure').blocks[0]=code(example);
 set(l,'advanced','relations',ko?'동일한 논리식과 명시적 함수':'One condition model, explicit calls',[
 table([ko?'단축 조건':'Compact condition',ko?'고급 표기':'Advanced form'],[['T','present("T")'],['I<T','before("I","T")'],['T[2]','present(nth("T",2))'],['I[2]<T','before(nth("I",2),"T")'],['T=2','count("T","=",2)'],['I&T / I|T','all(present("I"),present("T")) / any(present("I"),present("T"))'],['!T','not(present("T"))'],['IN(1,3,T)','within(1,3,present("T"))']]),
 code('tessembly "tessembly.rfc3.order.v1";\nconfig { registry=["PENTO_P"]; rule=from_source; }\nsupply(take(8, bag(["I","PENTO_P","PENTO_P"])));\ndraw(all(count("PENTO_P",">=",2),before(nth("PENTO_P",2),"I")));'),
 p(ko?'draw/use는 표준 종류의 논리식을 직접 받거나 위 함수형 표기를 받습니다. 출력기는 all/any/not/count/within/nth/before/present를 명시적으로 출력합니다. before(A,B)는 언제나 A 선행입니다. 함수 인수 수·종류·등록된 ID를 검사하며 함수를 실행하지 않습니다.':'draw/use accept standard-kind conditions directly or the explicit forms above. Formatting uses all/any/not/count/within/nth/before/present. before(A,B) always means A first. Argument counts/types and registered IDs are validated; these calls are data, not executable functions.'),
 note(ko?'사용자 정의 ID는 registry에 등록하고 문자열로 적습니다. 이 예시는 커스텀 가방이며 표준 7-bag가 아닙니다. 공급 관련 함수의 숫자·문자열 안에 있는 기호를 부등호 이관으로 치환하지 않습니다.':'Register custom IDs and quote them. This example is a custom bag, not standard 7-bag. Comparator migration must not rewrite symbols inside unrelated string values.')]);
 set(l,'advanced','references',ko?'기존 참조 선언의 호환성 경계':'Compatibility boundary of existing references',[
 note(ko?'기본 reference/select 레코드는 기존 파일의 호환성을 위해 읽고 보존합니다. 새 공급 입력에는 필요하지 않습니다. Q1·M1·MATCH나 QB/OQB 전용 탐색 문법은 추가하지 않았으며 권장 공급 문법에 포함하지 않습니다.':'Basic reference/select records remain readable for existing-file compatibility; new supply inputs do not need them. No Q1/M1/MATCH or QB/OQB-specific search syntax has been added or recommended.'),
 p(ko?'reference는 고유 ID와 format/value, 선택적인 page/revision을 저장합니다. select는 기존 reference ID 목록과 오름차순 at 값을 저장합니다. 이를 읽는다는 사실은 자료 조회·셋업 선택·정책 탐색 지원을 뜻하지 않습니다. 셋업·평가값·데이터셋 로직은 소비자 문서가 Tessembly 공급을 감싸는 방식으로 관리하세요.':'reference stores an ID, format/value and optional page/revision. select preserves existing reference IDs and ordered at values. Reading these records does not fetch resources or perform setup/policy search. Keep setup goals, metrics and dataset logic in a consumer-owned envelope around supply data.')]);
 set(l,'quickstart','first',ko?'처음 쓰는 한 줄':'Your first pattern',[
 code('P4:D(I<T,T)'),p(ko?'표준 7종에서 중복 없이 4개를 공급합니다. I가 T보다 먼저이고 T도 있어야 합니다. <는 먼저, >는 나중입니다. 마지막 ,T를 빼면 T가 없는 범위에서 I가 있는 경우도 통과합니다.':'Supply four distinct standard kinds. I must precede T and T must be present. < means earlier; > means later. Removing ,T also permits scopes containing I but no T.'),
 note(ko?'이 사이트는 저장소의 0.3.x 구현을 설명합니다. npm의 dist-tag는 별도 배포 상태입니다. 새 기호가 거부되면 설치 버전을 확인하세요. 0.1.x의 반대 비교 방향은 명시적으로 이관해야 합니다.':'This site documents the repository 0.3.x implementation; the npm dist-tag is a separate release state. Check the installed version if new symbols are rejected. The reversed 0.1.x comparator requires explicit migration.')]);
 section(l,'quickstart','build').blocks[0]=p(ko?'Rust 1.85.0과 커밋된 Cargo.lock을 사용합니다. 네이티브 라이브러리·CLI 실행에는 Python이나 Node가 필요하지 않습니다. Node는 npm 사용과 문서·일부 개발용 연결 시험에 사용합니다.':'Use Rust 1.85.0 and the committed Cargo.lock. Native libraries/CLI need no Python or Node at runtime. Node is used for npm consumers, documentation and some developer transport tests.');
 section(l,'quickstart','advanced').blocks[0]=code(example);
 section(l,'quickstart','advanced').blocks[2]=p(ko?'IN은 1~3번째 공급을 검사하고 마지막 T는 전체 범위의 존재를 요구합니다. 고급 문서는 의미 헤더·환경·공급·관계를 저장합니다. 검사 통과가 배치 성공을 뜻하지 않습니다.':'IN inspects supply positions 1..3 and final T requires presence in the whole scope. Advanced documents store the profile, environment, supply and relationships. Validation is not a placement-success proof.');
 set(l,'scope','owns',ko?'공급 형식의 책임':'Responsibilities of the supply format',[
 p(ko?'Tessembly는 Clearra와 유사한 큐 입력·내부 구조를 바탕으로 공급열, 공급 상태, 공개 범위, D/U 관계를 파싱·검사·정형화·교환합니다. F1/F2는 이미 구현된 공급 조건이며 검토 중인 계획이 아닙니다.':'Tessembly follows Clearra-like queue inputs and structure to parse, validate, normalize and exchange supplies, supply state, visibility and D/U relations. F1/F2 are implemented supply constraints, not review plans.'),
 p(ko?'셋업 선택·PC 목표·평가값·정책 그래프·외부 데이터셋 계약은 공급 밖입니다. Q1/M1 및 MATCH는 추가하지 않습니다. 기존 reference/select는 호환 레코드로만 보존하고 기능 확장을 위한 진입점으로 삼지 않습니다.':'Setup selection, PC objectives, metric values, policy graphs and dataset contracts are outside supply. Q1/M1 and MATCH are not added. Existing reference/select records remain compatibility data, not a gateway to policy expansion.')]);
 set(l,'scope','versions',ko?'기능 지원과 의미 버전':'Capabilities and semantic versions',[
 p(ko?'RFC3는 < 선행을 고정합니다. F1/F2는 filters.logic.v1, filters.count.v1, filters.window.v1, filters.occurrence.v1 기능으로 구분합니다. 미지원 필수 관계는 거부해야 합니다. 문서 wire=1·의미=3과 npm Wasm ABI=3은 서로 다른 계약입니다.':'RFC3 fixes < as earlier. F1/F2 capabilities are filters.logic.v1, filters.count.v1, filters.window.v1 and filters.occurrence.v1. Unknown mandatory relations must fail. Wire=1/semantic=3 and npm Wasm ABI=3 are different contracts.'),
 p(ko?'완료된 사용자 안내만 Pages에 게시합니다. 미구현 제안은 대화에서 검토하며 사이트에는 올리지 않습니다. RFC2 자료는 이관 도구로 처리하고 헤더 없는 문자열의 원래 버전을 추측하지 않습니다.':'Pages publishes implemented-user documentation, not unimplemented proposals. Use migration for RFC2 data; never infer the historical version of an unlabelled snippet.')]);
 set(l,'tools','run',ko?'세 도구, 필요한 계약만 선택':'Three optional tools, choose your contract',[
 p(ko?'tessembly-tck는 기본 단축·홀드, tessembly-document-tck는 고급 문서, tessembly-filter-tck는 F1/F2 공급 조건을 검사합니다. 외부 개발자가 실제 프로그램의 입출력 경계에 연결하는 선택적 도구입니다. npm 제품 런타임에는 포함하지 않습니다.':'tessembly-tck checks basic compact/hold contracts; tessembly-document-tck checks documents; tessembly-filter-tck checks F1/F2 supply conditions. External developers connect these optional tools to real application ingress/egress. They are not included in the npm product runtime.'),
 code('cargo build --locked --workspace\ntarget/debug/tessembly-tck --report compact-report.json -- YOUR_HOST test-port\ntarget/debug/tessembly-document-tck --report document-report.json -- YOUR_HOST doc-port\ntarget/debug/tessembly-filter-tck --report filter-report.json -- YOUR_HOST test-port','shell'),
 p(ko?'YOUR_HOST를 신뢰하는 실행 파일로 바꾸세요. Windows에는 .exe를 붙입니다. 단축·필터 포트는 동일한 test-port를 사용하고 기능 ID를 확인합니다. 다른 TCK를 테스트하는 검증기나 외부 앱 인증 서비스가 아닙니다.':'Replace YOUR_HOST with a trusted executable; add .exe on Windows. Basic and filter suites use the same test-port with explicit feature IDs. These test actual format boundaries, not other validators, and do not certify arbitrary external applications.')]);
 section(l,'tools','connect').blocks[0]=code(JSON.stringify({id:1,protocol:'tessembly.document-test-port.v1',profile:'tessembly.rfc3.order.v1',op:'validate',text:'tessembly "tessembly.rfc3.order.v1"; supply("P7"); draw(IN(1,3,T)&I<T);'}),'json');
 section(l,'integrators','tck').blocks[0]=code('cargo build --locked --workspace\ntarget/debug/tessembly-tck --report report.json -- my-host test-port\ntarget/debug/tessembly-filter-tck --report filters.json -- my-host test-port','shell');
 section(l,'integrators','tck').blocks[2]=code(JSON.stringify({id:1,protocol:'tessembly.test-port.v1',profile:'tessembly.rfc3.order.v1',op:'compile',text:'P4:D(I<T&T)'}),'json');
 set(l,'integrators','datasets',ko?'호스트가 공급을 감싸는 방식':'Consumer-owned integration envelope',[
 p(ko?'외부 프로그램이 파일·DB에서 공급을 가져와 Tessembly에 전달합니다. 조회·캐시·셋업·성공률·정책 인덱스는 호스트가 관리합니다. Tessembly는 제공받은 공급과 관계의 의미만 처리하고 Q1/M1/MATCH를 새로 제공하지 않습니다.':'Consumers load supplies from files/databases and pass them to Tessembly. Lookup, caching, setups, success metrics and policy indices remain host-owned. Tessembly processes supplied data and relations; it adds no Q1/M1/MATCH layer.'),
 p(ko?'필수 조건을 지원하지 못하면 UNSUPPORTED를 반환하세요. 그 조건을 삭제하거나 큰 공급집합으로 바꾸면 동등 변환이 아닙니다. 공급 입력·홀드·공개 정보의 대응 시험은 실제 어댑터 경로에 연결해야 합니다.':'Return UNSUPPORTED for a required condition you cannot interpret. Dropping it or widening the supply is not equivalent conversion. Test supply/hold/visibility through the actual adapter path.')]);
 section(l,'integrators','boundary').blocks[0].rows.find(r=>r[0]==='tessembly-relations')[1]=ko?'논리·개수·구간·등장 관계와 국소 모순 증명':'Logic/count/window/occurrence evaluation and local proofs';
 set(l,'wire','filters',ko?'F1/F2의 구조적 필터 확장':'Structural F1/F2 extension',[
 p(ko?'기존 Present/Before는 그대로입니다. 새로운 필터는 필수 관계 tag=2와 길이가 붙은 TSFL 버전 1 payload에 저장합니다. 노드는 Present, Before, Count, All, Any, Not, In이며 선택자는 종류 ID와 1-based 차수를 보존합니다. 원문 재파싱이나 지수적인 DNF/CNF 전개를 하지 않습니다.':'Existing Present/Before atoms remain unchanged. New filters use mandatory relation tag=2 with a length-prefixed TSFL v1 payload. Nodes are Present, Before, Count, All, Any, Not and In; selectors preserve kind IDs and one-based ordinals. No source reparse or exponential DNF/CNF expansion.'),
 note(ko?'이 확장을 모르는 이전 독자는 거부해야 합니다. 파일 wire=1/의미=3은 유지되지만 필수 관계 기능이 늘었습니다. npm wrapper와 Wasm은 ABI=3으로 일치해야 하며 이전 ABI=2 자산의 혼용을 거부합니다.':'Older readers that do not understand this extension must reject it. Wire=1/semantic=3 remain, but required relation capabilities expanded. npm wrapper and Wasm must match ABI=3; ABI=2 asset mixing is rejected.')]);
 const m=chapter(l,'migration');m.kicker='PROFILE / MIGRATION';
 for(const s of m.sections)for(const b of s.blocks)if(b.text)b.text=b.text.replaceAll('Wasm ABI 2','Current Wasm ABI 3').replaceAll('Wasm ABI=2','현재 Wasm ABI=3').replaceAll('0.2.0 candidate','0.3.x implementation').replaceAll('0.2.0 후보','0.3.x 구현');
 for(const c of get[l])for(const s of c.sections)for(const b of s.blocks)if(b.text)b.text=b.text.replaceAll('0.2.0.tgz','0.3.0.tgz').replaceAll('0.1.2.tgz','0.3.0.tgz');
}
function sourceArray(name,slugs){const cs=slugs.map(s=>chapter('ko',s));return '/** @type {import("./types").Chapter[]} */\nexport const '+name+' = '+JSON.stringify(cs,null,2)+';\n';}
for(const [file,name,slugs] of [['start','start',['quickstart','scope']],['compact','compact',['compact']],['filters','filters',['filters']],['advanced','advanced',['advanced']],['state','state',['state']],['integration','integration',['wire','integrators']],['tools','tools',['tools']]])fs.writeFileSync('apps/docs/src/lib/content/'+file+'.js',sourceArray(name,slugs));
let src='// Explicit translations; missing entries fail the content build.\nexport const english = {\n';
for(const slug of ['quickstart','scope','compact','filters','advanced','state','wire','integrators','tools']){
 const c=chapter('en',slug);src+=JSON.stringify(slug)+':'+JSON.stringify({title:c.title,summary:c.summary,sections:Object.fromEntries(c.sections.map(s=>[s.id,[s.title,s.blocks.map(b=>b.kind==='code'?null:b.kind==='table'?{headers:b.headers,rows:b.rows}:b.kind==='list'?b.items:b.text)]]))})+',\n';
}
src+='};\nexport function translateChapter'+fs.readFileSync('apps/docs/src/lib/content/english.js','utf8').split('export function translateChapter')[1];fs.writeFileSync('apps/docs/src/lib/content/english.js',src);
for(const [file,name,slugs] of [['migration','migrationChapters',['migration']],['npm','npmChapters',['npm']],['security-platforms','securityPlatformChapters',['platforms','security']]]){
 const content=Object.fromEntries(['en','ko'].map(l=>[l,slugs.map(s=>chapter(l,s))]));if(name==='npmChapters')for(const l of ['en','ko'])content[l]=content[l][0];
 fs.writeFileSync('apps/docs/src/lib/content/'+file+'.js','/** @type {'+(name==='npmChapters'?'Record<string,import("./types").Chapter>':'Record<string,import("./types").Chapter[]>')+'} */\nexport const '+name+' = '+JSON.stringify(content,null,2)+';\n');
}
fs.unlinkSync('apps/docs/src/lib/content/review.js');
fs.writeFileSync('apps/docs/src/lib/content/index.js',`import { migrationChapters } from './migration.js';
import { start } from './start.js';
import { compact } from './compact.js';
import { filters } from './filters.js';
import { advanced } from './advanced.js';
import { state } from './state.js';
import { integration } from './integration.js';
import { tools } from './tools.js';
import { translateChapter } from './english.js';
import { npmChapters } from './npm.js';
import { securityPlatformChapters } from './security-platforms.js';
/** @type {import('./types').Chapter[]} */
export const chapters = [start[0], ...compact, ...filters, ...advanced, ...state, ...integration, ...tools, npmChapters.ko, ...securityPlatformChapters.ko, ...migrationChapters.ko, start[1]];
const translated = chapters.map(c => c.slug === 'npm' ? npmChapters.en : (securityPlatformChapters.en.find(x => x.slug === c.slug) ?? migrationChapters.en.find(x => x.slug === c.slug) ?? translateChapter(c)));
export function getChapters(locale) { return locale === 'ko' ? chapters : translated; }
`);
for(const file of ['apps/docs/src/lib/content/npm.js','apps/docs/src/lib/content/security-platforms.js','packages/npm/README.md','packages/npm/README.ko.md','docs/PUBLISHING.md'])fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('0.2.0','0.3.0').replaceAll('RFC3 comparator-alignment candidate','implemented F1/F2 supply-filter candidate'));
fs.writeFileSync('apps/docs/src/lib/i18n.js',fs.readFileSync('apps/docs/src/lib/i18n.js','utf8').replace('RFC3 · document v1','0.3.x · RFC3').replace('RFC3 · 문서 v1','0.3.x · RFC3'));
for(const lang of ['en','ko'])fs.unlinkSync(`docs/plans/FILTERS_QB_OQB.${lang}.md`);
console.log('Updated implemented bilingual chapters; no Q1/M1/MATCH added.');
