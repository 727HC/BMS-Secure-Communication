const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installMocks(page) {
  const state = {
    lastLogin: null,
    lastRegister: null,
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

    if (path === '/api/auth/login' && method === 'POST') {
      state.lastLogin = JSON.parse(route.request().postData() || '{}');
      return json(route, {
        token: 'mock-token',
        userId: state.lastLogin.userId,
        orgMsp: 'ManufacturerMSP',
      });
    }

    if (path === '/api/auth/register' && method === 'POST') {
      state.lastRegister = JSON.parse(route.request().postData() || '{}');
      return json(route, { ok: true });
    }

    if (path === '/api/passports') return json(route, { records: [] });
    if (path === '/api/materials') return json(route, { records: [] });

    return json(route, { ok: true });
  });

  return state;
}

async function openLogin(page) {
  const state = await installMocks(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_userId');
    localStorage.removeItem('bp_orgMsp');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Access Intake' })).toBeVisible();
  return state;
}

test.describe('Cycle 02 / Micro 10 — Login Checkpoint Progression', () => {
  test('desktop checkpoint shows progression and preserves login submit flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const state = await openLogin(page);

    await expect(page.getByText('Checkpoint progression')).toBeVisible();
    await expect(page.getByText('Next access action')).toBeVisible();
    await expect(page.getByText('Submit credential checkpoint')).toBeVisible();

    await page.locator('input[placeholder=\"예: issuer.operator.01\"]').fill('issuer.operator.01');
    await page.locator('input[placeholder=\"접속 비밀번호 입력\"]').fill('pw-issuer');
    await page.getByRole('button', { name: '접속 승인 요청' }).click();

    expect(state.lastLogin).toMatchObject({
      userId: 'issuer.operator.01',
      password: 'pw-issuer',
      orgNum: 1,
    });
    await page.screenshot({ path: 'screenshots/c02_m10_login_checkpoint.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('register intake keeps enrollment wording and request flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const state = await openLogin(page);

    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Checkpoint progression')).toBeVisible();
    await expect(page.getByText('File enrollment request')).toBeVisible();
    await page.getByRole('button', { name: '검증기관' }).click();
    await page.locator('input[placeholder=\"예: issuer.operator.01\"]').fill('regulator.new');
    await page.locator('input[placeholder=\"접속 비밀번호 입력\"]').fill('pw-reg');
    await page.getByRole('button', { name: '등록 요청 제출' }).click();

    expect(state.lastRegister).toMatchObject({
      userId: 'regulator.new',
      password: 'pw-reg',
      orgNum: 4,
    });
    await page.screenshot({ path: 'screenshots/c02_m10_login_register.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile checkpoint keeps next action readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await openLogin(page);
    await page.getByRole('button', { name: '검증기관' }).click();

    await expect(page.getByText('Next access action')).toBeVisible();
    await expect(page.getByText('Submit credential checkpoint')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m10_login_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
