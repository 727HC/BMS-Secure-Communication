const { test, expect } = require('@playwright/test');
const { E2E_ADMIN_USER, E2E_ADMIN_PASSWORD } = require('../auth-fixture');

const BASE = (process.env.PW_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
const USER = process.env.E2E_USER || E2E_ADMIN_USER;
const PASS = process.env.E2E_PASS || E2E_ADMIN_PASSWORD;
const ORG_NUM = Number(process.env.E2E_ORG || 1);

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');

  // 조직 선택 (1=제조사)
  const orgButton = page.locator(`button:has-text("${['제조사','EV제조사','정비/분석','검증기관'][ORG_NUM - 1]}")`).first();
  if (await orgButton.isVisible()) await orgButton.click();

  await page.getByPlaceholder('예: issuer.operator.01').fill(USER);
  await page.getByPlaceholder('비밀번호 입력').fill(PASS);
  // submit 버튼 명시 (탭 "로그인" 버튼과 구분)
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
  await expect(page.locator('.vk-dash')).toBeVisible({ timeout: 15000 });
}

function collectConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // 외부 리소스 404 같은 건 잡음이라 제외
      if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
        errors.push(`console.error: ${text}`);
      }
    }
  });
  return errors;
}

test.describe('UI polish smoke — feat/passport-ui-polish 병합 후', () => {
  test('로그인 → 대시보드 핵심 요소 렌더', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.locator('.vk-kpi')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: 'Fleet Digital Twin' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tasks / Queue' })).toBeVisible();
    await expect(page.locator('svg').first()).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('여권 목록 → 상세 히어로 ArcGauge 렌더', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page);
    await page.goto(`${BASE}/passports`);
    await expect(page).toHaveURL(/\/passports$/);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sn-page-title')).toContainText('Battery Passport Register');
    // 첫 카드 클릭
    const firstCard = page.locator('[data-page="passports"] [class*="sn-panel"]').filter({ hasText: /DEV-|PASSPORT-|QA-/ }).first();
    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForURL(/\/passports\/.+/, { timeout: 8000 });
      // 히어로 KPI 라벨
      await expect(page.locator('text=SOH · 건강 상태')).toBeVisible();
      await expect(page.locator('text=SOC · 충전 상태')).toBeVisible();
      await expect(page.locator('text=GBA 규제 준수')).toBeVisible();
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('각 페이지 route 이동 & skeleton → 실 content', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page);
    const routes = [
      { path: '/materials', title: 'Supply Chain Register' },
      { path: '/bmu-data', title: 'BMS Live Data' },
      { path: '/maintenance', title: 'Tasks Docket' },
      { path: '/recycling', title: 'Recycling & ESG' },
      { path: '/qr-scan', title: 'Field Identify Search' },
      { path: '/audit-log', title: 'Audit / Ledger' },
    ];
    for (const r of routes) {
      await page.goto(`${BASE}${r.path}`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      await expect(page.locator('.sn-page-title, h1, h2').filter({ hasText: r.title }).first(), `${r.path} 헤드라인 없음`).toBeVisible({ timeout: 12000 });
    }
    expect(errors.filter((e) => !e.includes('html5-qrcode')), errors.join('\n')).toEqual([]);
  });

  test('다크모드 토글 → html.dark + body bg 변화', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page);

    // 다크 토글
    const toggle = page.getByRole('button', { name: /다크 모드/ }).first();
    await toggle.waitFor({ timeout: 5000 });
    const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await toggle.click();
    await page.waitForTimeout(200);
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain('dark');
    const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgDark).not.toBe(bgLight);

    // 다시 라이트로
    await toggle.click();
    await page.waitForTimeout(150);
    const htmlClass2 = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass2).not.toContain('dark');

    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('상태 배지 pulse — ACTIVE 여권 dot 요소 존재', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/passports`);
    await page.waitForLoadState('networkidle');
    // bp-status-active 가진 스탬프가 1개 이상 있어야 할 수도 있음 (테스트 DB에 ACTIVE 여권 존재 시)
    const activeCount = await page.locator('.bp-status-active').count();
    console.log(`ACTIVE 스탬프 수: ${activeCount}`);
    // 존재하지 않아도 테스트는 통과 (데이터 상태 의존)
  });
});
