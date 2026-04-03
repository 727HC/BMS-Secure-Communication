const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  {
    passportId: 'PASSPORT-MAINT-001',
    serialNumber: 'SN-MAINT-001',
    status: 'ACTIVE',
    maintenanceLogs: [],
    accidentLogs: [],
  },
  {
    passportId: 'PASSPORT-MAINT-002',
    serialNumber: 'SN-MAINT-002',
    status: 'MAINTENANCE',
    maintenanceLogs: [
      { type: 'routine', description: '열 관리 라인 점검', technician: 'svc.kim' },
    ],
    accidentLogs: [],
  },
  {
    passportId: 'PASSPORT-MAINT-003',
    serialNumber: 'SN-MAINT-003',
    status: 'ACTIVE',
    maintenanceLogs: [],
    accidentLogs: [
      { severity: 'moderate', description: '충격 감지 후 housing 점검 필요', reporter: 'ev.lee' },
    ],
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

    if (path === '/api/passports') {
      return json(route, { records: passports });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, orgMsp) {
  await installMocks(page);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'ops-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#maintenance`, { waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 02 / Micro 01 — Maintenance Workflow Clarity', () => {
  test('EV intake desk shows request-first flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'EVManufacturerMSP');

    await expect(page.getByText('Service Operations Desk')).toBeVisible();
    await expect(page.getByText('Service desk progression')).toBeVisible();
    await expect(page.getByText('EV intake desk')).toBeVisible();
    await expect(page.getByText('Request intake', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '정비요청' }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m01_maintenance_ev.png', fullPage: true });

    await page.getByRole('button', { name: '정비요청' }).first().click();
    await expect(page.getByRole('heading', { name: '정비 요청' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m01_maintenance_request_modal.png', fullPage: false });

    expect(errors).toEqual([]);
  });

  test('service desk shows closure-first flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByText('Service desk', { exact: true })).toBeVisible();
    await expect(page.getByText('Closure ready', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '정비완료' }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m01_maintenance_service.png', fullPage: true });

    await page.getByRole('button', { name: '정비완료' }).first().click();
    await expect(page.getByRole('heading', { name: '정비 완료 기록' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m01_maintenance_complete_modal.png', fullPage: false });

    expect(errors).toEqual([]);
  });

  test('mobile desk keeps sequence readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByText('Service desk progression')).toBeVisible();
    await expect(page.getByText('Next action docket').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m01_maintenance_mobile.png', fullPage: true });

    await context.close();
  });
});
