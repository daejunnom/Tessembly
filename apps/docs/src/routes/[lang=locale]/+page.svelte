<script>import Home from '$lib/Home.svelte'; export let data;</script>
<Home locale={data.locale==='ko'?'ko':'en'} />
