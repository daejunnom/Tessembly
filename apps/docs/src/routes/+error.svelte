<script>import { base } from '$app/paths'; import { page } from '$app/stores';</script>
<svelte:head><title>문서를 찾을 수 없습니다 — Tessembly</title></svelte:head>
<section class="article-header"><p class="eyebrow">{$page.status}</p><h1>문서를 찾을 수 없습니다.</h1><p class="lead">주소를 확인하거나 목차에서 문서를 선택해 주세요.</p><a class="button primary" href={base + '/'}>문서 홈</a></section>
