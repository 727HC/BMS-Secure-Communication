const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

async function openLogin(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_userId');
    localStorage.removeItem('bp_orgMsp');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Access Intake')).toBeVisible();
}

test.describe('Cycle 01 / Micro 01 — Login Access Desk', () => {
  test('desktop login intake', async ({ page }) => {
    await openLogin(page);
    await expect(page.getByText('접속 자격 확인')).toBeVisible();
    await page.screenshot({
      path: 'screenshots/c01_m01_login_desktop.png',
      fullPage: true,
    });
  });

  test('desktop register intake', async ({ page }) => {
    await openLogin(page);
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('조직 계정 등록')).toBeVisible();
    await page.screenshot({
      path: 'screenshots/c01_m01_login_register.png',
      fullPage: true,
    });
  });

  test('mobile checkpoint', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    await openLogin(page);
    await page.getByRole('button', { name: '검증기관' }).click();
    await page.screenshot({
      path: 'screenshots/c01_m01_login_mobile.png',
      fullPage: true,
    });
    await context.close();
  });
});
