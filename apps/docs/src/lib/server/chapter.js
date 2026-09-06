import { error } from '@sveltejs/kit';
import { getChapters } from '../content/index.js';
export function chapterData(locale,slug) {
  const chapters=getChapters(locale); const index=chapters.findIndex(c=>c.slug===slug);
  if(index<0) error(404,'NOT_FOUND');
  return {locale,chapter:chapters[index],previous:chapters[index-1]??null,next:chapters[index+1]??null};
}
