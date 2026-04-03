const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passports = [
  {
    passportId: 'PASSPORT-BMU-DEVICE',
    batteryId: 'BAT-82K-0001',
    serialNumber: 'SN-BMU-240403',
    model: 'NCM 82kWh Pack',
    manufacturerName: 'LG Energy Solution',
    chemistry: 'NCM',
    status: 'ACTIVE',
    currentSoc: 72,
    currentSoh: 93,
    vin: 'KMHBATP240403001',
    recycleAvailable: true,
    createdAt: '2026-04-03T07:20:00.000Z',
  },
  {
    passportId: 'PASSPORT-BMU-DEVICE-02',
    batteryId: 'BAT-90K-0002',
    serialNumber: 'SN-BMU-240404',
    model: 'LFP 90kWh Pack',
    manufacturerName: 'SK On',
    chemistry: 'LFP',
    status: 'MAINTENANCE',
    currentSoc: 58,
    currentSoh: 89,
    vin: '',
    recycleAvailable: false,
    createdAt: '2026-04-02T07:20:00.000Z',
  },
];

const materials = [
  { materialId: 'MAT-LI-01', name: 'Lithium Carbonate' },
  { materialId: 'MAT-NI-02', name: 'Nickel Sulfate' },
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
        org: 'ManufacturerMSP',
      });
    }

    if (path === '/api/passports') {
      return json(route, { records: passports });
    }

    if (path === '/api/materials') {
      return json(route, { records: materials });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, hash = '#dashboard') {
  await installMocks(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((targetHash) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'issuer-admin');
    localStorage.setItem('bp_orgMsp', 'ManufacturerMSP');
    window.location.hash = targetHash.replace(/^#/, '');
  }, hash);
  await page.reload({ waitUntil: 'domcontentloaded' });
}

test.describe('Cycle 01 / Micro 14 — Shell And Action Grammar', () => {
  test('desktop shell keeps dossier nav and CTA tone', async ({ page }) => {
    test.setTimeout(120000);
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 960 });
    await bootstrap(page, '#dashboard');

    await expect(page.getByText('BatteryPass')).toBeVisible();
    await expect(page.getByRole('button', { name: '대시보드' })).toBeVisible();
    await expect(page.getByRole('button', { name: '배터리 여권' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Issuance Register' })).toBeVisible();

    const dashboardCtaStyle = await page.evaluate(() => {
      const dashboardCta = Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Issuance Register'));
      if (!dashboardCta) return null;
      const style = getComputedStyle(dashboardCta);
      return {
        bg: style.backgroundColor,
        color: style.color,
      };
    });

    expect(dashboardCtaStyle).not.toBeNull();
    expect(dashboardCtaStyle.bg).toBe('rgb(17, 24, 39)');
    await page.screenshot({ path: 'screenshots/c01_m14_shell_dashboard.png', fullPage: false });

    await page.getByRole('button', { name: '배터리 여권' }).click();
    await expect(page.getByText('Passport Register')).toBeVisible();
    await expect(page.getByRole('button', { name: '여권 발급' }).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c01_m14_shell_passports.png', fullPage: false });

    await page.getByRole('button', { name: '여권 발급' }).first().click();
    await expect(page.getByText('Passport Issuance')).toBeVisible();

    const ctaStyles = await page.evaluate(() => {
      const openButton = Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('여권 발급'));
      if (!openButton) return null;
      const openStyle = getComputedStyle(openButton);
      return {
        openBg: openStyle.backgroundColor,
        openColor: openStyle.color,
      };
    });

    expect(ctaStyles).not.toBeNull();
    expect(ctaStyles.openBg).toBe('rgb(17, 24, 39)');
    expect(errors).toEqual([]);

    await page.screenshot({ path: 'screenshots/c01_m14_shell_modal.png', fullPage: false });
  });
});
