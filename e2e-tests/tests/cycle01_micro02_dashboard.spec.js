const { test, expect } = require('@playwright/test');
require('./cycle02_micro01_maintenance.shared.js');
require('./cycle02_micro02_materials.shared.js');
require('./cycle02_micro03_recycling.shared.js');
require('./cycle02_micro04_audit.shared.js');
require('./cycle02_micro05_qr_scan.shared.js');
require('./cycle02_micro06_bmu.shared.js');
require('./cycle02_micro07_dashboard.shared.js');
require('./cycle02_micro08_passports.shared.js');
require('./cycle02_micro09_detail.shared.js');
require('./cycle02_micro10_login.shared.js');
require('./cycle02_micro11_shell.shared.js');
require('./cycle02_micro12_shell_nav.shared.js');
require('./cycle02_micro13_shell_status.shared.js');
require('./cycle02_micro14_toast.shared.js');
require('./cycle02_micro15_passports_stamp.shared.js');
require('./cycle03_micro01_dashboard_density.shared.js');

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

const history = [
  JSON.stringify({
    passportId: PASSPORT_ID,
    status: 'MANUFACTURED',
    createdAt: '2026-03-04T08:00:00.000Z',
    updatedAt: '2026-03-04T08:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  }),
  JSON.stringify({
    passportId: PASSPORT_ID,
    status: 'ACTIVE',
    vin: 'KMHBATP240403001',
    createdAt: '2026-03-18T09:00:00.000Z',
    updatedAt: '2026-03-18T09:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  }),
  JSON.stringify({
    passportId: PASSPORT_ID,
    status: 'ACTIVE',
    vin: 'KMHBATP240403001',
    createdAt: '2026-03-21T03:00:00.000Z',
    updatedAt: '2026-03-21T03:00:00.000Z',
    maintenanceLogs: passport.maintenanceLogs,
    accidentLogs: [],
  }),
  JSON.stringify({
    passportId: PASSPORT_ID,
    status: 'ACTIVE',
    vin: 'KMHBATP240403001',
    createdAt: '2026-03-27T11:20:00.000Z',
    updatedAt: '2026-03-27T11:20:00.000Z',
    maintenanceLogs: passport.maintenanceLogs,
    accidentLogs: passport.accidentLogs,
  }),
];

const vcs = [
  {
    credentialId: 'VC-BP-2026-001',
    credType: 'BATTERY_PASSPORT',
    status: 'ACTIVE',
    issuerMsp: 'ManufacturerMSP',
    issuedAt: '2026-04-01T09:00:00.000Z',
  },
];

const corrections = [
  {
    fieldName: 'manufactureCountry',
    originalValue: 'KOR',
    newValue: 'KR',
    reason: '국가 코드 정규화',
    date: '2026-03-25T08:30:00.000Z',
    correctedBy: 'regulator.park',
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
      return json(route, { records: [passport] });
    }

    if (path === `/api/passports/${PASSPORT_ID}`) {
      return json(route, passport);
    }

    if (path === `/api/passports/${PASSPORT_ID}/vehicle-image`) {
      return json(route, { exists: false, path: null });
    }

    if (path === `/api/passports/${PASSPORT_ID}/history`) {
      return json(route, { records: history });
    }

    if (path === `/api/passports/${PASSPORT_ID}/corrections`) {
      return json(route, { records: corrections });
    }

    if (path === '/api/materials') {
      return json(route, { records: materials });
    }

    if (path === `/api/bmu/records/${PASSPORT_ID}`) {
      return json(route, { records: bmuRecords });
    }

    if (path === `/api/vc/passport/${PASSPORT_ID}`) {
      return json(route, { records: vcs });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, hash = `#passport-detail?passportId=${PASSPORT_ID}`) {
  await installMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'issuer-admin');
    localStorage.setItem('bp_orgMsp', 'ManufacturerMSP');
  });
  const targetHash = hash.replace(/^#/, '');
  await page.goto(`${BASE}/#${targetHash}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Technical Dossier')).toBeVisible();
  await expect(page.getByText('Filed Identity Register')).toBeVisible();
}

test.describe('Cycle 01 / Micro 11 — Passport Detail Section Hierarchy', () => {
  test('identity dossier hierarchy renders', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.getByText('Section hierarchy')).toBeVisible();
    await expect(page.getByText('§1.1 Registry identifiers', { exact: true })).toBeVisible();
    await expect(page.getByText('§1.2 Technical rating', { exact: true })).toBeVisible();
    await expect(page.getByText('§1.3 Vehicle binding', { exact: true })).toBeVisible();
    await expect(page.getByText('§1.4 Operating indices', { exact: true })).toBeVisible();
    await expect(page.getByText('식별 서류 하위에서 정정과 원자재 연결 조치를 바로 이어갑니다.')).toBeVisible();

    await page.screenshot({
      path: 'screenshots/c01_m11_detail_identity.png',
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  test('section grouping holds across traceability, data, trust tabs', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await page.getByRole('main').getByRole('button', { name: '정비/이력' }).click();
    await expect(page.getByRole('heading', { name: 'Lifecycle Service Chain' })).toBeVisible();
    await expect(page.getByText('§3.1 Lifecycle chain', { exact: true })).toBeVisible();
    await expect(page.getByText('§3.2 Material lineage', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'screenshots/c01_m11_detail_traceability.png',
      fullPage: true,
    });

    await page.getByRole('main').getByRole('button', { name: '배터리 데이터' }).click();
    await expect(page.getByRole('heading', { name: 'Telemetry Evidence Ledger' })).toBeVisible();
    await expect(page.getByText('BMU evidence ledger', { exact: true })).toBeVisible();
    await expect(page.getByText('BMU-REC-20260403-001')).toBeVisible();
    await page.screenshot({
      path: 'screenshots/c01_m11_detail_data.png',
      fullPage: true,
    });

    await page.getByRole('main').getByRole('button', { name: '신뢰성' }).click();
    await expect(page.getByRole('heading', { name: 'Trust Verification Register' })).toBeVisible();
    await expect(page.getByText('§5.3 Credential register', { exact: true })).toBeVisible();
    await expect(page.getByText('§5.4 Correction ledger', { exact: true })).toBeVisible();
    await page.screenshot({
      path: 'screenshots/c01_m11_detail_trust.png',
      fullPage: true,
    });

    expect(errors).toEqual([]);
  });

  test('mobile reading order remains legible', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await bootstrap(page);

    await expect(page.getByText('Mobile reading order')).toBeVisible();
    await expect(page.getByText('모바일에서는 식별 등록값 -> 기술 사양 -> EV 바인딩 -> 운영 지표 순서로 읽히도록 유지합니다.')).toBeVisible();

    await page.screenshot({
      path: 'screenshots/c01_m11_detail_mobile.png',
      fullPage: true,
    });

    expect(errors).toEqual([]);
    await context.close();
  });
});
