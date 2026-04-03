const { test } = require('@playwright/test');
const BASE = 'http://localhost:3001';

async function login(page, hash) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'adminpw', orgNum: 1 }),
    });
    const d = await res.json();
    if (d.token) { localStorage.setItem('bp_token', d.token); localStorage.setItem('bp_userId', d.userId); localStorage.setItem('bp_orgMsp', d.mspId); }
  });
  await page.evaluate((h) => { window.location.hash = h; window.location.reload(); }, hash || 'dashboard');
  await page.waitForTimeout(2500);
}

test.describe('Cycle 01 Loop 03 — Passport Registry', () => {
  test('registry desktop', async ({ page }) => {
    await login(page, 'passports');
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l03_registry.png', fullPage: true });
  });
  test('registry mobile', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await login(p, 'passports');
    await p.screenshot({ path: 'e2e-tests/screenshots/c01_l03_registry_mobile.png', fullPage: true });
    await ctx.close();
  });
  test('click into detail', async ({ page }) => {
    await login(page, 'passports');
    const row = page.locator('tr').nth(1);
    if (await row.isVisible({ timeout: 3000 })) {
      await row.click();
      await page.waitForTimeout(2000);
    }
    await page.screenshot({ path: 'e2e-tests/screenshots/c01_l03_to_detail.png', fullPage: false });
  });
});
