const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installLoginMocks(page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/status') return json(route, { fabric: 'connected' });
    if (path === '/api/auth/register' && method === 'POST') return json(route, { ok: true });
    if (path === '/api/auth/login' && method === 'POST') {
      return json(route, { token: 'mock-token', userId: 'issuer.user', mspId: 'ManufacturerMSP' });
    }
    return json(route, { ok: true });
  });
}

async function openLogin(page) {
  await installLoginMocks(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_userId');
    localStorage.removeItem('bp_orgMsp');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function installMaterialsMocks(page) {
  let records = [
    {
      materialId: 'MAT-TOAST-001',
      name: 'Nickel Sulfate',
      origin: 'ID',
      supplier: 'PT Vale',
      quantity: 28,
      unit: 'kg',
      certificationId: '',
      creatorMsp: 'ManufacturerMSP',
      createdAt: '2026-04-03T08:00:00.000Z',
    },
  ];

  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    if (path === '/api/status') return json(route, { fabric: 'connected' });
    if (path === '/api/materials' && method === 'GET') return json(route, { records });
    if (path === '/api/materials' && method === 'POST') {
      const payload = JSON.parse(route.request().postData() || '{}');
      records = [{ ...payload, creatorMsp: 'ManufacturerMSP', createdAt: '2026-04-03T09:00:00.000Z' }, ...records];
      return json(route, { ok: true });
    }
    return json(route, { ok: true });
  });
}

async function openMaterials(page) {
  await installMaterialsMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'issuer.user');
    localStorage.setItem('bp_orgMsp', 'ManufacturerMSP');
  });
  await page.goto(`${BASE}/#materials`, { waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 02 / Micro 14 — Document Toast Notices', () => {
  test('register success shows notice-style toast', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openLogin(page);

    await page.getByRole('button', { name: 'Register' }).click();
    await page.locator('input[placeholder="예: issuer.operator.01"]').fill('notice.user');
    await page.locator('input[placeholder="접속 비밀번호 입력"]').fill('pw-notice');
    await page.getByRole('button', { name: '등록 요청 제출' }).click();

    await expect(page.locator('span').filter({ hasText: /^NOTICE$/ }).first()).toBeVisible();
    await expect(page.getByText('Ledger notice')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m14_toast_register.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('materials filing success shows notice-style toast on authenticated shell', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openMaterials(page);

    await page.getByRole('button', { name: 'File provenance lot' }).click();
    await page.locator('input[placeholder="예: 리튬, 코발트, 니켈"]').fill('Graphite Toast');
    await page.locator('input[placeholder="예: 호주"]').fill('CA');
    await page.locator('input[placeholder="예: ABC Mining"]').fill('North Graphite');
    await page.locator('input[placeholder="0"]').fill('21');
    await page.getByRole('button', { name: 'File lot' }).click();

    await expect(page.locator('span').filter({ hasText: /^NOTICE$/ }).first()).toBeVisible();
    await expect(page.getByText('Ledger notice')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m14_toast_materials.png', fullPage: true });

    expect(errors).toEqual([]);
  });
});
