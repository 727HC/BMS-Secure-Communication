const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  {
    passportId: 'PASSPORT-C03-001',
    model: 'NCM 82kWh Pack',
    manufacturerName: 'LG Energy Solution',
    status: 'ACTIVE',
    currentSoc: 72,
    chemistry: 'NCM',
    recycleAvailable: true,
    vin: 'KMHC03001',
    createdAt: '2026-04-03T09:00:00.000Z',
  },
  {
    passportId: 'PASSPORT-C03-002',
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
    passportId: 'PASSPORT-C03-003',
    model: 'NCM 72kWh Pack',
    manufacturerName: 'SK On',
    status: 'ACTIVE',
    currentSoc: 81,
    chemistry: 'NCM',
    recycleAvailable: true,
    vin: 'KMHC03003',
    createdAt: '2026-04-01T09:00:00.000Z',
  },
];

const materials = [{ materialId: 'MAT-001' }, { materialId: 'MAT-002' }, { materialId: 'MAT-003' }];

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

    if (path === '/api/passports') return json(route, { records: passports });
    if (path === '/api/materials') return json(route, { records: materials });
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
  await expect(page.getByRole('heading', { name: '대시보드', level: 1 })).toBeVisible();
}

test.describe('Cycle 03 / Micro 01 — Dashboard Density Compression', () => {
  test('service dashboard uses tighter Korean copy and immediate checks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByRole('heading', { name: '대시보드', level: 1 })).toBeVisible();
    await expect(page.getByText('화학계열 분포')).toBeVisible();
    await expect(page.getByText('상태 분류')).toBeVisible();
    await expect(page.getByText('정비·분석 대기')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c03_m01_dashboard_density.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile dashboard keeps compressed overview readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'RegulatorMSP');

    await expect(page.getByRole('heading', { name: '대시보드', level: 1 })).toBeVisible();
    await expect(page.getByText('회수·재활용 검토')).toBeVisible();
    await expect(page.getByText('맞춤 리포트 추가')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c03_m01_dashboard_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
