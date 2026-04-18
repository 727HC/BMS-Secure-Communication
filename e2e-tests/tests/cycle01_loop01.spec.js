const { test, expect } = require('@playwright/test');
const { E2E_ADMIN_USER, E2E_ADMIN_PASSWORD } = require('../auth-fixture');

const BASE = 'http://localhost:3001';

async function login(page, targetHash) {
  // 1. Load page to get origin context for localStorage
  await page.goto(BASE);
  await page.waitForTimeout(500);
  // 2. Set localStorage via API call
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: E2E_ADMIN_USER, password: E2E_ADMIN_PASSWORD, orgNum: 1 }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_userId', data.userId);
      localStorage.setItem('bp_orgMsp', data.mspId);
    }
  });
  // 3. Set hash then force full reload so Vue re-reads localStorage
  await page.evaluate((h) => {
    window.location.hash = h || '';
    window.location.reload();
  }, targetHash ? targetHash.replace('#', '') : '');
  await page.waitForTimeout(2500);
}

test.describe('Cycle 01 Loop 01 — Passport Detail Dossier', () => {

  test('detail page — desktop top', async ({ page }) => {
    await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l01_detail_top.png', fullPage: false });
  });

  test('detail page — desktop full', async ({ page }) => {
    await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l01_detail_full.png', fullPage: true });
  });

  test('detail page — mobile', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l01_detail_mobile.png', fullPage: true });
    await context.close();
  });

  test('navigation — detail back to list', async ({ page }) => {
    await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
    const backBtn = page.locator('button:has-text("REGISTRY")');
    if (await backBtn.isVisible({ timeout: 3000 })) {
      await backBtn.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l01_nav_back.png' });
  });
});
