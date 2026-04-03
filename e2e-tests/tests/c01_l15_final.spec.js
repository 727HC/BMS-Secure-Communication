const { test } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const SHOT = 'screenshots/c01_l15';

async function login(page, targetHash) {
  await page.goto(BASE);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'admin', password: 'REMOVED_SECRET_ROTATED_2026_04_18', orgNum: 1 }),
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

test('Cycle 01 Final QA — all pages', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // 1. Login
  await page.goto(BASE);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT}_01_login.png`, fullPage: false });

  // 2. Dashboard
  await login(page, '#dashboard');
  await page.screenshot({ path: `${SHOT}_02_dashboard.png`, fullPage: false });

  // 3. Passports
  await login(page, '#passports');
  await page.screenshot({ path: `${SHOT}_03_passports.png`, fullPage: false });

  // 4. Passport detail
  await login(page, '#passport-detail?passportId=PASSPORT-BMU-DEVICE');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT}_04_detail_top.png`, fullPage: false });
  await page.screenshot({ path: `${SHOT}_04_detail_full.png`, fullPage: true });

  // 5. BMU Data
  await login(page, '#bmu-data');
  await page.screenshot({ path: `${SHOT}_05_bmu.png`, fullPage: false });

  // 6. Maintenance
  await login(page, '#maintenance');
  await page.screenshot({ path: `${SHOT}_06_maintenance.png`, fullPage: false });

  // 7. Materials
  await login(page, '#materials');
  await page.screenshot({ path: `${SHOT}_07_materials.png`, fullPage: false });

  // 8. Recycling
  await login(page, '#recycling');
  await page.screenshot({ path: `${SHOT}_08_recycling.png`, fullPage: false });

  // 9. Audit Log
  await login(page, '#audit-log');
  await page.screenshot({ path: `${SHOT}_09_audit.png`, fullPage: false });

  // 10. QR Scan
  await login(page, '#qr-scan');
  await page.screenshot({ path: `${SHOT}_10_qr.png`, fullPage: false });
});
