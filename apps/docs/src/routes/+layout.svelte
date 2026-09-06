<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { chapters } from '$lib/content/index.js';
  import '../app.css';
  let query = '';
  let menuOpen = false;
  $: needle = query.trim().toLocaleLowerCase();
  $: filtered = chapters.filter((c) => !needle || [c.title, c.summary, ...c.sections.flatMap((s) => [s.title, ...s.blocks.map((b) => b.text ?? '')])].join(' ').toLocaleLowerCase().includes(needle));
</script>
<a class="skip-link" href="#main">본문으로 건너뛰기</a>
<header class="topbar">
  <a class="brand" href={base + '/'} aria-label="Tessembly 홈"><span class="brand-mark" aria-hidden="true">T</span><span>Tessembly<span class="brand-sub">문서</span></span></a>
  <div class="top-actions"><span class="version-badge">RFC2 · 문서 v1</span><a class="github-link" href="https://github.com/daejunnom/Tessembly">GitHub <span aria-hidden="true">↗</span></a><button class="menu-button" type="button" aria-controls="docs-nav" aria-expanded={menuOpen} on:click={() => menuOpen = !menuOpen}>{menuOpen ? '닫기' : '메뉴'}</button></div>
</header>
<div class="shell">
  <aside id="docs-nav" class:open={menuOpen} class="sidebar">
    <label for="docs-search" class="search-label">문서 검색</label>
    <div class="search-box"><span aria-hidden="true">⌕</span><input id="docs-search" bind:value={query} type="search" placeholder="문법, 홀드, 바이너리…" autocomplete="off" /></div>
    <nav aria-label="문서 탐색">
      <p class="nav-heading">GUIDE & REFERENCE</p>
      {#each filtered as chapter, i}
        <a href={base + '/' + chapter.slug + '/'} class:active={$page.url.pathname === base + '/' + chapter.slug + '/'} aria-current={$page.url.pathname === base + '/' + chapter.slug + '/' ? 'page' : undefined} on:click={() => menuOpen = false}><span class="nav-dot" aria-hidden="true"></span>{chapter.title}</a>
      {/each}
      {#if filtered.length === 0}<p class="no-results" role="status">일치하는 문서가 없습니다.</p>{/if}
    </nav>
    <div class="sidebar-note"><span class="status-dot"></span><strong>형식은 작게. 연결은 자유롭게.</strong><p>파싱 · 검증 · 교환<br />탐색과 데이터 연동은 소비자에게.</p></div>
  </aside>
  <main id="main"><div class="content"><slot /></div><footer><span>Tessembly · 미노 공급을 위한 공통 형식</span><a href="https://github.com/daejunnom/Tessembly/tree/main/apps/docs">문서 소스 ↗</a></footer></main>
</div>
