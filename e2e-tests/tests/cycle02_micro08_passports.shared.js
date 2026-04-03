const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const seedPassports = [
  {
    passportId: 'PASSPORT-ISS-001',
    batteryId: 'BAT-ISS-001',
    did: 'did:example:passport-iss-001',
    model: 'LFP Fleet Pack 56kWh',
    serialNumber: 'SN-ISS-001',
    manufacturerName: 'LG Energy Solution',
    manufactureCountry: 'KR',
    createdAt: '2026-04-01T08:00:00.000Z',
    status: 'MANUFACTURED',
    recycleAvailable: false,
    currentSoc: 0.68,
    currentSoh: 96,
  },
  {
    passportId: 'PASSPORT-ISS-002',
    batteryId: 'BAT-ISS-002',
    did: 'did:example:passport-iss-002',
    model: 'NCM Long Range 82kWh',
    serialNumber: 'SN-ISS-002',
    manufacturerName: 'Samsung SDI',
    manufactureCountry: 'KR',
    vin: 'KMHISS240403002',
    createdAt: '2026-04-02T08:00:00.000Z',
    status: 'ACTIVE',
    recycleAvailable: false,
    currentSoc: 0.72,
    currentSoh: 93,
  },
  {
    passportId: 'PASSPORT-ISS-003',
    batteryId: 'BAT-ISS-003',
    did: 'did:example:passport-iss-003',
    model: 'NCA Utility Pack 74kWh',
    serialNumber: 'SN-ISS-003',
    manufacturerName: 'SK On',
    manufactureCountry: 'KR',
    vin: 'KMHISS240403003',
    createdAt: '2026-04-03T08:00:00.000Z',
    status: 'ANALYSIS',
    recycleAvailable: false,
    currentSoc: 0.41,
    currentSoh: 78,
  },
  {
    passportId: 'PASSPORT-ISS-004',
    batteryId: 'BAT-ISS-004',
    did: 'did:example:passport-iss-004',
    model: 'LMO Recovery Pack 48kWh',
    serialNumber: 'SN-ISS-004',
    manufacturerName: 'CATL',
    manufactureCountry: 'CN',
    vin: 'KMHISS240403004',
    createdAt: '2026-04-03T10:00:00.000Z',
    status: 'RECYCLING',
    recycleAvailable: true,
    currentSoc: 0.19,
    currentSoh: 51,
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
    records: seedPassports.map((record) => ({ ...record })),
    createdBodies: [],
  };
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

    if (path === '/api/passports' && method === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}');
      state.createdBodies.push(payload);
      state.records = [
        {
          ...payload,
          status: 'MANUFACTURED',
          recycleAvailable: false,
          createdAt: '2026-04-03T11:00:00.000Z',
          currentSoc: 0.88,
          currentSoh: 99,
        },
        ...state.records,
      ];
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
    localStorage.setItem('bp_userId', 'passports-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#passports`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('배터리 여권 등록부')).toBeVisible();
  return state;
}

test.describe('Cycle 02 / Micro 08 — Passports Issuance Register', () => {
  test('manufacturer register shows issuance queue and next-check grammar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ManufacturerMSP');

    await expect(page.getByText('Issuer filing register')).toBeVisible();
    await expect(page.getByText('Register progression')).toBeVisible();
    await expect(page.getByText('Binding pending')).toBeVisible();
    await expect(page.getByText('Advance to vehicle binding')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m08_passports_register.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('issuance wizard keeps create flow and refreshes the register', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const state = await bootstrap(page, 'ManufacturerMSP');

    await page.getByRole('button', { name: '여권 발급' }).first().click();
    await expect(page.getByRole('heading', { name: '배터리 여권 발급' })).toBeVisible();

    await page.locator('input[placeholder="DID 식별자"]').fill('did:example:passport-iss-new');
    await page.locator('input[placeholder="모델명"]').fill('Solid-State Pilot Pack');
    await page.locator('input[placeholder="SN-001"]').fill('SN-ISS-NEW');
    await page.locator('input[placeholder="제조사명"]').fill('Samsung SDI');
    await page.getByRole('button', { name: '다음' }).click();

    await page.locator('input[placeholder="96"]').fill('192');
    await page.locator('input[placeholder="450"]').fill('482');
    await page.locator('input[placeholder="72.6"]').fill('84');
    await page.screenshot({ path: 'screenshots/c02_m08_passports_issuance_modal.png', fullPage: false });
    await page.getByRole('button', { name: '다음' }).click();

    await page.getByRole('button', { name: '여권 생성' }).click();

    expect(state.createdBodies).toHaveLength(1);
    expect(state.createdBodies[0]).toMatchObject({
      did: 'did:example:passport-iss-new',
      model: 'Solid-State Pilot Pack',
      serialNumber: 'SN-ISS-NEW',
      manufacturerName: 'Samsung SDI',
      cellCount: 192,
      weight: 482,
      totalEnergy: 84,
    });
    await expect(page.getByText('Solid-State Pilot Pack')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('mobile compliance register keeps queue reading order and permission gate intact', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'RegulatorMSP');

    await expect(page.getByText('Compliance review register')).toBeVisible();
    await expect(page.getByText('Register progression')).toBeVisible();
    await expect(page.getByText('Next register check').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '여권 발급' })).toHaveCount(0);
    await page.screenshot({ path: 'screenshots/c02_m08_passports_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
