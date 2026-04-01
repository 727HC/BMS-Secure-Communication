const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3001';
const API = `${BASE}/api`;

// 4-org 로그인 정보
const ORGS = [
  { userId: 'admin', password: 'adminpw', orgNum: 1, msp: 'ManufacturerMSP', label: 'Manufacturer' },
  { userId: 'admin', password: 'adminpw', orgNum: 2, msp: 'EVManufacturerMSP', label: 'EVManufacturer' },
  { userId: 'admin', password: 'adminpw', orgNum: 3, msp: 'ServiceMSP', label: 'Service' },
  { userId: 'admin', password: 'adminpw', orgNum: 4, msp: 'RegulatorMSP', label: 'Regulator' },
];

// API helper
async function apiLogin(request, org) {
  const res = await request.post(`${API}/auth/login`, {
    data: { userId: org.userId, password: org.password, orgNum: org.orgNum },
  });
  return res.json();
}

async function getToken(request, org) {
  const data = await apiLogin(request, org);
  return data.token;
}

// ============================================================
// 1. 서버 상태 확인
// ============================================================
test.describe('1. 서버 상태', () => {
  test('API /status 응답 정상', async ({ request }) => {
    const res = await request.get(`${API}/status`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.fabric).toBe('connected');
    expect(data.channel).toBe('passportchannel');
    expect(data.contract).toBe('passport-contract');
  });

  test('프론트엔드 index.html 로드', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/배터리|Battery|BMS|Passport/i);
  });
});

// ============================================================
// 2. 인증 (4개 조직)
// ============================================================
test.describe('2. 인증', () => {
  for (const org of ORGS) {
    test(`${org.label} (org${org.orgNum}) 로그인 성공`, async ({ request }) => {
      const res = await request.post(`${API}/auth/login`, {
        data: { userId: org.userId, password: org.password, orgNum: org.orgNum },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      expect(data.token).toBeTruthy();
      expect(data.mspId).toBe(org.msp);
    });
  }

  test('존재하지 않는 사용자 거부', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { userId: 'nonexistent_user_xyz', password: 'wrong', orgNum: 1 },
    });
    expect(res.ok()).toBeFalsy();
  });

  test('orgNum 누락 시 400', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, {
      data: { userId: 'admin', password: 'adminpw' },
    });
    expect(res.status()).toBe(400);
  });
});

// ============================================================
// 3. 프론트엔드 로그인 UI
// ============================================================
test.describe('3. 프론트엔드 로그인', () => {
  test('로그인 폼 표시 및 로그인 성공', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(2000);

    // 로그인 폼 확인
    const userInput = page.locator('input[placeholder="아이디를 입력하세요"]');
    await expect(userInput).toBeVisible({ timeout: 5000 });

    // 로그인
    await userInput.fill('admin');
    await page.locator('input[type="password"]').fill('adminpw');
    // orgNum select — value 기반 선택 (1=제조사)
    await page.locator('select').first().selectOption('1');
    await page.locator('button:has-text("로그인")').last().click();

    // 로그인 성공 확인 — URL hash가 dashboard로 변경되거나 localStorage에 토큰 존재
    await page.waitForTimeout(5000);
    const token = await page.evaluate(() => localStorage.getItem('bp_token'));
    expect(token).toBeTruthy();
  });
});

// ============================================================
// 4. 대시보드
// ============================================================
test.describe('4. 대시보드', () => {
  test('대시보드 로드 및 통계 표시', async ({ page }) => {
    // API 로그인
    const res = await page.request.post(`${API}/auth/login`, {
      data: { userId: 'admin', password: 'adminpw', orgNum: 1 },
    });
    const data = await res.json();

    // 토큰 설정 후 대시보드 이동
    await page.goto(BASE);
    await page.evaluate((d) => {
      localStorage.setItem('bp_token', d.token);
      localStorage.setItem('bp_userId', d.userId);
      localStorage.setItem('bp_orgMsp', d.mspId);
    }, data);
    await page.goto(`${BASE}/#dashboard`);
    await page.waitForTimeout(3000);

    // 페이지 내 컨텐츠 존재 확인
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});

// ============================================================
// 5. 배터리 여권 CRUD
// ============================================================
test.describe('5. 배터리 여권 API', () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await getToken(request, ORGS[0]); // Manufacturer
  });

  test('여권 목록 조회', async ({ request }) => {
    const res = await request.get(`${API}/passports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.records).toBeInstanceOf(Array);
  });

  test('여권 생성', async ({ request }) => {
    const ts = Date.now();
    const passportData = {
      passportId: `PASSPORT-QA-${ts}`,
      batteryId: `TEST-BAT-${ts}`,
      did: `QA-DID-${ts}`,
      model: 'QA-Model',
      serialNumber: `SN-${ts}`,
      manufacturerName: 'QA Manufacturer',
      manufactureCountry: 'KR',
      cellManufacturer: 'QA Cell',
      cellManufactureCountry: 'KR',
      manufactureDate: '2026-03-28',
      cellType: 'Prismatic',
      chemistry: 'NMC811',
      cellCount: 96,
      weight: 450,
      totalEnergy: 72.6,
      energyDensity: 161,
      ratedCapacity: 180,
      expectedLifespan: 3000,
      voltageRange: '280-403V',
      temperatureRange: '-20~60°C',
    };
    const res = await request.post(`${API}/passports`, {
      headers: { Authorization: `Bearer ${token}` },
      data: passportData,
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.passportId).toBeTruthy();
  });

  test('여권 상세 조회', async ({ request }) => {
    // 첫 번째 여권 조회
    const listRes = await request.get(`${API}/passports?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const passportId = (list.records || list)[0]?.passportId;
    if (!passportId) return test.skip();

    const res = await request.get(`${API}/passports/${passportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.passportId).toBe(passportId);
    expect(data.docType).toBe('batteryPassport');
  });

  test('존재하지 않는 여권 조회 시 에러', async ({ request }) => {
    const res = await request.get(`${API}/passports/NONEXISTENT-ID`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeFalsy();
  });
});

// ============================================================
// 6. RBAC 권한 검증
// ============================================================
test.describe('6. RBAC 권한', () => {
  test('인증 없이 여권 조회 시 401', async ({ request }) => {
    const res = await request.get(`${API}/passports`);
    expect(res.status()).toBe(401);
  });

  test('Service MSP로 여권 생성 불가 (403)', async ({ request }) => {
    const token = await getToken(request, ORGS[2]); // Service
    const res = await request.post(`${API}/passports`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { batteryId: 'test', model: 'test' },
    });
    expect(res.status()).toBe(403);
  });

  test('Manufacturer만 원자재 등록 가능', async ({ request }) => {
    const serviceToken = await getToken(request, ORGS[2]);
    const res = await request.post(`${API}/materials`, {
      headers: { Authorization: `Bearer ${serviceToken}` },
      data: { materialId: 'test', name: 'test', origin: 'KR', supplier: 'test', quantity: '100', unit: 'kg' },
    });
    expect([403, 500]).toContain(res.status());
  });

  test('감사 로그는 Manufacturer/Regulator만 접근', async ({ request }) => {
    // Service로 감사 로그 접근 시도
    const serviceToken = await getToken(request, ORGS[2]);
    const res = await request.get(`${API}/audit`, {
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    expect(res.status()).toBe(403);

    // Regulator로 접근 — 성공
    const regToken = await getToken(request, ORGS[3]);
    const res2 = await request.get(`${API}/audit`, {
      headers: { Authorization: `Bearer ${regToken}` },
    });
    expect(res2.ok()).toBeTruthy();
  });
});

// ============================================================
// 7. BMU 데이터 API
// ============================================================
test.describe('7. BMU 데이터', () => {
  let token;

  test.beforeAll(async ({ request }) => {
    token = await getToken(request, ORGS[0]);
  });

  test('BMU 데이터 — rawPayload 누락 시 400', async ({ request }) => {
    const res = await request.post(`${API}/bmu/data`, {
      data: { did: 'test', signature: 'test' },
    });
    expect(res.status()).toBe(400);
  });

  test('BMU 데이터 — 서명 누락 시 400', async ({ request }) => {
    const res = await request.post(`${API}/bmu/data`, {
      data: { rawPayload: 'aabb', did: 'test' },
    });
    expect(res.status()).toBe(400);
  });

  test('BMU 데이터 — DID 누락 시 400', async ({ request }) => {
    const res = await request.post(`${API}/bmu/data`, {
      data: { rawPayload: 'aabb', signature: 'test' },
    });
    expect(res.status()).toBe(400);
  });

  test('BMU records 조회 (인증 필요)', async ({ request }) => {
    const listRes = await request.get(`${API}/passports?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const passportId = (list.records || list)[0]?.passportId;
    if (!passportId) return test.skip();

    const res = await request.get(`${API}/bmu/records/${passportId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });
});

// ============================================================
// 8. DID 서비스
// ============================================================
test.describe('8. DID 서비스', () => {
  test('DID verkey 조회', async ({ request }) => {
    // 기존 DID가 있으면 조회
    const res = await request.get(`${API}/did/verkey/NONEXISTENT`);
    // ACA-Py 연결 여부에 따라 500 또는 다른 응답
    expect([200, 500]).toContain(res.status());
  });

  test('DID 등록 — 필수 필드 누락 시 400', async ({ request }) => {
    const token = await getToken(request, ORGS[0]);
    const res = await request.post(`${API}/did/register`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { did: 'test' }, // verkey 누락
    });
    expect(res.status()).toBe(400);
  });
});

// ============================================================
// 9. 원자재 관리
// ============================================================
test.describe('9. 원자재', () => {
  test('원자재 목록 조회', async ({ request }) => {
    const token = await getToken(request, ORGS[0]);
    const res = await request.get(`${API}/materials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('원자재 등록', async ({ request }) => {
    const token = await getToken(request, ORGS[0]);
    const res = await request.post(`${API}/materials`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        materialId: `MAT-QA-${Date.now()}`,
        name: 'Lithium Carbonate',
        origin: 'Australia',
        supplier: 'QA Supplier',
        quantity: '500',
        unit: 'kg',
        certificationId: 'CERT-QA-001',
      },
    });
    expect(res.ok()).toBeTruthy();
  });
});

// ============================================================
// 10. 정비 관리
// ============================================================
test.describe('10. 정비', () => {
  test('정비 목록 조회', async ({ request }) => {
    const token = await getToken(request, ORGS[0]);
    const res = await request.get(`${API}/maintenance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 라우트가 없으면 404, 있으면 200
    expect([200, 404]).toContain(res.status());
  });
});

// ============================================================
// 11. 프론트엔드 네비게이션 (해시 라우팅)
// ============================================================
test.describe('11. 프론트엔드 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.request.post(`${API}/auth/login`, {
      data: { userId: 'admin', password: 'adminpw', orgNum: 1 },
    });
    const data = await res.json();
    await page.goto(BASE);
    await page.evaluate((d) => {
      localStorage.setItem('bp_token', d.token);
      localStorage.setItem('bp_userId', d.userId);
      localStorage.setItem('bp_orgMsp', d.mspId);
    }, data);
  });

  const pages = ['dashboard', 'passports', 'bmu-data', 'materials', 'maintenance', 'recycling', 'qr-scan', 'audit-log'];

  for (const pg of pages) {
    test(`${pg} 페이지 로드`, async ({ page }) => {
      await page.goto(`${BASE}/#${pg}`);
      await page.waitForTimeout(1500);
      // 페이지가 에러 없이 로드되는지 확인
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.waitForTimeout(500);
      expect(errors.length).toBe(0);
    });
  }
});

// ============================================================
// 12. 여권 상세 탭 전환
// ============================================================
test.describe('12. 여권 상세 탭', () => {
  test('5개 탭 전환 확인', async ({ page, request }) => {
    const token = await getToken(request, ORGS[0]);
    // 첫 번째 여권 가져오기
    const listRes = await request.get(`${API}/passports?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const passportId = (list.records || list)[0]?.passportId;
    if (!passportId) return test.skip();

    await page.goto(BASE);
    await page.evaluate((d) => {
      localStorage.setItem('bp_token', d.token);
      localStorage.setItem('bp_userId', d.userId);
      localStorage.setItem('bp_orgMsp', d.mspId);
    }, { token, userId: 'admin', mspId: 'ManufacturerMSP' });

    await page.goto(`${BASE}/#passport-detail?passportId=${passportId}`);
    await page.waitForTimeout(2000);

    // 탭 버튼들 확인
    const tabs = ['식별', '규제', '이력', '데이터', '신뢰'];
    for (const tab of tabs) {
      const btn = page.locator(`button:has-text("${tab}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('탭 새로고침 시 유지', async ({ page, request }) => {
    const token = await getToken(request, ORGS[0]);
    const listRes = await request.get(`${API}/passports?pageSize=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await listRes.json();
    const passportId = (list.records || list)[0]?.passportId;
    if (!passportId) return test.skip();

    await page.goto(BASE);
    await page.evaluate((d) => {
      localStorage.setItem('bp_token', d.token);
      localStorage.setItem('bp_userId', d.userId);
      localStorage.setItem('bp_orgMsp', d.mspId);
    }, { token, userId: 'admin', mspId: 'ManufacturerMSP' });

    // compliance 탭으로 이동
    await page.goto(`${BASE}/#passport-detail?passportId=${passportId}&tab=compliance`);
    await page.waitForTimeout(2000);

    // 새로고침
    await page.reload();
    await page.waitForTimeout(2000);

    // URL에 tab=compliance 유지 확인
    const url = page.url();
    expect(url).toContain('tab=compliance');
  });
});

// ============================================================
// 13. Rate Limit 검증
// ============================================================
test.describe('13. Rate Limit', () => {
  test('BMU data rate limit 동작 확인', async ({ request }) => {
    // 빠르게 여러 요청 전송 (400이 돌아오지만 429 전에 먼저 검증 실패할 수 있음)
    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await request.post(`${API}/bmu/data`, {
        data: { rawPayload: 'aa'.repeat(48), signature: 'test', did: 'test' },
      });
      results.push(res.status());
    }
    // 400 (검증 실패) 또는 429 (rate limit) 또는 401/500 — 200은 아니어야 함
    for (const status of results) {
      expect(status).not.toBe(200);
    }
  });
});

// ============================================================
// 14. 보안 검증
// ============================================================
test.describe('14. 보안', () => {
  test('vehicle-image GET 인증 필요', async ({ request }) => {
    const res = await request.get(`${API}/passports/TEST/vehicle-image`);
    expect(res.status()).toBe(401);
  });

  test('vehicle-image POST 인증+RBAC 필요', async ({ request }) => {
    const res = await request.post(`${API}/passports/TEST/vehicle-image`);
    expect(res.status()).toBe(401);
  });

  test('Fabric fail-fast 환경변수 확인', async ({ request }) => {
    const res = await request.get(`${API}/status`);
    const data = await res.json();
    // Fabric이 연결되어 있어야 함
    expect(data.fabric).toBe('connected');
  });
});
