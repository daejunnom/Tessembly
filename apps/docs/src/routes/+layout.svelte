<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { goto, afterNavigate } from '$app/navigation';
  import { getChapters } from '$lib/content/index.js';
  import { ui, languageOf, documentPath } from '$lib/i18n.js';
  import '../app.css';
  let query = ''; let menuOpen = false;
  $: locale = $page.params.lang === 'ko' ? 'ko' : 'en';
  $: s = ui[locale];
  $: chapters = getChapters(locale);
  $: needle = query.trim().toLocaleLowerCase(locale);
  $: filtered = chapters.filter(c => !needle || [c.title,c.summary,...c.sections.flatMap(section=>[section.title,...section.blocks.flatMap(b=>[b.text??'',...(b.rows??[]).flat()])])].join(' ').toLocaleLowerCase(locale).includes(needle));
  function autoLanguage() { return languageOf(navigator.language || Intl.DateTimeFormat().resolvedOptions().locale); }
  function switchLanguage(value: string) {
    const lang = value === 'auto' ? autoLanguage() : languageOf(value);
    try { if(value==='auto') localStorage.removeItem('tessembly.language'); else localStorage.setItem('tessembly.language',lang); } catch { /* Storage may be disabled. URL selection still works. */ }
    query=''; menuOpen=false;
    void goto(documentPath(base,lang,$page.params.slug??'')+$page.url.search+$page.url.hash);
  }
  onMount(()=>{
    if($page.params.lang) return;
    let saved: string|null=null; try { saved=localStorage.getItem('tessembly.language'); } catch { /* Use browser primary language. */ }
    const lang=saved==='ko'||saved==='en'?saved:autoLanguage();
    void goto(documentPath(base,lang,$page.params.slug??'')+$page.url.search+$page.url.hash,{replaceState:true});
  });
  afterNavigate(()=>{ menuOpen=false; document.documentElement.lang=$page.params.lang==='ko'?'ko':'en'; });
</script>
<a class="skip-link" href="#main">{s.skip}</a>
<header class="topbar">
  <a class="brand" href={documentPath(base,locale)} aria-label={s.home}><span class="brand-mark" aria-hidden="true">T</span><span>Tessembly<span class="brand-sub">{s.docs}</span></span></a>
  <div class="top-actions"><span class="version-badge">{s.version}</span>
    <label class="sr-only" for="language-select">{s.language}</label><select id="language-select" class="language-select" value={locale} on:change={event=>switchLanguage(event.currentTarget.value)}><option value="en">English</option><option value="ko">한국어</option><option value="auto">{s.auto}</option></select>
    <a class="github-link" href="https://github.com/daejunnom/Tessembly">GitHub <span aria-hidden="true">↗</span></a>
    <button class="menu-button" type="button" aria-controls="docs-nav" aria-expanded={menuOpen} on:click={()=>menuOpen=!menuOpen}>{menuOpen?s.close:s.menu}</button>
  </div>
</header>
<noscript><p class="noscript-language"><a href={documentPath(base,'en',$page.params.slug??'')}>English</a> · <a href={documentPath(base,'ko',$page.params.slug??'')}>한국어</a></p></noscript>
<div class="shell">
  <aside id="docs-nav" class:open={menuOpen} class="sidebar">
    <label for="docs-search" class="search-label">{s.search}</label><div class="search-box"><span aria-hidden="true">⌕</span><input id="docs-search" bind:value={query} type="search" placeholder={s.placeholder} autocomplete="off" /></div>
    <nav aria-label={s.nav}><p class="nav-heading">GUIDE & REFERENCE</p>
      {#each filtered as chapter}<a href={documentPath(base,locale,chapter.slug)} class:active={$page.params.slug===chapter.slug} aria-current={$page.params.slug===chapter.slug?'page':undefined} on:click={()=>menuOpen=false}><span class="nav-dot" aria-hidden="true"></span>{chapter.title}</a>{/each}
      {#if filtered.length===0}<p class="no-results" role="status">{s.none}</p>{/if}
    </nav>
    <div class="sidebar-note"><span class="status-dot"></span><strong>{s.small}</strong><p>{s.tagline}<br />{s.boundary}</p></div>
  </aside>
  <main id="main"><div class="content"><slot /></div><footer><span>{s.footer}</span><a href="https://github.com/daejunnom/Tessembly/tree/main/apps/docs">{s.source} ↗</a></footer></main>
</div>
<style>
  .language-select {font:inherit;max-width:110px;border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#fff;color:#172033;}
  .noscript-language {padding:10px;text-align:center;}
  @media(max-width:640px){.version-badge{display:none}.language-select{max-width:92px;font-size:13px}}
</style>
