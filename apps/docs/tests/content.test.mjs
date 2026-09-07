import test from 'node:test';
import assert from 'node:assert/strict';
import { getChapters } from '../src/lib/content/index.js';
import { languageOf } from '../src/lib/i18n.js';
test('complete bilingual content parity',()=>{
  const en=getChapters('en'),ko=getChapters('ko');
  assert.deepEqual(en.map(c=>c.slug),ko.map(c=>c.slug));
  for(let i=0;i<en.length;i++){
    const a=en[i],b=ko[i]; assert.equal(a.sections.length,b.sections.length);
    assert.doesNotMatch(a.title+a.summary,/[가-힣]/);
    for(let j=0;j<a.sections.length;j++){
      const x=a.sections[j],y=b.sections[j]; assert.equal(x.id,y.id); assert.equal(x.blocks.length,y.blocks.length); assert.doesNotMatch(x.title,/[가-힣]/);
      for(let k=0;k<x.blocks.length;k++){
        const m=x.blocks[k],n=y.blocks[k]; assert.equal(m.kind,n.kind);
        if(m.kind==='code'){assert.equal(m.text,n.text); if(m.language==='json'){const r=JSON.parse(m.text);assert.ok(r.profile);}}
        else if(m.kind==='table'){assert.equal(m.headers.length,n.headers.length);assert.equal(m.rows.length,n.rows.length);assert.doesNotMatch(JSON.stringify(m),/[가-힣]/);}
        else assert.doesNotMatch(m.text??'',/[가-힣]/);
      }
    }
  }
});
test('Korean primary only; all other language values fall back to English',()=>{
  for(const v of ['ko','ko-KR','ko_KR.UTF-8','KO'])assert.equal(languageOf(v),'ko');
  for(const v of ['en-US','ja-JP','zh-CN','kok','C','',undefined])assert.equal(languageOf(v),'en');
});

test('RFC3 migration remains public; GO/NO-GO review content is not published',()=>{
  for(const lang of ['en','ko']) {
    const cs=getChapters(lang);
    const rows=cs.find(c=>c.slug==='migration').sections.find(s=>s.id==='meaning').blocks[0].rows;
    assert.equal(rows[0][0],'A<B');
    assert.equal(rows[0][1],lang==='en'?'A precedes B':'A가 B보다 먼저');
    assert.equal(cs.some(c=>c.slug==='review-plan'),false);
    assert.doesNotMatch(JSON.stringify(cs),/review-plan|GO\/NO-GO|FILTERS_QB_OQB/);
  }
});
