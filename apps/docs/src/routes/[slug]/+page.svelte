<script>
  import { base } from '$app/paths';
  import Article from '$lib/Article.svelte';
  export let data;
</script>
<svelte:head><title>{data.chapter.title} — Tessembly</title><meta name="description" content={data.chapter.summary} /></svelte:head>
<Article chapter={data.chapter} />
<nav class="chapter-pagination" aria-label="이전 다음 문서">
  {#if data.previous}<a href={base + '/' + data.previous.slug + '/'}><span>← 이전</span><strong>{data.previous.title}</strong></a>{:else}<span></span>{/if}
  {#if data.next}<a class="next" href={base + '/' + data.next.slug + '/'}><span>다음 →</span><strong>{data.next.title}</strong></a>{/if}
</nav>
