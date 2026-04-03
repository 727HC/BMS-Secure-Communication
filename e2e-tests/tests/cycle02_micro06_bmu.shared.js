const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
const PASSPORT_ID = 'PASSPORT-BMU-DEVICE';

const bmuRecords = [
  {
    recordId: 'BMU-REC-20260403-003',
    timestamp: '2026-04-03T08:15:00.000Z',
    soc: 74,
    voltage: 398.4,
    current: 16.2,
    temperature: 29.4,
    dischargeCycles: 184,
    statusFlags: 0x03,
  },
  {
    recordId: 'BMU-REC-20260403-002',
    timestamp: '2026-04-03T08:05:00.000Z',
    soc: 72,
    voltage: 396.1,
    current: 14.4,
    temperature: 28.7,
    dischargeCycles: 183,
    statusFlags: 0x00,
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

    if (path === `/api/bmu/records/${PASSPORT_ID}`) {
      return json(route, { records: bmuRecords });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, orgMsp) {
  await installMocks(page);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'bmu-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#bmu-data`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('BMU Sensor Record Filing')).toBeVisible();
}

test.describe('Cycle 02 / Micro 06 — BMU Telemetry Desk', () => {
  test('service desk opens telemetry evidence with role and next-check grammar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByText('Service telemetry desk')).toBeVisible();
    await expect(page.getByText('Evidence progression')).toBeVisible();
    await page.locator('input[placeholder="예: PASSPORT-001"]').fill(PASSPORT_ID);
    await page.getByRole('button', { name: 'Open Evidence Ledger' }).click();

    await expect(page.getByText('Passport telemetry evidence')).toBeVisible();
    await expect(page.getByText('Cross-check maintenance docket')).toBeVisible();
    await expect(page.getByText('BMU-REC-20260403-003')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m06_bmu_desk.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('auto-refresh lane keeps live loop and latest badges readable', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ManufacturerMSP');

    await page.locator('input[placeholder="예: PASSPORT-001"]').fill(PASSPORT_ID);
    await page.locator('input[type="checkbox"]').first().evaluate((element) => {
      element.checked = true;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'Open Evidence Ledger' }).click();

    await expect(page.getByText('Live 10s loop')).toBeVisible();
    await expect(page.getByText('Refresh loop')).toBeVisible();
    await expect(page.getByText('충전중', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m06_bmu_live.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile compliance desk keeps idle telemetry reading order', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'RegulatorMSP');

    await expect(page.getByText('Compliance telemetry desk')).toBeVisible();
    await expect(page.getByText('Telemetry filing desk is idle')).toBeVisible();
    await expect(page.getByText('Evidence progression')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m06_bmu_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
