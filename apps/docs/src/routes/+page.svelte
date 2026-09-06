<script>
  import { base } from '$app/paths';
  import CodeBlock from '$lib/CodeBlock.svelte';
  const sample = 'P4:D(I<TS)';
</script>
<svelte:head><title>Tessembly — 미노 공급을 위한 공통 형식</title><meta name="description" content="Clearra 확장 문법, 고급 선언, 바이너리 교환, 외부 개발자용 적합성 테스트를 설명하는 테섬블리 공식 문서." /></svelte:head>
<section class="hero">
  <div class="eyebrow"><span class="status-dot"></span>TETRIS SUPPLY LANGUAGE</div>
  <h1>미노 공급을<br /><span>하나의 형식으로.</span></h1>
  <p class="hero-lead">큐와 패턴, 순서와 관측 조건을 명확하게.<br class="desktop-break" />작은 Rust 라이브러리로 작성하고 검증하고 교환하세요.</p>
  <div class="hero-actions"><a class="button primary" href={base + '/quickstart/'}>시작하기 <span aria-hidden="true">→</span></a><a class="button secondary" href={base + '/compact/'}>문법 살펴보기</a></div>
</section>
<div class="example-panel"><div><span class="eyebrow">ONE PATTERN. PRECISE MEANING.</span><h2>짧게 쓰고,<br />정확하게 전달합니다.</h2><p>T와 S는 I보다 먼저.<br />T와 S 사이의 순서는 자유롭게.</p><span class="example-label">결정론적인 공급 집합 · 난수 파싱 없음</span></div><div><CodeBlock text={sample} /><div class="mino-row" aria-label="T와 S가 I보다 먼저"><span class="mino purple">T</span><span class="mino green">S</span><span class="mino-arrow" aria-hidden="true">→</span><span class="mino cyan">I</span><span class="mino-comment">그룹 안의 순서는 무관</span></div></div></div>
<section class="overview"><div class="section-top"><span class="eyebrow">A SMALL, COMPOSABLE FORMAT</span><h2>필요한 만큼만 사용하세요.</h2></div><div class="feature-grid"><a class="feature-card" href={base + '/compact/'}><span class="card-index">01 / WRITE</span><h3>익숙한 입력의 확장</h3><p>기존 큐·패턴에 D·U 조건을 붙입니다. 중괄호로 적용 범위를 명시합니다.</p><span class="card-link">단축 문법 →</span></a><a class="feature-card" href={base + '/advanced/'}><span class="card-index">02 / DESCRIBE</span><h3>정형화된 고급 선언</h3><p>커스텀 가방, 관측, 홀드, 외부 참조를 실행 코드가 아닌 데이터로 선언합니다.</p><span class="card-link">고급 문법 →</span></a><a class="feature-card" href={base + '/integrators/'}><span class="card-index">03 / CONNECT</span><h3>자신의 프로그램과 연결</h3><p>필요한 크레이트를 선택하고 외부 개발자용 적합성 도구로 요청 경계를 시험합니다.</p><span class="card-link">연동 가이드 →</span></a></div></section>
<aside class="home-boundary"><span class="eyebrow">CLEAR BOUNDARIES</span><h2>형식을 제공하고, 실행을 강제하지 않습니다.</h2><p>테섬블리는 PC 탐색기나 리플레이 엔진이 아닙니다. Clearra·CTK3·HF 등의 실제 연결과 데이터셋 조회는 사용자 또는 외부 개발자가 담당합니다.</p><a href={base + '/scope/'}>프로젝트의 책임 경계 읽기 →</a></aside>
