const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

const passport = {
  passportId: 'PASSPORT-SCAN-001',
  serialNumber: 'SN-SCAN-001',
  model: 'NCM 72kWh Pack',
  manufacturerName: 'Samsung SDI',
  chemistry: 'NCM',
  totalEnergy: 72,
  status: 'ACTIVE',
  vin: 'KMHSCAN240403001',
  did: 'did:example:passport-scan-001',
};

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

    if (path === `/api/passports/${passport.passportId}`) {
      return json(route, passport);
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, { orgMsp, nfcSupport = false } = {}) {
  await installMocks(page);
  await page.addInitScript(({ org, enableNfc }) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'scan-user');
    localStorage.setItem('bp_orgMsp', org);

    if (enableNfc) {
      window.NDEFReader = class {
        async scan() { return; }
        addEventListener() {}
      };
    }
  }, { org: orgMsp, enableNfc: nfcSupport });
  await page.goto(`${BASE}/#qr-scan`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('QR / NFC Passport Intake')).toBeVisible();
}

test.describe('Cycle 02 / Micro 05 — QR Intake Station', () => {
  test('manual intake files token into dossier result card', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, { orgMsp: 'ManufacturerMSP' });

    await expect(page.getByText('Issuer intake station')).toBeVisible();
    await expect(page.getByText('Filed intake dossier')).toBeVisible();
    await page.locator('input[placeholder="예: PASSPORT-001"]').fill(passport.passportId);
    await page.getByRole('button', { name: 'File intake token' }).click();

    await expect(page.getByText('Dossier matched')).toBeVisible();
    await expect(page.getByText('Samsung SDI')).toBeVisible();
    await expect(page.getByText('Open lifecycle dossier')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m05_qr_manual.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('supported NFC channel arms without breaking intake station grammar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, { orgMsp: 'ServiceMSP', nfcSupport: true });

    await expect(page.getByText('Field service intake station')).toBeVisible();
    await page.getByRole('button', { name: 'Arm NFC' }).click();
    await expect(page.getByText('Channel NFC armed')).toBeVisible();
    await expect(page.getByText('NFC State')).toBeVisible();
    await expect(page.getByText('대기 중')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m05_qr_nfc.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile fallback keeps unsupported NFC guidance readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page, { orgMsp: 'RegulatorMSP' });

    await expect(page.getByText('Compliance intake station')).toBeVisible();
    await expect(page.getByText('Result stage')).toBeVisible();
    await expect(page.getByText('미지원')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m05_qr_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
