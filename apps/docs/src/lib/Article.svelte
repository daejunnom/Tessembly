<script lang="ts">
  import { page } from '$app/stores';
  import CodeBlock from './CodeBlock.svelte';
  import type { Chapter } from './content/types';
  import { ui } from './i18n.js';
  export let chapter: Chapter;
  $: s = ui[$page.params.lang === 'ko' ? 'ko' : 'en'];
</script>
<article>
  <header class="article-header"><p class="eyebrow">{chapter.kicker}</p><h1>{chapter.title}</h1><p class="lead">{chapter.summary}</p></header>
  <nav class="on-this-page" aria-label={s.toc}><span>{s.toc}</span>{#each chapter.sections as section}<a href={'#'+section.id}>{section.title}</a>{/each}</nav>
  {#each chapter.sections as section}
    <section id={section.id} class="doc-section">
      <h2><a href={'#'+section.id}>{section.title}<span aria-hidden="true"> #</span></a></h2>
      {#each section.blocks as block}
        {#if block.kind==='code'}<CodeBlock text={block.text ?? ''} language={block.language ?? 'tessembly'} />
        {:else if block.kind==='table'}
          <div class="table-wrap" role="region" aria-label={section.title+' '+s.table}>
            <table><thead><tr>{#each block.headers ?? [] as h}<th scope="col">{h}</th>{/each}</tr></thead><tbody>{#each block.rows ?? [] as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}</tbody></table>
          </div>
        {:else if block.kind==='note'}<aside class="note"><span class="note-heading">{s.note}</span><p>{block.text}</p></aside>
        {:else if block.kind==='list'}<ul>{#each block.items ?? [] as item}<li>{item}</li>{/each}</ul>
        {:else}<p>{block.text}</p>{/if}
      {/each}
    </section>
  {/each}
</article>
