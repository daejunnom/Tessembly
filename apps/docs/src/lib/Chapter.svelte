<script>
  import { base } from '$app/paths';
  import Article from './Article.svelte';
  import { ui, documentPath } from './i18n.js';
  export let data;
  $: locale=data.locale==='ko'?'ko':'en';
  $: s=ui[locale];
</script>
<svelte:head><title>{data.chapter.title} — Tessembly</title><meta name="description" content={data.chapter.summary} /><link rel="alternate" hreflang="en" href={'https://daejunnom.github.io'+documentPath(base,'en',data.chapter.slug)} /><link rel="alternate" hreflang="ko" href={'https://daejunnom.github.io'+documentPath(base,'ko',data.chapter.slug)} /></svelte:head>
<Article chapter={data.chapter} />
<nav class="chapter-pagination" aria-label={locale==='ko'?'이전 다음 문서':'Previous and next chapters'}>
  {#if data.previous}<a href={documentPath(base,locale,data.previous.slug)}><span>{s.previous}</span><strong>{data.previous.title}</strong></a>{:else}<span></span>{/if}
  {#if data.next}<a class="next" href={documentPath(base,locale,data.next.slug)}><span>{s.next}</span><strong>{data.next.title}</strong></a>{/if}
</nav>
