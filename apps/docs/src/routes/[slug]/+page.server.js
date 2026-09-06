import { error } from '@sveltejs/kit';
import { chapters } from '$lib/content/index.js';
export function entries() { return chapters.map(({ slug }) => ({ slug })); }
export function load({ params }) {
  const index = chapters.findIndex((chapter) => chapter.slug === params.slug);
  if (index < 0) error(404, '문서를 찾을 수 없습니다.');
  return { chapter: chapters[index], previous: chapters[index - 1] ?? null, next: chapters[index + 1] ?? null };
}
