const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  { passportId: 'PASSPORT-NAV-001', status: 'MAINTENANCE', recycleAvailable: false, model: 'Nav Pack 1', manufacturerName: 'LG' },
  { passportId: 'PASSPORT-NAV-002', status: 'ANALYSIS', recycleAvailable: true, model: 'Nav Pack 2', manufacturerName: 'SDI' },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installMocks(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/status') {
      return json(route, {
        fabric: 'connected',
        channel: 'passportchannel',
        contract: 'passport-contract',
        org: 'ServiceMSP',
      });
    }
    if (path === '/api/passports') return json(route, { records: passports });
    if (path === '/api/materials') return json(route, { records: [] });
    return json(route, { ok: true });
  });
}

async function bootstrap(page) {
  await installMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'service.operator');
    localStorage.setItem('bp_orgMsp', 'ServiceMSP');
  });
  await page.goto(`${BASE}/#dashboard`, { waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 02 / Micro 12 — Shell Navigation Bands', () => {
  test('desktop nav shows section bands and current route stamp', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.locator('span').filter({ hasText: /^관리$/ }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^운영$/ }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^도구$/ }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^current$/ }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m12_shell_nav_desktop.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile menu exposes section bands and current route stamp', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);
    await page.locator('button.lg\\:hidden').first().click();

    await expect(page.locator('div').filter({ hasText: /^관리$/ }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^운영$/ }).first()).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^도구$/ }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^current$/ }).last()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m12_shell_nav_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
