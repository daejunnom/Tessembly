import { test, expect } from '@playwright/test';
import { getChapters } from '../src/lib/content/index.js';
for (const locale of ['en','ko'] as const) {
  test(`${locale}: all chapters render without errors`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    for(const c of getChapters(locale)){
      const response=await page.goto(`/Tessembly/${locale}/${c.slug}/`);
      expect(response?.status()).toBe(200);await expect(page.locator('html')).toHaveAttribute('lang',locale);
      await expect(page.getByRole('heading',{level:1})).toHaveText(c.title);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
    }
    expect(errors).toEqual([]);await page.goto(`/Tessembly/${locale}/`);
    await page.screenshot({path:testInfo.outputPath(`home-${locale}.png`),fullPage:true});
  });
  test(`${locale}: search, mobile navigation and copy`,async({page,isMobile})=>{
    await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true}));
    await page.goto(`/Tessembly/${locale}/`);
    if(isMobile)await page.getByRole('button',{name:locale==='ko'?'메뉴':'Menu',exact:true}).click();
    const search=page.getByRole('searchbox',{name:locale==='ko'?'문서 검색':'Search documentation'});
    await search.fill('no-such-translation-123');await expect(page.getByRole('status')).toHaveText(locale==='ko'?'일치하는 문서가 없습니다.':'No matching documents.');
    await search.fill(locale==='ko'?'커스텀':'custom');
    await page.getByRole('navigation',{name:locale==='ko'?'문서 탐색':'Documentation navigation'}).getByRole('link',{name:locale==='ko'?'고급 선언 문법':'Advanced declarations'}).click();
    await page.getByRole('button',{name:locale==='ko'?'코드 복사':'Copy code',exact:true}).first().click();
    await expect(page.getByText(locale==='ko'?'코드를 복사했습니다.':'Code copied.',{exact:true}).first()).toBeAttached();
  });
  test(`${locale}: static HTML works without JavaScript`,async({browser})=>{
    const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
    await page.goto(`http://127.0.0.1:4173/Tessembly/${locale}/advanced/`);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.getByRole('heading',{level:1})).toHaveText(locale==='ko'?'고급 선언 문법':'Advanced declarations');
    await context.close();
  });
}
for(const [primary,expected] of [['ko-KR','ko'],['en-US','en'],['ja-JP','en']] as const){
  test(`primary language ${primary}`,async({browser})=>{
    const context=await browser.newContext({locale:primary});const page=await context.newPage();
    await page.addInitScript(()=>Object.defineProperty(navigator,'languages',{get:()=>['en-US','ko-KR']}));
    await page.goto('http://127.0.0.1:4173/Tessembly/compact/#presence');
    await expect(page).toHaveURL(new RegExp(`/Tessembly/${expected}/compact/#presence$`));await context.close();
  });
}
test('manual selection persists; explicit URL retains priority',async({page})=>{
  await page.goto('/Tessembly/en/compact/#presence');await page.getByLabel('Language',{exact:true}).selectOption('ko');
  await expect(page).toHaveURL(/\/ko\/compact\/#presence$/);
  await page.goto('/Tessembly/');await expect(page).toHaveURL(/\/ko\/$/);
  await page.goto('/Tessembly/en/advanced/');await expect(page.getByRole('heading',{level:1})).toHaveText('Advanced declarations');
});
test('denied storage still selects the browser primary language',async({browser})=>{
  const context=await browser.newContext({locale:'ko-KR'});const page=await context.newPage();
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get:()=>{throw new DOMException('denied');}}));
  await page.goto('http://127.0.0.1:4173/Tessembly/');await expect(page).toHaveURL(/\/ko\/$/);await context.close();
});

for (const locale of ['en','ko'] as const) {
  test(`${locale}: corrected comparator and unapproved review plan`,async({page})=>{
    await page.goto(`/Tessembly/${locale}/migration/`);
    const row=page.locator('#meaning tbody tr').first();
    await expect(row.locator('td').nth(0)).toHaveText('A<B');
    await expect(row.locator('td').nth(1)).toHaveText(locale==='en'?'A precedes B':'A가 B보다 먼저');
    await page.goto(`/Tessembly/${locale}/review-plan/`);
    await expect(page.locator('#gate')).toContainText('AWAITING OWNER GO/NO-GO');
    await expect(page.locator('#gate a[href*="FILTERS_QB_OQB"]')).toHaveCount(1);
  });
}
