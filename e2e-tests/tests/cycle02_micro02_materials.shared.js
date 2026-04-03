const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const seedMaterials = [
  {
    materialId: 'MAT-CO-01',
    name: 'Cobalt Hydroxide',
    origin: 'CD',
    supplier: 'Metalkol',
    quantity: 18,
    unit: 'kg',
    certificationId: 'CERT-CO-2026-01',
    creatorMsp: 'ManufacturerMSP',
    createdAt: '2026-04-01T08:00:00.000Z',
  },
  {
    materialId: 'MAT-LI-02',
    name: 'Lithium Carbonate',
    origin: 'AU',
    supplier: 'Pilbara Minerals',
    quantity: 42,
    unit: 'kg',
    certificationId: '',
    creatorMsp: 'ManufacturerMSP',
    createdAt: '2026-04-02T08:00:00.000Z',
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
    records: seedMaterials.map((record) => ({ ...record })),
    lastPosted: null,
  };

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

    if (path === '/api/materials' && method === 'GET') {
      return json(route, { records: state.records });
    }

    if (path === '/api/materials' && method === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}');
      state.lastPosted = payload;
      state.records = [
        {
          ...payload,
          creatorMsp: 'ManufacturerMSP',
          createdAt: '2026-04-03T09:30:00.000Z',
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
    localStorage.setItem('bp_userId', 'materials-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#materials`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Raw Material Filing')).toBeVisible();
  return state;
}

test.describe('Cycle 02 / Micro 02 — Materials Provenance Filing', () => {
  test('manufacturer desk shows provenance progression and dossier action grammar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ManufacturerMSP');

    await expect(page.getByText('Manufacturer filing desk')).toBeVisible();
    await expect(page.getByText('Filing progression')).toBeVisible();
    await expect(page.getByText('Open provenance dossier')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m02_materials_desk.png', fullPage: true });

    await page.getByText('Cobalt Hydroxide').click();
    await expect(page.getByText('Provenance dossier', { exact: true })).toBeVisible();
    await expect(page.getByText('Certification filing linked')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m02_materials_detail.png', fullPage: false });

    expect(errors).toEqual([]);
  });

  test('filing modal keeps create flow and refreshes the ledger', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const state = await bootstrap(page, 'ManufacturerMSP');

    await page.getByRole('button', { name: 'File provenance lot' }).click();
    await expect(page.getByRole('heading', { name: 'Provenance lot filing' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m02_materials_filing_modal.png', fullPage: false });

    await page.locator('input[placeholder="예: 리튬, 코발트, 니켈"]').fill('Graphite Powder');
    await page.locator('input[placeholder="예: 호주"]').fill('CA');
    await page.locator('input[placeholder="예: ABC Mining"]').fill('Northern Graphite');
    await page.locator('input[placeholder="0"]').fill('27');
    await page.locator('input[placeholder="인증서 번호"]').fill('CERT-GR-2026-03');

    await page.getByRole('button', { name: 'File lot' }).click();

    await expect(page.getByText('Graphite Powder')).toBeVisible();
    expect(state.lastPosted).toMatchObject({
      name: 'Graphite Powder',
      origin: 'CA',
      supplier: 'Northern Graphite',
      quantity: 27,
      unit: 'kg',
      certificationId: 'CERT-GR-2026-03',
    });
    expect(errors).toEqual([]);
  });

  test('read-only mobile desk keeps sequence readable and permission gate intact', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, 'ServiceMSP');

    await expect(page.getByText('Read-only provenance desk')).toBeVisible();
    await expect(page.getByText('Review provenance dossier')).toBeVisible();
    await expect(page.getByRole('button', { name: 'File provenance lot' })).toHaveCount(0);
    await page.screenshot({ path: 'screenshots/c02_m02_materials_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
