// Stage 3 fixture (UI-only smoke).
//
// Verifies the chaincode error → Korean toast mapping wired into webapp.
// Mocks bmu-agent responses with chaincode-style { error, category } payloads
// and asserts the rendered alert banner text matches lib/chaincodeErrorMessages.
//
// This is UI-only evidence and intentionally does NOT exercise real Fabric.
// Real-backend rejection evidence is collected during the caliper measurement
// session (see wiki/passport/activity-log/2026-04-27.md "Stage 3 trigger").

const { test, expect } = require('@playwright/test');

const BASE = (process.env.PW_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');

const AUTH_TOKEN = 'chaincode-error-smoke-token';
const AUTH_USER = 'chaincode.error.operator';
const AUTH_ORG = 'ManufacturerMSP';

const SEED_PASSPORTS = [
  {
    passportId: 'PP-EXISTING-001',
    batteryId: 'BAT-001',
    did: 'did:example:existing',
    serialNumber: 'SN-001',
    manufacturerName: 'VELKERN',
    chemistry: 'LFP',
    cellType: 'Prismatic',
    cellCount: 96,
    weight: 420,
    status: 'ACTIVE',
    currentSoc: 0.74,
    soh: 94,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  },
];

function jsonOK(route, body) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

function jsonError(route, status, error, category) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ error, category }),
  });
}

async function seedAuth(page) {
  await page.addInitScript(({ token, userId, orgMsp }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_userId', userId);
    localStorage.setItem('auth_org', orgMsp);
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_userId', userId);
    sessionStorage.setItem('auth_org', orgMsp);
  }, { token: AUTH_TOKEN, userId: AUTH_USER, orgMsp: AUTH_ORG });
}

// Captures console.warn calls for [passports]/[maintenance]/etc mutation logs.
function collectConsoleWarn(page) {
  const warns = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'warning') return;
    warns.push(msg.text());
  });
  return warns;
}

const REJECTION_CASES = [
  {
    name: 'AUTHZ — 외부 회사 여권 정정 시도',
    chaincodeError: 'access denied: passport PP-EXISTING-001 was created by EVManufacturerMSP, caller ManufacturerMSP cannot correct it',
    httpStatus: 403,
    category: 'AUTHZ',
    expectedToast: '이 작업에 대한 권한이 없습니다.',
  },
  {
    name: 'VAL — 음수 cellCount 거부',
    chaincodeError: 'cellCount must be non-negative, got -5',
    httpStatus: 400,
    category: 'VAL',
    expectedToast: '음수는 입력할 수 없습니다.',
  },
  {
    name: 'VAL — 빈 필수값 거부',
    chaincodeError: 'passportId, batteryId, did must not be empty',
    httpStatus: 400,
    category: 'VAL',
    expectedToast: '필수 입력값이 누락되었습니다.',
  },
  {
    name: 'CONFLICT — 중복 passportId 거부',
    chaincodeError: 'passport PP-EXISTING-001 already exists',
    httpStatus: 409,
    category: 'CONFLICT',
    expectedToast: '이미 등록된 항목입니다.',
  },
  {
    name: 'INTERNAL fallback — Fabric 오류',
    chaincodeError: 'failed to read passport: leveldb closed',
    httpStatus: 500,
    category: 'INTERNAL',
    expectedToast: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
];

for (const tc of REJECTION_CASES) {
  test(`PassportsPage: chaincode 거부 → ${tc.name}`, async ({ page }) => {
    const consoleWarns = collectConsoleWarn(page);
    await seedAuth(page);

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname;
      const method = req.method();

      if (method === 'POST' && path === '/api/passports') {
        return jsonError(route, tc.httpStatus, tc.chaincodeError, tc.category);
      }

      if (method === 'GET' && path === '/api/passports') {
        return jsonOK(route, { records: SEED_PASSPORTS });
      }
      if (method === 'GET' && path.startsWith('/api/passports/')) {
        return jsonOK(route, SEED_PASSPORTS[0]);
      }
      if (method === 'GET' && path === '/api/status') {
        return jsonOK(route, { fabric: 'connected', org: AUTH_ORG });
      }
      // Default: empty list / 200
      return jsonOK(route, { records: [] });
    });

    await page.goto(`${BASE}/passports`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-page="passports"]')).toBeVisible({ timeout: 5000 });

    // Open create modal
    await page.getByRole('button', { name: '발급 접수' }).click();

    // Modal scope — first 4 inputs are required: passportId / batteryId / serialNumber / did
    const modal = page.locator('.sn-modal, [role="dialog"]').first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    const inputs = modal.locator('input.sn-input');
    await inputs.nth(0).fill('PP-NEW-001');
    await inputs.nth(1).fill('BAT-NEW-001');
    await inputs.nth(2).fill('SN-NEW-001');
    await inputs.nth(3).fill('did:example:new');

    // Submit — modal-scoped exact "여권 발급" button
    await modal.getByRole('button', { name: '여권 발급', exact: true }).click();

    // Assert alert banner appears with expected Korean toast
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 5000 });
    await expect(alert).toContainText(tc.expectedToast);

    // Assert console.warn captured category + raw debug for the developer
    const matched = consoleWarns.some((line) =>
      line.includes(tc.category) && line.includes('mutation failed')
    );
    expect(matched, `expected console.warn with category=${tc.category}, got: ${JSON.stringify(consoleWarns)}`).toBe(true);
  });
}
