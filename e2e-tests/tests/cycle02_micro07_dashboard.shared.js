const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  {
    passportId: 'PASSPORT-OPS-001',
    model: 'NCM 82kWh Pack',
    manufacturerName: 'LG Energy Solution',
    status: 'ACTIVE',
    currentSoc: 72,
    chemistry: 'NCM',
    recycleAvailable: true,
    vin: 'KMHOPS240403001',
    createdAt: '2026-04-03T09:00:00.000Z',
  },
  {
    passportId: 'PASSPORT-OPS-002',
    model: 'LFP 58kWh Pack',
    manufacturerName: 'Samsung SDI',
    status: 'MAINTENANCE',
    currentSoc: 54,
    chemistry: 'LFP',
    recycleAvailable: false,
    vin: '',
    createdAt: '2026-04-02T09:00:00.000Z',
  },
  {
    passportId: 'PASSPORT-OPS-003',
    model: 'NCM 72kWh Pack',
    manufacturerName: 'SK On',
    status: 'ACTIVE',
    currentSoc: 81,
    chemistry: 'NCM',
    recycleAvailable: true,
    vin: 'KMHOPS240403003',
    createdAt: '2026-04-01T09:00:00.000Z',
  },
];

const materials = [
  { materialId: 'MAT-001' },
  { materialId: 'MAT-002' },
  { materialId: 'MAT-003' },
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

    if (path === '/api/passports') {
      return json(route, { records: passports });
    }

    if (path === '/api/materials') {
      return json(route, { records: materials });
    }

    if (path === '/api/status') {
      return json(route, {
        fabric: 'connected',
        channel: 'passportchannel',
        contract: 'passport-contract',
      });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, orgMsp) {
  await installMocks(page);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'dashboard-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: '운영 현황', level: 1 })).toBeVisible();
}

test.describe('Cycle 02 / Micro 07 — Dashboard Operations Brief', () => {
  test('issuer brief shows role note and operations progression', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ManufacturerMSP');

    await expect(page.getByText('제조 운영 현황')).toBeVisible();
    await expect(page.getByText('우선 확인 흐름')).toBeVisible();
    await expect(page.getByText('등록 현황 → 운행 상태 → 후속 확인 → 최근 등록')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m07_dashboard_brief.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('service brief keeps action docket and recent issuance readable', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByText('서비스 운영 현황')).toBeVisible();
    await expect(page.getByRole('heading', { name: '즉시 확인' })).toBeVisible();
    await expect(page.getByText('바인딩이 필요한 여권')).toBeVisible();
    await expect(page.getByRole('heading', { name: '최근 등록 여권' })).toBeVisible();
    await expect(page.getByText('PASSPORT-OPS-001')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m07_dashboard_docket.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile compliance brief keeps summary order legible', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'RegulatorMSP');

    await expect(page.getByText('규제 운영 현황')).toBeVisible();
    await expect(page.getByText('우선 확인 흐름')).toBeVisible();
    await expect(page.getByRole('heading', { name: '최근 등록 여권' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m07_dashboard_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
