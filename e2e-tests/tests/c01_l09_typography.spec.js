const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const SHOT = 'screenshots/c01_l09';

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

test('Loop 09 — Typography system screenshots', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // Login page
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}_login.png`, fullPage: false });

  // Dashboard
  await login(page, '#dashboard');
  await page.screenshot({ path: `${SHOT}_dashboard.png`, fullPage: false });

  // Passports
  await login(page, '#passports');
  await page.screenshot({ path: `${SHOT}_passports.png`, fullPage: false });

  // Passport detail
  await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}_detail.png`, fullPage: true });

  // BMU Data
  await login(page, '#bmu-data');
  await page.screenshot({ path: `${SHOT}_bmu.png`, fullPage: false });

  // Maintenance
  await login(page, '#maintenance');
  await page.screenshot({ path: `${SHOT}_maintenance.png`, fullPage: false });

  // Materials
  await login(page, '#materials');
  await page.screenshot({ path: `${SHOT}_materials.png`, fullPage: false });

  // Audit Log
  await login(page, '#audit-log');
  await page.screenshot({ path: `${SHOT}_audit.png`, fullPage: false });

  // Recycling
  await login(page, '#recycling');
  await page.screenshot({ path: `${SHOT}_recycling.png`, fullPage: false });

  // QR Scan
  await login(page, '#qr-scan');
  await page.screenshot({ path: `${SHOT}_qr.png`, fullPage: false });
});
