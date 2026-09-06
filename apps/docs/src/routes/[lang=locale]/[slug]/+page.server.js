import { chapters } from '$lib/content/index.js';
import { chapterData } from '$lib/server/chapter.js';
export function entries(){return ['en','ko'].flatMap(lang=>chapters.map(c=>({lang,slug:c.slug})));}
export function load({params}){return chapterData(params.lang,params.slug);}
