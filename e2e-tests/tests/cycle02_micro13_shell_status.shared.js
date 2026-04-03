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
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/status') {
      return json(route, {
        fabric: 'connected',
        channel: 'passportchannel',
        contract: 'passport-contract',
        org: 'ServiceMSP',
      });
    }
    if (path === '/api/passports') return json(route, { records: [] });
    if (path === '/api/materials') return json(route, { records: [] });
    return json(route, { ok: true });
  });
}

async function bootstrap(page) {
  await installMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'service.operator');
    localStorage.setItem('bp_orgMsp', 'ServiceMSP');
  });
  await page.goto(`${BASE}/#dashboard`, { waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 02 / Micro 13 — Shell Status Lane', () => {
  test('desktop shell shows network posture and session holder cards', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.getByText('연결 상태')).toBeVisible();
    await expect(page.getByText('Fabric 연결됨')).toBeVisible();
    await expect(page.getByText('세션 사용자')).toBeVisible();
    await expect(page.getByText('service.operator').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m13_shell_status_desktop.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile shell keeps compact fabric posture visible', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.getByRole('banner').getByText('Fabric', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m13_shell_status_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
