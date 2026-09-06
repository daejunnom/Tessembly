import { test, expect } from '@playwright/test';
import { chapters } from '../src/lib/content/index.js';
test('home and all chapter deep links render without console errors', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/Tessembly/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('미노 공급을');
  await page.locator('main').getByRole('link', { name: '시작하기', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('시작하기');
  for (const chapter of chapters) {
    const response = await page.goto('/Tessembly/' + chapter.slug + '/');
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(chapter.title);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  }
  expect(errors).toEqual([]);
  await page.goto('/Tessembly/');
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
});
test('chapter search and mobile navigation', async ({ page, isMobile }) => {
  await page.goto('/Tessembly/');
  if (isMobile) await page.getByRole('button', { name: '메뉴', exact: true }).click();
  const search = page.getByRole('searchbox', { name: '문서 검색' });
  await search.fill('존재하지않는검색어');
  await expect(page.getByText('일치하는 문서가 없습니다.')).toBeVisible();
  await search.fill('커스텀');
  const nav = page.getByRole('navigation', { name: '문서 탐색' });
  await nav.getByRole('link', { name: '고급 선언 문법' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('고급 선언 문법');
  if (isMobile) await expect(page.getByRole('button', { name: '메뉴', exact: true })).toHaveAttribute('aria-expanded', 'false');
});
test('copy code exposes accessible confirmation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }));
  await page.goto('/Tessembly/compact/');
  await page.getByRole('button', { name: '코드 복사' }).first().click();
  await expect(page.getByText('코드를 복사했습니다.').first()).toBeAttached();
});
test('documentation is readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/Tessembly/advanced/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('고급 선언 문법');
  await expect(page.getByText('문서의 기본 구조', { exact: true }).last()).toBeVisible();
  await context.close();
});
test('published JSON request examples are valid and versioned', async () => {
  for (const chapter of chapters) for (const section of chapter.sections) for (const block of section.blocks) {
    if (block.kind !== 'code' || block.language !== 'json') continue;
    const request = JSON.parse(block.text ?? '');
    expect(request.profile).toBe('tessembly.rfc2.precedence.v1');
    expect(request.protocol).toMatch(/^tessembly\..*test-port\.v1$/);
    if (request.protocol === 'tessembly.document-test-port.v1') expect(request.text.startsWith('tessembly "')).toBe(true);
  }
});
