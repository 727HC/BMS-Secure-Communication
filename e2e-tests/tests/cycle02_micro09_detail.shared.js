const { test, expect } = require('@playwright/test');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';

function createPassport(overrides = {}) {
  return {
    passportId: 'PASSPORT-DETAIL-009',
    batteryId: 'BAT-DETAIL-009',
    serialNumber: 'SN-DETAIL-009',
    model: 'Passport Dossier Pack 77kWh',
    manufacturerName: 'LG Energy Solution',
    manufactureCountry: 'KR',
    cellManufacturer: 'LG Energy Solution',
    cellManufactureCountry: 'KR',
    manufactureDate: '2026-03-01T09:00:00.000Z',
    cellType: 'Pouch',
    chemistry: 'NCM',
    cellCount: 384,
    weight: 470,
    totalEnergy: 77,
    energyDensity: 164,
    ratedCapacity: 218,
    expectedLifespan: 3100,
    voltageRange: '280~350~403',
    temperatureRange: '-20~60',
    carbonFootprint: 0,
    containsHazardous: false,
    recycleAvailable: false,
    rawMaterials: [],
    status: 'ACTIVE',
    currentSoc: 72,
    currentSoh: 93,
    soce: 88,
    vin: 'KMHDETAIL240403009',
    evManufacturer: 'Hyundai Motor',
    installDate: '2026-03-18T09:00:00.000Z',
    evAssemblyCountry: 'KR',
    did: 'did:example:passport-detail-009',
    creatorMsp: 'ManufacturerMSP',
    createdAt: '2026-03-04T08:00:00.000Z',
    updatedAt: '2026-04-03T07:20:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
    ...overrides,
  };
}

const materials = [
  {
    materialId: 'MAT-LI-009',
    name: 'Lithium Carbonate',
    origin: 'AU',
    supplier: 'Pilbara Minerals',
    quantity: 42,
    unit: 'kg',
    certificationId: 'CERT-LI-2026-09',
    creatorMsp: 'ManufacturerMSP',
    createdAt: '2026-03-02T08:00:00.000Z',
  },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installMocks(page, passport) {
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

    if (path === `/api/passports/${passport.passportId}/vehicle-image`) {
      return json(route, { exists: false, path: null });
    }

    if (path === `/api/passports/${passport.passportId}/history`) {
      return json(route, {
        records: [
          JSON.stringify({
            passportId: passport.passportId,
            status: 'MANUFACTURED',
            createdAt: '2026-03-04T08:00:00.000Z',
            updatedAt: '2026-03-04T08:00:00.000Z',
            maintenanceLogs: [],
            accidentLogs: [],
          }),
          JSON.stringify({
            passportId: passport.passportId,
            status: passport.status,
            vin: passport.vin,
            createdAt: passport.updatedAt,
            updatedAt: passport.updatedAt,
            maintenanceLogs: passport.maintenanceLogs,
            accidentLogs: passport.accidentLogs,
          }),
        ],
      });
    }

    if (path === `/api/passports/${passport.passportId}/corrections`) {
      return json(route, {
        records: [
          {
            fieldName: 'manufactureCountry',
            originalValue: 'KOR',
            newValue: 'KR',
            reason: '국가 코드 정규화',
            date: '2026-03-25T08:30:00.000Z',
            correctedBy: 'regulator.park',
          },
        ],
      });
    }

    if (path === '/api/materials') {
      return json(route, { records: materials });
    }

    if (path === `/api/bmu/records/${passport.passportId}`) {
      return json(route, {
        records: [
          {
            recordId: 'BMU-REC-20260403-009',
            timestamp: '2026-04-03T07:15:00.000Z',
            soc: 72,
            voltage: 396,
            current: 18,
            temperature: 28,
            dischargeCycles: 182,
            statusFlags: 0x03,
            status: 'VALID',
          },
        ],
      });
    }

    if (path === `/api/vc/passport/${passport.passportId}`) {
      return json(route, {
        records: [
          {
            credentialId: 'VC-BP-2026-009',
            credType: 'BATTERY_PASSPORT',
            status: 'ACTIVE',
            issuerMsp: 'ManufacturerMSP',
            issuedAt: '2026-04-01T09:00:00.000Z',
          },
        ],
      });
    }

    return json(route, { error: `Unhandled mock path: ${path}` }, 404);
  });
}

async function bootstrap(page, orgMsp, passport) {
  await installMocks(page, passport);
  await page.addInitScript((org) => {
    localStorage.setItem('bp_token', 'mock-token');
    localStorage.setItem('bp_userId', 'detail-user');
    localStorage.setItem('bp_orgMsp', org);
  }, orgMsp);
  await page.goto(`${BASE}/#passport-detail?passportId=${passport.passportId}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: passport.model, level: 1 })).toBeVisible();
}

test.describe('Cycle 02 / Micro 09 — Passport Detail Dossier Handoff', () => {
  test('manufacturer dossier shows handoff cover and material action docket', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const passport = createPassport({ rawMaterials: [] });
    await bootstrap(page, 'ManufacturerMSP', passport);

    await expect(page.getByText('핵심 식별')).toBeVisible();
    await expect(page.getByText('문서 조치')).toBeVisible();
    await expect(page.getByText('원자재 연결').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m09_detail_cover.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('service traceability dossier shows completion-first action grammar', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const passport = createPassport({
      status: 'MAINTENANCE',
      maintenanceLogs: [
        {
          date: '2026-03-21T03:00:00.000Z',
          type: 'routine',
          description: '열 관리 점검 및 토크 재확인',
          technician: 'svc.kim',
        },
      ],
    });
    await bootstrap(page, 'ServiceMSP', passport);

    await expect(page.getByText('정비 작업 진행').first()).toBeVisible();
    await expect(page.getByText('정비 완료 등록').first()).toBeVisible();
    await page.getByRole('button', { name: '운영 이력' }).click();
    await expect(page.getByText('최근 운영 이벤트')).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m09_detail_traceability.png', fullPage: true });

    expect(errors).toEqual([]);
  });

  test('mobile regulator dossier keeps disposition action readable', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const passport = createPassport({
      status: 'RECYCLING',
      recycleAvailable: true,
      currentSoc: 0.24,
      currentSoh: 54,
    });
    await bootstrap(page, 'RegulatorMSP', passport);

    await expect(page.getByText('회수 판정 진행').first()).toBeVisible();
    await expect(page.getByText('추출 검토 또는 종료 판정').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '개요' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/c02_m09_detail_mobile.png', fullPage: true });

    expect(errors).toEqual([]);
    await context.close();
  });
});
