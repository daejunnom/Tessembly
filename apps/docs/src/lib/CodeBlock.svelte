<script lang="ts">
  export let text: string;
  export let language = 'tessembly';
  let copied = false;
  let message = '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      message = '코드를 복사했습니다.';
    } catch {
      message = '자동 복사를 사용할 수 없습니다. 코드를 선택해 복사하세요.';
    }
  }
</script>
<div class="code-block">
  <div class="code-label"><span>{language}</span><button type="button" on:click={copy} aria-label="코드 복사">{copied ? '복사됨' : '복사'}</button></div>
  <pre tabindex="0"><code>{text}</code></pre>
  <span class="sr-only" aria-live="polite">{message}</span>
</div>
