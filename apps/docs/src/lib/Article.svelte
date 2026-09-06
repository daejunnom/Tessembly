<script lang="ts">
  import CodeBlock from './CodeBlock.svelte';
  import type { Chapter } from './content/types';
  export let chapter: Chapter;
</script>
<article>
  <header class="article-header">
    <p class="eyebrow">{chapter.kicker}</p>
    <h1>{chapter.title}</h1>
    <p class="lead">{chapter.summary}</p>
  </header>
  <nav class="on-this-page" aria-label="이 페이지의 목차">
    <span>이 페이지</span>
    {#each chapter.sections as section}<a href={'#' + section.id}>{section.title}</a>{/each}
  </nav>
  {#each chapter.sections as section}
    <section id={section.id} class="doc-section">
      <h2><a href={'#' + section.id}>{section.title}<span aria-hidden="true"> #</span></a></h2>
      {#each section.blocks as block}
        {#if block.kind === 'code'}
          <CodeBlock text={block.text ?? ''} language={block.language ?? 'tessembly'} />
        {:else if block.kind === 'table'}
          <div class="table-wrap" tabindex="0" role="region" aria-label={section.title + ' 표'}>
            <table><thead><tr>{#each block.headers ?? [] as h}<th scope="col">{h}</th>{/each}</tr></thead>
              <tbody>{#each block.rows ?? [] as row}<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>{/each}</tbody>
            </table>
          </div>
        {:else if block.kind === 'note'}
          <aside class="note"><span class="note-heading">기억할 점</span><p>{block.text}</p></aside>
        {:else if block.kind === 'list'}
          <ul>{#each block.items ?? [] as item}<li>{item}</li>{/each}</ul>
        {:else}<p>{block.text}</p>{/if}
      {/each}
    </section>
  {/each}
</article>
