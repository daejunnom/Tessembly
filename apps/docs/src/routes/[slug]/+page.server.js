import { chapters } from '$lib/content/index.js';
import { chapterData } from '$lib/server/chapter.js';
export function entries(){return chapters.map(c=>({slug:c.slug}));}
export function load({params}){return chapterData('en',params.slug);}
