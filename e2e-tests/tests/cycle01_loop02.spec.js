const { test } = require('@playwright/test');
const BASE = 'http://localhost:3001';

async function login(page, targetHash) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'adminpw', orgNum: 1 }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_userId', data.userId);
      localStorage.setItem('bp_orgMsp', data.mspId);
    }
  });
  await page.evaluate((h) => {
    window.location.hash = h || '';
    window.location.reload();
  }, targetHash ? targetHash.replace('#', '') : 'dashboard');
  await page.waitForTimeout(2500);
}

test.describe('Cycle 01 Loop 02 — Shell Redesign', () => {
  test('dashboard with new shell', async ({ page }) => {
    await login(page, '#dashboard');
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l02_dashboard.png', fullPage: false });
  });

  test('passport detail within new shell', async ({ page }) => {
    await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l02_detail.png', fullPage: false });
  });

  test('mobile menu', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await login(page, '#dashboard');
    // Open mobile menu
    const menuBtn = page.locator('button').filter({ has: page.locator('svg line') }).first();
    if (await menuBtn.isVisible({ timeout: 2000 })) {
      await menuBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l02_mobile_menu.png', fullPage: false });
    await ctx.close();
  });

  test('navigation across routes', async ({ page }) => {
    await login(page, '#dashboard');
    // Navigate to passports
    await page.evaluate(() => { window.location.hash = 'passports'; window.location.reload(); });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l02_passports.png', fullPage: false });
  });
});
