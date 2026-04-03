const { test } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const SHOT = 'screenshots/c01_l10';

async function login(page, targetHash) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  }, targetHash ? targetHash.replace('#', '') : '');
  await page.waitForTimeout(2500);
}

test('Loop 10 — Stamp screenshots', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Dashboard — status distribution + recent table stamps
  await login(page, '#dashboard');
  await page.screenshot({ path: `${SHOT}_dashboard.png`, fullPage: false });

  // Passports — stamp badges in registry
  await login(page, '#passports');
  await page.screenshot({ path: `${SHOT}_passports.png`, fullPage: false });

  // Passport detail — seal + lifecycle chain + GBA compliance
  await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}_detail.png`, fullPage: true });

  // Recycling — stamp badges
  await login(page, '#recycling');
  await page.screenshot({ path: `${SHOT}_recycling.png`, fullPage: false });

  // Audit log — action stamps
  await login(page, '#audit-log');
  await page.screenshot({ path: `${SHOT}_audit.png`, fullPage: false });
});
