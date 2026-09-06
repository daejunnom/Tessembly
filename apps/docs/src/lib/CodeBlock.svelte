<script lang="ts">
  import { page } from '$app/stores';
  import { ui } from './i18n.js';
  export let text = '';
  export let language = 'tessembly';
  let message = '';
  $: s = ui[$page.params.lang === 'ko' ? 'ko' : 'en'];
  async function copy() {
    try { await navigator.clipboard.writeText(text); message = s.copyOk; }
    catch { message = s.copyFailed; }
  }
</script>
<div class="code-block">
  <div class="code-label"><span>{language}</span><button type="button" on:click={copy} aria-label={s.copy}>{message === s.copyOk ? s.copied : s.copy}</button></div>
  <pre tabindex="0" role="textbox" aria-readonly="true" aria-label={s.code}><code>{text}</code></pre>
  <span class="sr-only" aria-live="polite">{message}</span>
</div>
