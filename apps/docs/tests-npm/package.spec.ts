import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.env.NPM_TEST_PACKAGE_DIR??path.resolve('../../packages/npm');
for(const [locale,expected] of [['ko-KR','ko'],['en-US','en'],['ja-JP','en']] as const){
  test(`installed browser module uses ${locale} primary language`,async({browser})=>{
    const context=await browser.newContext({locale}); const page=await context.newPage();
    const requested:string[]=[];
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());requested.push(u.href);
      if(u.origin!=='https://tessembly.local')throw new Error('Unexpected external request');
      if(u.pathname==='/'){await route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Package contract</title><body>Wasm consumer</body></html>'});return;}
      const name=u.pathname.slice(1);
      if(!['browser.js','runtime.js','locale.js','limits.js','tessembly.wasm'].includes(name))throw new Error('Unexpected package asset');
      await route.fulfill({contentType:name.endsWith('.wasm')?'application/wasm':'text/javascript',body:await readFile(path.join(root,name))});
    });
    await page.goto('https://tessembly.local/');
    const result=await page.evaluate(async()=>{
      const url='/browser.js'; const mod=await import(url); const t=await mod.createTessembly();
      const a=t.normalizePattern('P4:D(I<T>S)'),b=t.normalizePattern('P4:D(T>IS)');
      const original=t.language,bytes=t.encodePattern('P4:D(T)'),round=t.decodePattern(bytes);
      let code='',message='';try{t.normalizePattern('P4:D(HAS(T))');}catch(e){const error=e as {code:string;message:string};code=error.code;message=error.message;}
      t.setLanguage('en');const r=t.checkPattern('P7:U(I>T>I)');t.dispose();
      return {original,a,b,round,code,message,draw:r.draw,usage:r.usage};
    });
    expect(result.original).toBe(expected);expect(result.a).toBe(result.b);expect(result.a).toBe('P4:D(I<T,S<T)');expect(result.round).toContain('D(T)');
    expect(result.draw).toBe('NOT_CHECKED');expect(result.usage).toBe('UNSAT');expect(result.code).not.toBe('');
    expect(/[가-힣]/.test(result.message)).toBe(expected==='ko');expect(requested.every(u=>u.startsWith('https://tessembly.local/'))).toBe(true);
    await context.close();
  });
}
