const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const seedPassports = [
  {
    passportId: 'PASSPORT-RCY-001',
    serialNumber: 'SN-RCY-001',
    status: 'ACTIVE',
    recycleAvailable: false,
    currentSoh: 74,
    recyclingRates: {},
  },
  {
    passportId: 'PASSPORT-RCY-002',
    serialNumber: 'SN-RCY-002',
    status: 'ANALYSIS',
    recycleAvailable: false,
    currentSoh: 63,
    recyclingRates: {},
  },
  {
    passportId: 'PASSPORT-RCY-003',
    serialNumber: 'SN-RCY-003',
    status: 'RECYCLING',
    recycleAvailable: true,
    currentSoh: 47,
    recyclingRates: { Lithium: 82 },
  },
  {
    passportId: 'PASSPORT-RCY-004',
    serialNumber: 'SN-RCY-004',
    status: 'DISPOSED',
    recycleAvailable: false,
    currentSoh: 21,
    recyclingRates: {},
  },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function createState() {
  return {
    records: seedPassports.map((record) => ({
      ...record,
      recyclingRates: { ...(record.recyclingRates || {}) },
    })),
    analysisRequests: [],
    rulings: [],
    extractions: [],
    disposals: [],
  };
}

function updateRecord(records, passportId, patch) {
  const target = records.find((item) => item.passportId === passportId);
  if (!target) return null;
  Object.assign(target, patch);
  return target;
}

async function installMocks(page) {
  const state = createState();

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/status') {
      return json(route, {
        fabric: 'connected',
        channel: 'passportchannel',
        contract: 'passport-contract',
        org: 'ManufacturerMSP',
      });
    }

    if (path === '/api/passports' && method === 'GET') {
      return json(route, { records: state.records });
    }

    const analysisRequestMatch = path.match(/^\/api\/analysis\/([^/]+)\/request$/);
    if (analysisRequestMatch && method === 'POST') {
      const passportId = analysisRequestMatch[1];
      state.analysisRequests.push(passportId);
      updateRecord(state.records, passportId, { status: 'ANALYSIS' });
      return json(route, { ok: true });
    }

    const rulingMatch = path.match(/^\/api\/recycling\/([^/]+)\/availability$/);
    if (rulingMatch && method === 'PUT') {
      const passportId = rulingMatch[1];
      const payload = JSON.parse(route.request().postData() || '{}');
      state.rulings.push({ passportId, available: payload.available });
      updateRecord(state.records, passportId, { recycleAvailable: payload.available });
      return json(route, { ok: true });
    }

    const extractMatch = path.match(/^\/api\/recycling\/([^/]+)\/extract$/);
    if (extractMatch && method === 'POST') {
      const passportId = extractMatch[1];
      const payload = JSON.parse(route.request().postData() || '{}');
      state.extractions.push({ passportId, recyclingRates: payload.recyclingRates });
      updateRecord(state.records, passportId, {
        status: 'RECYCLING',
        recycleAvailable: true,
        recyclingRates: payload.recyclingRates,
      });
      return json(route, { ok: true });
    }

    const disposeMatch = path.match(/^\/api\/recycling\/([^/]+)\/dispose$/);
    if (disposeMatch && method === 'POST') {
      const passportId = disposeMatch[1];
      state.disposals.push(passportId);
      updateRecord(state.records, passportId, { status: 'DISPOSED' });
      return json(route, { ok: true });
    }

    const analysisResultMatch = path.match(/^\/api\/analysis\/([^/]+)\/result$/);
    if (analysisResultMatch && method === 'POST') {
      const passportId = analysisResultMatch[1];
      const payload = JSON.parse(route.request().postData() || '{}');
      updateRecord(state.records, passportId, {
        currentSoh: payload.soh,
        soce: payload.soce,
        remainingLifeCycle: payload.remainingLifeCycle,
        recycleAvailable: payload.recycleAvailable,
        status: 'ANALYSIS',
      });
      return json(route, { ok: true });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });

  return state;
}

async function bootstrap(page, orgMsp) {
  const state = await installMocks(page);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'recycling-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#recycling`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Recycling Case Control')).toBeVisible();
  return state;
}

test.describe('Cycle 02 / Micro 03 — Recycling Recovery Ledger', () => {
  test('EV desk keeps analysis intake visible', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const state = await bootstrap(page, 'EVManufacturerMSP');

    await expect(page.getByText('Disposition request desk')).toBeVisible();
    await expect(page.getByText('Disposition progression')).toBeVisible();
    await expect(page.getByText('Analysis pending', { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m03_recycling_ev.png', fullPage: true });

    const activeRow = page.locator('article').filter({ hasText: 'PASSPORT-RCY-001' });
    await activeRow.getByRole('button', { name: '분석 요청' }).click();
    expect(state.analysisRequests).toEqual(['PASSPORT-RCY-001']);
    await expect(activeRow.getByText('분석중')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('regulator desk drives ruling, recovery entry, and closeout flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const state = await bootstrap(page, 'RegulatorMSP');

    await expect(page.getByText('Recovery regulator desk')).toBeVisible();
    await expect(page.getByText('Next recovery docket', { exact: true }).first()).toBeVisible();

    const rulingRow = page.locator('article').filter({ hasText: 'PASSPORT-RCY-002' });

    await rulingRow.getByRole('button', { name: '재활용 판정' }).click();
    await expect(page.getByRole('heading', { name: 'Recovery eligibility ruling' })).toBeVisible();
    await page.locator('input[type="checkbox"]').first().evaluate((element) => {
      element.checked = true;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'File ruling' }).click();
    expect(state.rulings).toContainEqual({ passportId: 'PASSPORT-RCY-002', available: true });

    await rulingRow.getByRole('button', { name: '원자재 추출' }).click();
    await expect(page.getByRole('heading', { name: 'Material recovery entry' })).toBeVisible();
    await page.locator('input[placeholder="0"]').nth(0).fill('71');
    await page.locator('input[placeholder="0"]').nth(1).fill('64');
    await page.screenshot({ path: 'screenshots/c02_m03_recycling_extract_modal.png', fullPage: false });
    await page.getByRole('button', { name: 'File recovery entry' }).click();
    expect(state.extractions).toContainEqual({
      passportId: 'PASSPORT-RCY-002',
      recyclingRates: { '리튬': 71, '코발트': 64 },
    });

    await rulingRow.getByRole('button', { name: '폐기 처리' }).click();
    await expect(page.getByRole('heading', { name: 'Disposition closeout' })).toBeVisible();
    await page.getByRole('button', { name: 'Close disposition' }).click();
    expect(state.disposals).toEqual(['PASSPORT-RCY-002']);
    await expect(rulingRow.getByText('Disposition closed')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('mobile desk keeps recovery reading order and service gate readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByText('Recovery operations desk')).toBeVisible();
    await expect(page.getByText('Next recovery docket').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '폐기 처리' })).toHaveCount(0);
    await page.screenshot({ path: 'screenshots/c02_m03_recycling_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
