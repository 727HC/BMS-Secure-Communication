const { test } = require('@playwright/test');
const BASE = 'http://localhost:3001';
const SHOT = 'screenshots/c02';

async function login(page, targetHash) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'REMOVED_SECRET_ROTATED_2026_04_18', orgNum: 1 }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('bp_token', data.token);
      localStorage.setItem('bp_userId', data.userId);
      localStorage.setItem('bp_orgMsp', data.mspId);
    }
  });
  await page.evaluate((h) => { window.location.hash = h || ''; window.location.reload(); }, targetHash ? targetHash.replace('#', '') : '');
  await page.waitForTimeout(2500);
}

test('C02 check', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, '#dashboard');
  await page.screenshot({ path: `${SHOT}_dashboard.png` });
  await login(page, '#passports');
  await page.screenshot({ path: `${SHOT}_passports.png` });
  await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}_detail.png`, fullPage: true });
  await login(page, '#audit-log');
  await page.screenshot({ path: `${SHOT}_audit.png` });
});
