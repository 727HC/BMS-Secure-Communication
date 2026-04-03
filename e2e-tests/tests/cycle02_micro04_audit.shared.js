const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const seedLogs = [
  {
    id: 'AUD-004',
    action: 'REGISTER_MATERIAL',
    timestamp: '2026-04-03T03:20:00.000Z',
    userId: 'issuer.kim',
    orgMsp: 'ManufacturerMSP',
    method: 'POST',
    path: '/api/materials',
    duration: 84,
    statusCode: 201,
    requestBody: { materialId: 'MAT-CO-01', supplier: 'Metalkol' },
    ip: '127.0.0.1',
  },
  {
    id: 'AUD-003',
    action: 'DISPOSE_BATTERY',
    timestamp: '2026-04-03T03:15:00.000Z',
    userId: 'regulator.park',
    orgMsp: 'RegulatorMSP',
    method: 'POST',
    path: '/api/recycling/PASSPORT-RCY-002/dispose',
    duration: 132,
    statusCode: 500,
    requestBody: { reason: 'hazard isolate' },
    ip: '127.0.0.1',
  },
  {
    id: 'AUD-002',
    action: 'QUERY',
    timestamp: '2026-04-03T03:10:00.000Z',
    userId: 'auditor.lee',
    orgMsp: 'RegulatorMSP',
    method: 'GET',
    path: '/api/passports?status=ACTIVE',
    duration: 43,
    statusCode: 200,
    requestBody: null,
    ip: '127.0.0.1',
  },
  {
    id: 'AUD-001',
    action: 'LOGIN',
    timestamp: '2026-04-03T03:05:00.000Z',
    userId: 'svc.kim',
    orgMsp: 'ServiceMSP',
    method: 'POST',
    path: '/api/auth/login',
    duration: 24,
    statusCode: 200,
    requestBody: { userId: 'svc.kim' },
    ip: '127.0.0.1',
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
  const state = {
    records: seedLogs.map((record) => ({
      ...record,
      requestBody: record.requestBody ? { ...record.requestBody } : null,
    })),
  };

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const params = url.searchParams;

    if (path === '/api/status') {
      return json(route, {
        fabric: 'connected',
        channel: 'passportchannel',
        contract: 'passport-contract',
        org: 'ManufacturerMSP',
      });
    }

    if (path === '/api/audit') {
      let filtered = [...state.records];
      if (params.get('writeOnly') === 'true') {
        filtered = filtered.filter((item) => item.action !== 'QUERY');
      }
      if (params.get('action')) {
        filtered = filtered.filter((item) => item.action === params.get('action'));
      }
      return json(route, { records: filtered, total: filtered.length });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });

  return state;
}

async function bootstrap(page, orgMsp) {
  const state = await installMocks(page);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'audit-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#audit-log`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Audit Event Register')).toBeVisible();
  return state;
}

test.describe('Cycle 02 / Micro 04 — Audit Register Refinement', () => {
  test('issuer desk shows registry progression and detail drawer', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ManufacturerMSP');

    await expect(page.getByText('Issuer audit desk')).toBeVisible();
    await expect(page.getByText('Registry inspection progression')).toBeVisible();
    await expect(page.getByText('Open detail trace').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m04_audit_desk.png', fullPage: true });

    const registerRow = page.locator('article').filter({ hasText: 'REGISTER_MATERIAL' });
    await registerRow.getByText('원자재 등록').click();
    await expect(registerRow.getByText('요청 데이터')).toBeVisible();
    await expect(registerRow.getByText('AUD-004')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m04_audit_detail.png', fullPage: false });

    expect(errors).toEqual([]);
  });

  test('filter and live controls preserve audit workflow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ManufacturerMSP');

    await expect(page.getByText('Total 3')).toBeVisible();
    await page.locator('input[type="checkbox"]').first().uncheck();
    await expect(page.getByText('조회', { exact: true }).first()).toBeVisible();

    await page.locator('select').selectOption('DISPOSE_BATTERY');
    await expect(page.getByText('Total 1')).toBeVisible();
    await expect(page.locator('article').getByText('배터리 폐기')).toBeVisible();

    await page.getByText('실시간', { exact: true }).click();
    await expect(page.getByText('Auto live 5s')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m04_audit_filters.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile compliance desk keeps next-check reading order', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'RegulatorMSP');

    await expect(page.getByText('Compliance audit desk')).toBeVisible();
    await expect(page.getByText('Next audit check').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m04_audit_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
