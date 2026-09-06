<script>
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { ui,documentPath } from '$lib/i18n.js';
  $: locale=$page.params.lang==='ko'?'ko':'en';
  $: s=ui[locale];
</script>
<svelte:head><title>{$page.status} — Tessembly</title></svelte:head>
<section class="article-header"><p class="eyebrow">{$page.status}</p><h1>{s.notFound}</h1><a href={documentPath(base,locale)}>{s.back}</a></section>
