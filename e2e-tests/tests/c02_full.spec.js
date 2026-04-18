const { test } = require('@playwright/test');
const { E2E_ADMIN_USER, E2E_ADMIN_PASSWORD } = require('../auth-fixture');
const BASE = 'http://localhost:3001';
const SHOT = 'screenshots/c02_full';

async function login(page, targetHash) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: E2E_ADMIN_USER, password: E2E_ADMIN_PASSWORD, orgNum: 1 }),
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

test('C02 full review', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}_login.png` });
  await login(page, '#dashboard');
  await page.screenshot({ path: `${SHOT}_dashboard.png` });
  await login(page, '#passports');
  await page.screenshot({ path: `${SHOT}_passports.png` });
  await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}_detail.png`, fullPage: true });
  await login(page, '#bmu-data');
  await page.screenshot({ path: `${SHOT}_bmu.png` });
  await login(page, '#maintenance');
  await page.screenshot({ path: `${SHOT}_maintenance.png` });
  await login(page, '#recycling');
  await page.screenshot({ path: `${SHOT}_recycling.png` });
  await login(page, '#audit-log');
  await page.screenshot({ path: `${SHOT}_audit.png` });
});
