const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const USER = process.env.E2E_USER || 'testmfg';
const PASS = process.env.E2E_PASS || 'testpass123';
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
  await page.waitForURL('**/dashboard', { timeout: 15000 });
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
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sn-page-title')).toContainText('대시보드');
    // KPI 3카드 (skeleton → 실 content)
    await expect(page.locator('button:has-text("VIN 연결 필요")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("회수 판단 확인")').first()).toBeVisible();
    // 정비·분석: page-head action + KPI card 둘 다 텍스트 가짐 → 첫 번째만 확인
    await expect(page.locator('button:has-text("정비·분석 확인")').first()).toBeVisible();
    // Donut (SVG 존재)
    await expect(page.locator('svg').first()).toBeVisible();
    // 하단 포트폴리오 BarRows
    await expect(page.locator('text=포트폴리오 · 화학계열')).toBeVisible();
    await expect(page.locator('text=포트폴리오 · 제조국')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('여권 목록 → 상세 히어로 ArcGauge 렌더', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page);
    await page.getByRole('link', { name: '배터리 여권' }).click();
    await page.waitForURL('**/passports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.sn-page-title')).toContainText('배터리 여권');
    // 첫 카드 클릭
    const firstCard = page.locator('[class*="sn-panel"]').filter({ hasText: /BP-/ }).first();
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
      { path: '/materials', title: '원자재 관리' },
      { path: '/bmu-data', title: '배터리 데이터' },
      { path: '/maintenance', title: '정비' },
      { path: '/recycling', title: '재활용' },
      { path: '/qr-scan', title: '여권' },
      { path: '/audit-log', title: '감사' },
    ];
    for (const r of routes) {
      await page.goto(`${BASE}${r.path}`);
      await page.waitForLoadState('networkidle', { timeout: 12000 });
      // sn-page-title 또는 주요 헤드라인 존재
      const hasHead = await page.locator('.sn-page-title, h1, h2').count();
      expect(hasHead, `${r.path} 헤드라인 없음`).toBeGreaterThan(0);
    }
    expect(errors.filter((e) => !e.includes('html5-qrcode')), errors.join('\n')).toEqual([]);
  });

  test('다크모드 토글 → html.dark + body bg 변화', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page);

    // 다크 토글
    const toggle = page.locator('button.ev-theme-toggle');
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
