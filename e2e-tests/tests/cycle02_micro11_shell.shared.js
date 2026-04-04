const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  {
    passportId: 'PASSPORT-SHELL-001',
    status: 'MAINTENANCE',
    recycleAvailable: false,
    manufacturerName: 'LG Energy Solution',
    model: 'Shell Pack 1',
    currentSoc: 68,
    currentSoh: 91,
    vin: 'KMHSHELL001',
  },
  {
    passportId: 'PASSPORT-SHELL-002',
    status: 'ANALYSIS',
    recycleAvailable: true,
    manufacturerName: 'Samsung SDI',
    model: 'Shell Pack 2',
    currentSoc: 42,
    currentSoh: 76,
    vin: 'KMHSHELL002',
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
        org: 'ServiceMSP',
      });
    }

    if (path === '/api/passports') {
      return json(route, { records: passports });
    }

    if (path === '/api/materials') {
      return json(route, { records: [] });
    }

    if (path.startsWith('/api/audit')) {
      return json(route, {
        records: [
          {
            txId: 'AUDIT-001',
            action: 'QUERY',
            resource: '/passports',
            actor: 'service.operator',
            timestamp: '2026-04-03T09:00:00.000Z',
            method: 'GET',
            statusCode: 200,
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1 },
      });
    }

    return json(route, { ok: true });
  });
}

async function bootstrap(page, hash = '#dashboard') {
  await installMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'service.operator');
    localStorage.setItem('bp_orgMsp', 'ServiceMSP');
  });
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 02 / Micro 11 — Operations Shell Context Ribbon', () => {
  test('dashboard shell shows shell ribbon and pending count', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, '#dashboard');

    await expect(page.locator('p').filter({ hasText: /^운영 맥락$/ })).toBeVisible();
    await expect(page.getByRole('banner').getByRole('heading', { name: '운영 현황' })).toBeVisible();
    await expect(page.getByText('대기 건수', { exact: true })).toBeVisible();
    await expect(page.locator('div').filter({ hasText: /^2$/ }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m11_shell_dashboard.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('desktop nav updates shell ribbon when switching to audit ledger', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, '#dashboard');

    await page.getByRole('button', { name: '감사 로그' }).click();
    await expect(page.getByText('감사 기록부')).toBeVisible();
    await expect(page.getByText('현재 화면', { exact: true })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m11_shell_audit.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile shell keeps ribbon and menu readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, '#dashboard');

    await expect(page.locator('p').filter({ hasText: /^운영 맥락$/ })).toBeVisible();
    await page.locator('button.lg\\:hidden').first().click();
    await expect(page.getByRole('button', { name: '감사 로그' }).last()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m11_shell_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
