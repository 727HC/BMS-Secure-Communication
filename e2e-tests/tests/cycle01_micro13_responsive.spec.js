const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
const PASSPORT_ID = 'PASSPORT-BMU-DEVICE';

const passport = {
  passportId: PASSPORT_ID,
  batteryId: 'BAT-82K-0001',
  serialNumber: 'SN-BMU-240403',
  model: 'NCM 82kWh Pack',
  manufacturerName: 'LG Energy Solution',
  manufactureCountry: 'KR',
  cellManufacturer: 'LG Energy Solution',
  cellManufactureCountry: 'KR',
  manufactureDate: '2026-03-01T09:00:00.000Z',
  cellType: 'Pouch',
  chemistry: 'NCM',
  cellCount: 384,
  weight: 486,
  totalEnergy: 82,
  energyDensity: 168,
  ratedCapacity: 228,
  expectedLifespan: 3200,
  voltageRange: '280~350~403',
  temperatureRange: '-20~60',
  carbonFootprint: 0,
  containsHazardous: false,
  recycleAvailable: true,
  rawMaterials: ['MAT-LI-01', 'MAT-NI-02'],
  status: 'ACTIVE',
  currentSoc: 72,
  currentSoh: 93,
  soce: 88,
  vin: 'KMHBATP240403001',
  evManufacturer: 'Hyundai Motor',
  installDate: '2026-03-18T09:00:00.000Z',
  evAssemblyCountry: 'KR',
  did: 'did:example:passport-bmu-device',
  creatorMsp: 'ManufacturerMSP',
  createdAt: '2026-03-04T08:00:00.000Z',
  updatedAt: '2026-04-03T07:20:00.000Z',
  maintenanceLogs: [
    {
      date: '2026-03-21T03:00:00.000Z',
      type: 'routine',
      description: '열 관리 점검 및 토크 재확인',
      technician: 'svc.kim',
    },
  ],
  accidentLogs: [
    {
      date: '2026-03-27T11:20:00.000Z',
      severity: 'minor',
      description: '운송 중 외함 표면 스크래치 확인',
      reporter: 'logistics.choi',
    },
  ],
};

const passports = [
  passport,
  {
    ...passport,
    passportId: 'PASSPORT-BMU-DEVICE-02',
    batteryId: 'BAT-90K-0002',
    serialNumber: 'SN-BMU-240404',
    model: 'LFP 90kWh Pack',
    chemistry: 'LFP',
    currentSoc: 58,
    currentSoh: 89,
    vin: '',
    recycleAvailable: false,
    status: 'MAINTENANCE',
  },
];

const materials = [
  {
    materialId: 'MAT-LI-01',
    name: 'Lithium Carbonate',
    origin: 'AU',
    supplier: 'Pilbara Minerals',
    quantity: 42,
    unit: 'kg',
    certificationId: 'CERT-LI-2026-01',
  },
  {
    materialId: 'MAT-NI-02',
    name: 'Nickel Sulfate',
    origin: 'ID',
    supplier: 'PT Vale',
    quantity: 58,
    unit: 'kg',
    certificationId: 'CERT-NI-2026-02',
  },
];

const bmuRecords = [
  {
    recordId: 'BMU-REC-20260403-001',
    timestamp: '2026-04-03T07:15:00.000Z',
    soc: 72,
    voltage: 396,
    current: 18,
    temperature: 28,
    dischargeCycles: 182,
    statusFlags: 0x03,
    status: 'VALID',
  },
  {
    recordId: 'BMU-REC-20260403-000',
    timestamp: '2026-04-03T06:45:00.000Z',
    soc: 69,
    voltage: 392,
    current: 12,
    temperature: 27,
    dischargeCycles: 181,
    statusFlags: 0x00,
    status: 'VALID',
  },
];

const auditRecords = [
  {
    id: 'AUD-001',
    action: 'CREATE_PASSPORT',
    userId: 'issuer-admin',
    method: 'POST',
    path: '/api/passports',
    statusCode: 200,
    duration: 124,
    timestamp: '2026-04-03T07:20:00.000Z',
    orgMsp: 'ManufacturerMSP',
    requestBody: { passportId: PASSPORT_ID },
  },
  {
    id: 'AUD-002',
    action: 'RECORD_BMU',
    userId: 'bmu-agent',
    method: 'POST',
    path: '/api/bmu/data',
    statusCode: 200,
    duration: 82,
    timestamp: '2026-04-03T07:15:00.000Z',
    orgMsp: 'ManufacturerMSP',
    requestBody: { recordId: 'BMU-REC-20260403-001' },
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
        org: 'ManufacturerMSP',
      });
    }

    if (path === '/api/passports') {
      return json(route, { records: passports });
    }

    if (path === `/api/passports/${PASSPORT_ID}`) {
      return json(route, passport);
    }

    if (path === `/api/passports/${PASSPORT_ID}/vehicle-image`) {
      return json(route, { exists: false, path: null });
    }

    if (path === '/api/materials') {
      return json(route, { records: materials });
    }

    if (path === `/api/bmu/records/${encodeURIComponent(PASSPORT_ID)}` || path === `/api/bmu/records/${PASSPORT_ID}`) {
      return json(route, { records: bmuRecords });
    }

    if (path === '/api/audit') {
      return json(route, { records: auditRecords, total: auditRecords.length });
    }

    if (path === `/api/passports/${PASSPORT_ID}/history`) {
      return json(route, { records: [] });
    }

    if (path === `/api/passports/${PASSPORT_ID}/corrections`) {
      return json(route, { records: [] });
    }

    if (path === `/api/vc/passport/${PASSPORT_ID}`) {
      return json(route, { records: [] });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, hash, orgMsp = 'ManufacturerMSP') {
  await installMocks(page);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ targetHash, org }) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'issuer-admin');
    localStorage.setItem('bp_orgMsp', org);
    window.location.hash = targetHash.replace(/^#/, '');
  }, { targetHash: hash, org: orgMsp });
  await page.reload({ waitUntil: 'domcontentloaded' });
}

async function assertNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    docWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.docWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.innerWidth + 2);
}

test.describe('Cycle 01 / Micro 13 — Responsive Dossier', () => {
  test('mobile key screens avoid horizontal overflow', async ({ browser }) => {
    test.setTimeout(120000);
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Access Intake')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'screenshots/c01_m13_login_mobile.png', fullPage: true });

    await bootstrap(page, '#dashboard');
    await expect(page.getByText('Operations Brief')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'screenshots/c01_m13_dashboard_mobile.png', fullPage: true });

    await bootstrap(page, '#passports');
    await expect(page.getByText('Passport Register')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'screenshots/c01_m13_passports_mobile.png', fullPage: true });

    await page.getByRole('button', { name: '여권 발급' }).click();
    const modalFits = await page.evaluate(() => {
      const modal = document.querySelector('.bp-passport-modal-shell');
      if (!modal) return false;
      return modal.getBoundingClientRect().height <= window.innerHeight - 8;
    });
    expect(modalFits).toBeTruthy();
    await page.screenshot({ path: 'screenshots/c01_m13_passports_modal_mobile.png', fullPage: true });

    await bootstrap(page, `#passport-detail?passportId=${PASSPORT_ID}`);
    await expect(page.getByText('Filed Identity Register')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'screenshots/c01_m13_detail_mobile.png', fullPage: true });

    await bootstrap(page, '#bmu-data');
    await page.getByPlaceholder('예: PASSPORT-001').fill(PASSPORT_ID);
    await page.getByRole('button', { name: 'Open Evidence Ledger' }).click();
    await expect(page.getByText('Passport telemetry evidence')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'screenshots/c01_m13_bmu_mobile.png', fullPage: true });

    await bootstrap(page, '#audit-log');
    await expect(page.getByText('Audit Event Register')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'screenshots/c01_m13_audit_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
