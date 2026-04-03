const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  {
    passportId: 'PASSPORT-STAMP-001',
    batteryId: 'BAT-STAMP-001',
    did: 'did:example:passport-stamp-001',
    model: 'Stamp Pack 70kWh',
    serialNumber: 'SN-STAMP-001',
    manufacturerName: 'LG Energy Solution',
    manufactureCountry: 'KR',
    createdAt: '2026-04-03T08:00:00.000Z',
    status: 'MAINTENANCE',
    recycleAvailable: false,
    currentSoc: 0.62,
    currentSoh: 88,
  },
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
        org: 'ManufacturerMSP',
      });
    }
    if (path === '/api/passports') return json(route, { records: passports });
    return json(route, { ok: true });
  });
}

async function bootstrap(page, orgMsp = 'ManufacturerMSP') {
  await installMocks(page);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'issuer.user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#passports`, { waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 02 / Micro 15 — Passport Status Stamp Polish', () => {
  test('desktop register row uses document-style status stamp', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.locator('.bp-stamp').first()).toBeVisible();
    await expect(page.locator('.bp-stamp').filter({ hasText: /^정비중$/ }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m15_passports_stamp.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile register keeps status stamp readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.locator('.bp-stamp').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m15_passports_stamp_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
