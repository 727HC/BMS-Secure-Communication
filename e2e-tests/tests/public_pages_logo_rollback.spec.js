const { test, expect } = require('@playwright/test');

const BASE = (process.env.PW_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const AUTH_TOKEN = 'ui-only-logo-smoke-token';
const AUTH_USER = 'ui.logo.operator';

const seedPassports = [
  {
    passportId: 'PASSPORT-LOGO-ACTIVE',
    batteryId: 'BAT-LOGO-ACTIVE',
    did: 'did:example:logo-active',
    model: 'LFP Field Pack 56kWh',
    serialNumber: 'SN-LOGO-ACTIVE',
    manufacturerName: 'VELKERN Cells',
    manufactureCountry: 'KR',
    manufactureDate: '2026-03-20',
    chemistry: 'LFP',
    cellType: 'Prismatic',
    cellCount: 96,
    weight: 420,
    totalEnergy: 56,
    energyDensity: 132,
    ratedCapacity: 140,
    expectedLifespan: 1600,
    voltageRange: '310-410V',
    temperatureRange: '-20~55C',
    vin: 'KMHLOGOACTIVE001',
    status: 'ACTIVE',
    recycleAvailable: false,
    currentSoc: 0.74,
    currentSoh: 94,
    soh: 94,
    soce: 91,
    remainingLifeCycle: 1280,
    createdAt: '2026-04-01T09:00:00.000Z',
    updatedAt: '2026-04-23T09:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  },
  {
    passportId: 'PASSPORT-LOGO-MAINT',
    batteryId: 'BAT-LOGO-MAINT',
    did: 'did:example:logo-maint',
    model: 'NCM Service Pack 72kWh',
    serialNumber: 'SN-LOGO-MAINT',
    manufacturerName: 'SDI Mobility',
    manufactureCountry: 'KR',
    manufactureDate: '2026-02-18',
    chemistry: 'NCM',
    cellType: 'Pouch',
    cellCount: 108,
    weight: 505,
    totalEnergy: 72,
    energyDensity: 148,
    ratedCapacity: 180,
    expectedLifespan: 1500,
    voltageRange: '330-430V',
    temperatureRange: '-20~55C',
    vin: 'KMHLOGOMAINT002',
    status: 'MAINTENANCE',
    recycleAvailable: false,
    currentSoc: 0.42,
    currentSoh: 82,
    soh: 82,
    soce: 78,
    remainingLifeCycle: 820,
    createdAt: '2026-04-02T09:00:00.000Z',
    updatedAt: '2026-04-22T09:00:00.000Z',
    maintenanceLogs: [
      {
        timestamp: '2026-04-20T09:00:00.000Z',
        maintenanceType: 'routine',
        description: 'Cooling channel inspection requested',
        technician: 'service.logo',
      },
    ],
    accidentLogs: [],
  },
];

const seedMaterials = [
  {
    materialId: 'MAT-LOGO-LI-001',
    name: 'Lithium hydroxide batch',
    origin: 'KR',
    supplier: 'POSCO Future M',
    quantity: 1200,
    unit: 'kg',
    certificationId: 'CERT-LI-001',
    createdAt: '2026-04-19T08:00:00.000Z',
  },
];

const seedBmuRecords = [
  {
    recordId: 'BMU-LOGO-001',
    timestamp: '2026-04-27T08:00:00.000Z',
    soc: 0.74,
    voltage: 384.4,
    current: 12.8,
    temperature: 29.4,
    dischargeCycles: 318,
    statusFlags: 1,
  },
];

const seedAuditLogs = [
  {
    id: 'audit-logo-001',
    action: 'CREATE_PASSPORT',
    timestamp: '2026-04-27T07:55:00.000Z',
    userId: 'issuer.logo',
    orgMsp: 'ManufacturerMSP',
    method: 'POST',
    path: '/api/passports',
    statusCode: 201,
    ip: '127.0.0.1',
    duration: 44,
    requestBody: { passportId: 'PASSPORT-LOGO-ACTIVE' },
  },
];

const protectedRoutes = [
  { path: '/dashboard', readySelector: '.vk-dash' },
  { path: '/passports', readySelector: '[data-page="passports"]' },
  { path: '/materials', readySelector: '[data-page="materials"]' },
  { path: '/maintenance', readySelector: '[data-page="maintenance"]' },
  { path: '/audit-log', readySelector: '[data-page="audit-log"]' },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installUiOnlyApiFixtures(page) {
  const mutations = [];

  // UI-only fixture smoke: all /api calls are intercepted for deterministic shell rendering.
  // This is not real backend integration evidence and must not be reused as backend proof.
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const path = url.pathname;

    if (MUTATION_METHODS.has(method)) {
      mutations.push(`${method} ${path}`);
      return json(route, { error: `Mutation ${method} ${path} is blocked in UI-only smoke` }, 405);
    }

    if (path === '/api/status') {
      return json(route, {
        fabric: 'connected',
        channel: 'passportchannel',
        contract: 'passport-contract',
        org: 'ManufacturerMSP',
      });
    }

    if (path === '/api/passports') return json(route, { records: seedPassports });
    if (path.startsWith('/api/passports/')) return json(route, seedPassports[0]);
    if (path === '/api/materials') return json(route, { records: seedMaterials });
    if (path.startsWith('/api/bmu/records/')) return json(route, { records: seedBmuRecords });
    if (path === '/api/audit') return json(route, { records: seedAuditLogs, total: seedAuditLogs.length });
    if (path.startsWith('/api/vc/passport/')) return json(route, { credentials: [] });
    if (path === '/api/vc/issuers') return json(route, { issuers: ['ManufacturerMSP', 'RegulatorMSP'] });
    if (/^\/api\/vc\/issuers\/[^/]+\/types$/.test(path)) {
      return json(route, { issuerMsp: 'ManufacturerMSP', types: ['BatteryPassportCredential'] });
    }

    return json(route, { records: [] });
  });

  return { mutations };
}

async function seedAuthenticatedStorage(page, org = 'ManufacturerMSP') {
  await page.addInitScript(({ token, userId, orgMsp }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_userId', userId);
    localStorage.setItem('auth_org', orgMsp);
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_userId', userId);
    sessionStorage.setItem('auth_org', orgMsp);
  }, { token: AUTH_TOKEN, userId: AUTH_USER, orgMsp: org });
}

async function clearAuthenticatedStorage(page) {
  await page.addInitScript(() => {
    for (const key of ['auth_token', 'auth_userId', 'auth_org', 'bp_token', 'bp_userId', 'bp_orgMsp']) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  });
}

async function expectForbiddenPublicRewriteCopyAbsent(page) {
  await expect(page.locator('body')).not.toContainText('VELKERN TRUST REGISTER');
  await expect(page.locator('body')).not.toContainText('제품 표면 보기');
  await expect(page.locator('[class*="trust-register"], [class*="intro-panel"]')).toHaveCount(0);
}

async function readLogoSnapshot(page, route) {
  await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator(route.readySelector).first(), `${route.path} page root`).toBeVisible({ timeout: 10000 });

  const brand = page.locator('[data-shell-brand="velkern"]').first();
  const mark = page.locator('[data-shell-brand-mark="velkern"]').first();
  await expect(brand, `${route.path} protected shell brand`).toBeVisible({ timeout: 10000 });
  await expect(mark, `${route.path} protected shell brand mark`).toBeVisible({ timeout: 10000 });

  const src = await mark.evaluate((img) => img.currentSrc || img.src || img.getAttribute('src'));
  const box = await mark.boundingBox();
  expect(box, `${route.path} protected shell logo box`).not.toBeNull();

  return { ...route, src, box };
}

test.describe('public pages rollback and protected logo parity', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('public landing keeps restored copy outside protected shell', async ({ page }) => {
    await clearAuthenticatedStorage(page);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });

    const root = page.locator('[data-page="landing"]');
    await expect(root).toBeVisible({ timeout: 10000 });
    await expect(root).toContainText('Verified Power.');
    await expect(root).toContainText('Trusted Passport.');
    await expect(root).toContainText('From BMS Signal to Blockchain Trust.');
    await expect(root.getByRole('button', { name: 'Get Started' })).toBeVisible();
    await expect(root.getByRole('link', { name: 'Learn More' })).toBeVisible();

    await expect(page.locator('[data-shell-brand="velkern"]')).toHaveCount(0);
    await expectForbiddenPublicRewriteCopyAbsent(page);
  });

  test('public login keeps restored auth card and tab behavior outside protected shell', async ({ page }) => {
    await clearAuthenticatedStorage(page);
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });

    const root = page.locator('[data-page="login"]');
    await expect(root).toBeVisible({ timeout: 10000 });
    await expect(root.getByText('조직 인증')).toBeVisible();
    await expect(root.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(root.getByPlaceholder('예: issuer.operator.01')).toBeVisible();
    await expect(root.getByPlaceholder('비밀번호 입력')).toBeVisible();
    await expect(root.getByRole('button', { name: '돌아가기' })).toBeVisible();

    await root.locator('button').filter({ hasText: '계정 등록' }).first().click();
    await expect(root.getByRole('heading', { name: '조직 계정 등록' })).toBeVisible();
    await expect(root.locator('button[type="submit"]')).toHaveText('계정 등록');

    await root.locator('button').filter({ hasText: '로그인' }).first().click();
    await expect(root.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(root.locator('button[type="submit"]')).toHaveText('로그인');

    await expect(page.locator('[data-shell-brand="velkern"]')).toHaveCount(0);
    await expectForbiddenPublicRewriteCopyAbsent(page);
  });

  test('protected shells keep one logo treatment across core routes', async ({ page }) => {
    const { mutations } = await installUiOnlyApiFixtures(page);
    await seedAuthenticatedStorage(page, 'ManufacturerMSP');

    const snapshots = [];
    for (const route of protectedRoutes) {
      snapshots.push(await readLogoSnapshot(page, route));
    }

    const reference = snapshots.find((snapshot) => snapshot.path === '/dashboard');
    expect(reference, 'dashboard logo reference').toBeTruthy();

    for (const snapshot of snapshots) {
      expect(snapshot.src, `${snapshot.path} logo src`).toBe(reference.src);
      for (const key of ['x', 'y', 'width', 'height']) {
        const delta = Math.abs(snapshot.box[key] - reference.box[key]);
        expect(delta, `${snapshot.path} logo ${key} delta`).toBeLessThanOrEqual(2);
      }
    }

    expect(mutations).toEqual([]);
  });

  test('protected shell brand navigates back to dashboard', async ({ page }) => {
    const { mutations } = await installUiOnlyApiFixtures(page);
    await seedAuthenticatedStorage(page, 'ManufacturerMSP');

    await page.goto(`${BASE}/passports`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-page="passports"]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-shell-brand="velkern"]').first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('.vk-dash')).toBeVisible({ timeout: 10000 });

    expect(mutations).toEqual([]);
  });
});
