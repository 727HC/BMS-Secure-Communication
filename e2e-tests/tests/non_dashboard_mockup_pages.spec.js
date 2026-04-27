const { test, expect } = require('@playwright/test');

const BASE = (process.env.PW_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const AUTH_TOKEN = 'ui-only-smoke-token';
const AUTH_USER = 'ui.smoke.operator';

const seedPassports = [
  {
    passportId: 'PASSPORT-SMOKE-ACTIVE',
    batteryId: 'BAT-SMOKE-ACTIVE',
    did: 'did:example:passport-smoke-active',
    model: 'LFP Field Pack 56kWh',
    serialNumber: 'SN-SMOKE-ACTIVE',
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
    vin: 'KMHSMOKEACTIVE001',
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
    passportId: 'PASSPORT-SMOKE-MAINT',
    batteryId: 'BAT-SMOKE-MAINT',
    did: 'did:example:passport-smoke-maint',
    model: 'NCM Service Pack 72kWh',
    serialNumber: 'SN-SMOKE-MAINT',
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
    vin: 'KMHSMOKEMAINT002',
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
        technician: 'service.smoke',
      },
    ],
    accidentLogs: [
      {
        timestamp: '2026-04-21T09:00:00.000Z',
        severity: 'LOW',
        description: 'Minor transport impact logged',
        reporter: 'ev.smoke',
      },
    ],
  },
  {
    passportId: 'PASSPORT-SMOKE-ANALYSIS',
    batteryId: 'BAT-SMOKE-ANALYSIS',
    did: 'did:example:passport-smoke-analysis',
    model: 'NCA Recovery Candidate 82kWh',
    serialNumber: 'SN-SMOKE-ANALYSIS',
    manufacturerName: 'SK On',
    manufactureCountry: 'KR',
    manufactureDate: '2026-01-15',
    chemistry: 'NCA',
    cellType: 'Pouch',
    cellCount: 112,
    weight: 530,
    totalEnergy: 82,
    energyDensity: 154,
    ratedCapacity: 190,
    expectedLifespan: 1450,
    voltageRange: '340-435V',
    temperatureRange: '-20~55C',
    vin: 'KMHSMOKEANALYSIS003',
    status: 'ANALYSIS',
    recycleAvailable: true,
    currentSoc: 0.28,
    currentSoh: 68,
    soh: 68,
    soce: 62,
    remainingLifeCycle: 360,
    createdAt: '2026-04-03T09:00:00.000Z',
    updatedAt: '2026-04-24T09:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  },
  {
    passportId: 'PASSPORT-SMOKE-RECYCLE',
    batteryId: 'BAT-SMOKE-RECYCLE',
    did: 'did:example:passport-smoke-recycle',
    model: 'LMO Recovery Pack 48kWh',
    serialNumber: 'SN-SMOKE-RECYCLE',
    manufacturerName: 'CATL Korea',
    manufactureCountry: 'KR',
    manufactureDate: '2025-12-11',
    chemistry: 'LMO',
    cellType: 'Cylindrical',
    cellCount: 88,
    weight: 390,
    totalEnergy: 48,
    energyDensity: 120,
    ratedCapacity: 115,
    expectedLifespan: 1200,
    voltageRange: '280-398V',
    temperatureRange: '-20~55C',
    vin: 'KMHSMOKERECYCLE004',
    status: 'RECYCLING',
    recycleAvailable: true,
    currentSoc: 0.18,
    currentSoh: 51,
    soh: 51,
    soce: 48,
    remainingLifeCycle: 120,
    recyclingRates: { Li: 82, Ni: 76, Co: 71, Mn: 68 },
    createdAt: '2026-04-04T09:00:00.000Z',
    updatedAt: '2026-04-25T09:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  },
  {
    passportId: 'PASSPORT-SMOKE-DISPOSED',
    batteryId: 'BAT-SMOKE-DISPOSED',
    did: 'did:example:passport-smoke-disposed',
    model: 'EOL Archive Pack 40kWh',
    serialNumber: 'SN-SMOKE-DISPOSED',
    manufacturerName: 'Archive Energy',
    manufactureCountry: 'KR',
    manufactureDate: '2025-10-08',
    chemistry: 'LFP',
    cellType: 'Prismatic',
    cellCount: 72,
    weight: 360,
    totalEnergy: 40,
    energyDensity: 108,
    ratedCapacity: 100,
    expectedLifespan: 1100,
    voltageRange: '260-390V',
    temperatureRange: '-20~55C',
    vin: 'KMHSMOKEDISPOSED005',
    status: 'DISPOSED',
    recycleAvailable: false,
    currentSoc: 0.08,
    currentSoh: 34,
    soh: 34,
    soce: 31,
    remainingLifeCycle: 0,
    createdAt: '2026-04-05T09:00:00.000Z',
    updatedAt: '2026-04-26T09:00:00.000Z',
    maintenanceLogs: [],
    accidentLogs: [],
  },
];

const seedMaterials = [
  {
    materialId: 'MAT-SMOKE-LI-001',
    name: 'Lithium hydroxide batch',
    origin: 'KR',
    supplier: 'POSCO Future M',
    quantity: 1200,
    unit: 'kg',
    certificationId: 'CERT-LI-001',
    createdAt: '2026-04-19T08:00:00.000Z',
  },
  {
    materialId: 'MAT-SMOKE-NI-002',
    name: 'Nickel sulfate feedstock',
    origin: 'CA',
    supplier: 'North Mine',
    quantity: 840,
    unit: 'kg',
    certificationId: 'CERT-NI-002',
    createdAt: '2026-04-18T08:00:00.000Z',
  },
];

const seedBmuRecords = [
  {
    recordId: 'BMU-SMOKE-001',
    timestamp: '2026-04-27T08:00:00.000Z',
    soc: 0.74,
    voltage: 384.4,
    current: 12.8,
    temperature: 29.4,
    dischargeCycles: 318,
    statusFlags: 1,
  },
  {
    recordId: 'BMU-SMOKE-002',
    timestamp: '2026-04-27T08:00:10.000Z',
    soc: 0.73,
    voltage: 383.9,
    current: 10.2,
    temperature: 29.8,
    dischargeCycles: 319,
    statusFlags: 0,
  },
];

const seedAuditLogs = [
  {
    id: 'audit-smoke-001',
    action: 'CREATE_PASSPORT',
    timestamp: '2026-04-27T07:55:00.000Z',
    userId: 'issuer.smoke',
    orgMsp: 'ManufacturerMSP',
    method: 'POST',
    path: '/api/passports',
    statusCode: 201,
    ip: '127.0.0.1',
    duration: 44,
    requestBody: { passportId: 'PASSPORT-SMOKE-ACTIVE' },
  },
  {
    id: 'audit-smoke-002',
    action: 'SUBMIT_ANALYSIS',
    timestamp: '2026-04-27T07:58:00.000Z',
    userId: 'service.smoke',
    orgMsp: 'ServiceMSP',
    method: 'POST',
    path: '/api/analysis/PASSPORT-SMOKE-ANALYSIS/result',
    statusCode: 200,
    ip: '127.0.0.1',
    duration: 38,
    requestBody: { recycleAvailable: true },
  },
  {
    id: 'audit-smoke-003',
    action: 'QUERY',
    timestamp: '2026-04-27T08:01:00.000Z',
    userId: 'regulator.smoke',
    orgMsp: 'RegulatorMSP',
    method: 'GET',
    path: '/api/passports',
    statusCode: 200,
    ip: '127.0.0.1',
    duration: 16,
  },
];

const routeChecks = [
  { path: '/', selector: '[data-page="landing"]', text: 'From BMS Signal to Blockchain Trust.', public: true },
  { path: '/login', selector: '[data-page="login"]', text: '조직 인증', public: true },
  { path: '/passports', selector: '[data-page="passports"]', text: 'Battery Passport Register', rewritten: true },
  { path: '/materials', selector: '[data-page="materials"]', text: 'Supply Chain Register', rewritten: true },
  { path: '/bmu-data', selector: '[data-page="bmu-data"]', text: 'BMS Live Data', rewritten: true },
  { path: '/maintenance', selector: '[data-page="maintenance"]', text: 'Tasks Docket', rewritten: true },
  { path: '/recycling', selector: '[data-page="recycling"]', text: 'Recycling & ESG', rewritten: true },
  { path: '/qr-scan', selector: '[data-page="qr-scan"]', text: 'Field Identify Search', rewritten: true },
  { path: '/audit-log', selector: '[data-page="audit-log"]', text: 'Audit / Ledger', rewritten: true },
  { path: '/settings', selector: '[data-page="settings"]', text: 'Settings', rewritten: true },
  { path: '/dashboard', selector: '.vk-dash', text: 'Fleet Digital Twin', dashboard: true },
];

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function collectConsoleErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
      errors.push(`console.error: ${text}`);
    }
  });
  return errors;
}

function filteredAuditPayload(searchParams) {
  const action = searchParams.get('action');
  const writeOnly = searchParams.get('writeOnly') === 'true';
  let records = seedAuditLogs;

  if (action) records = records.filter((log) => log.action === action);
  if (writeOnly) records = records.filter((log) => log.method !== 'GET');

  return { records, total: records.length };
}

async function installUiOnlyApiFixtures(page) {
  const mutations = [];

  // UI-only fixture smoke: all /api calls are intercepted for deterministic shell rendering.
  // This is not real backend integration evidence and must not be reused for Task 12.
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
    if (path.startsWith('/api/passports/')) {
      const id = decodeURIComponent(path.replace('/api/passports/', ''));
      const found = seedPassports.find((passport) => passport.passportId === id) || seedPassports[0];
      return json(route, found);
    }
    if (path === '/api/materials') return json(route, { records: seedMaterials });
    if (path.startsWith('/api/bmu/records/')) return json(route, { records: seedBmuRecords });
    if (path === '/api/audit') return json(route, filteredAuditPayload(url.searchParams));
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

async function setAuthenticatedRole(page, org = 'ManufacturerMSP') {
  if (page.url() === 'about:blank') {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  }

  await page.evaluate(({ token, userId, orgMsp }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_userId', userId);
    localStorage.setItem('auth_org', orgMsp);
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_userId', userId);
    sessionStorage.setItem('auth_org', orgMsp);
  }, { token: AUTH_TOKEN, userId: AUTH_USER, orgMsp: org });
}

async function clearAuth(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_userId');
    localStorage.removeItem('auth_org');
    localStorage.removeItem('bp_token');
    localStorage.removeItem('bp_userId');
    localStorage.removeItem('bp_orgMsp');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_userId');
    sessionStorage.removeItem('auth_org');
  });
}

async function visitRoute(page, route) {
  await page.goto(`${BASE}${route.path}`, { waitUntil: 'domcontentloaded' });
  const root = page.locator(route.selector).first();
  await expect(root, `${route.path} root should render`).toBeVisible({ timeout: 10000 });
  await expect(root, `${route.path} expected route copy`).toContainText(route.text, { timeout: 10000 });
}

async function expectNoHorizontalOverflow(page, label) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      innerWidth: window.innerWidth,
      clientWidth: doc.clientWidth,
      documentScrollWidth: doc.scrollWidth,
      bodyScrollWidth: body.scrollWidth,
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
    };
  });

  expect(
    metrics.scrollWidth,
    `${label} horizontal overflow: ${JSON.stringify(metrics)}`
  ).toBeLessThanOrEqual(metrics.clientWidth + 2);
}

async function ensureLayoutDarkMode(page) {
  const toggle = page.locator('button.ev-theme-toggle').first();
  await expect(toggle).toBeVisible({ timeout: 10000 });

  if (await page.evaluate(() => document.documentElement.classList.contains('dark'))) {
    await toggle.click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  }

  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
}

async function ensureDashboardDarkMode(page) {
  const toggle = page.locator('button.vk-ref-sidebar-action').filter({ hasText: '다크 모드' }).first();
  await expect(toggle).toBeVisible({ timeout: 10000 });

  if (await page.evaluate(() => document.documentElement.classList.contains('dark'))) {
    await toggle.click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
  }

  await toggle.click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
}

async function expectButtons(root, visibleNames, hiddenNames) {
  for (const name of visibleNames) {
    await expect(root.getByRole('button', { name }).first(), `${name} should be visible`).toBeVisible({ timeout: 10000 });
  }

  for (const name of hiddenNames) {
    await expect(root.getByRole('button', { name })).toHaveCount(0);
  }
}

test.describe('non-dashboard mockup pages UI-only smoke', () => {
  test('unauthenticated protected routes redirect to /login', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { mutations } = await installUiOnlyApiFixtures(page);
    await clearAuth(page);

    for (const path of ['/settings', '/passports']) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL((url) => url.pathname === '/login', { timeout: 10000 });
      await expect(page.locator('[data-page="login"]')).toBeVisible();
    }

    expect(mutations).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('visits public, protected, and dashboard routes with deterministic fixtures', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { mutations } = await installUiOnlyApiFixtures(page);
    await seedAuthenticatedStorage(page, 'ManufacturerMSP');

    for (const route of routeChecks) {
      await visitRoute(page, route);
    }

    await expect(page.locator('.vk-dash')).toContainText('Overview');
    expect(mutations).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`rewritten routes have no horizontal overflow on ${viewport.name}`, async ({ page }) => {
      const errors = collectConsoleErrors(page);
      const { mutations } = await installUiOnlyApiFixtures(page);
      await seedAuthenticatedStorage(page, 'ManufacturerMSP');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of routeChecks.filter((item) => item.rewritten)) {
        await visitRoute(page, route);
        await expectNoHorizontalOverflow(page, `${viewport.name} ${route.path}`);
      }

      expect(mutations).toEqual([]);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('dark mode toggle renders rewritten pages and dashboard without console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { mutations } = await installUiOnlyApiFixtures(page);
    await seedAuthenticatedStorage(page, 'ManufacturerMSP');

    const firstProtectedRoute = routeChecks.find((route) => route.path === '/passports');
    await visitRoute(page, firstProtectedRoute);
    await ensureLayoutDarkMode(page);

    for (const route of routeChecks.filter((item) => item.rewritten)) {
      await visitRoute(page, route);
      await expect(page.locator(route.selector).first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    }

    const dashboardRoute = routeChecks.find((route) => route.path === '/dashboard');
    await visitRoute(page, dashboardRoute);
    await ensureDashboardDarkMode(page);
    await expect(page.locator('.vk-dash')).toContainText('Fleet Digital Twin');

    expect(mutations).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('representative role-gated actions are visible without submitting mutations', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const { mutations } = await installUiOnlyApiFixtures(page);

    await setAuthenticatedRole(page, 'ManufacturerMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/passports'));
    await expectButtons(page.locator('[data-page="passports"]'), ['발급 접수'], []);

    await setAuthenticatedRole(page, 'RegulatorMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/passports'));
    await expectButtons(page.locator('[data-page="passports"]'), [], ['발급 접수']);

    await setAuthenticatedRole(page, 'ManufacturerMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/materials'));
    await expectButtons(page.locator('[data-page="materials"]'), ['공급망 자재 등재'], []);

    await setAuthenticatedRole(page, 'RegulatorMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/materials'));
    await expectButtons(page.locator('[data-page="materials"]'), [], ['공급망 자재 등재']);

    await setAuthenticatedRole(page, 'EVManufacturerMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/maintenance'));
    await expectButtons(page.locator('[data-page="maintenance"] table.sn-table'), ['작업 접수', 'Incident'], []);

    await setAuthenticatedRole(page, 'ServiceMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/maintenance'));
    await expectButtons(page.locator('[data-page="maintenance"] table.sn-table'), ['완료 기록', 'Incident'], []);

    await setAuthenticatedRole(page, 'RegulatorMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/maintenance'));
    await expectButtons(page.locator('[data-page="maintenance"] table.sn-table'), [], ['작업 접수', '완료 기록', 'Incident']);

    await setAuthenticatedRole(page, 'EVManufacturerMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/recycling'));
    await expectButtons(page.locator('[data-page="recycling"] table.sn-table'), ['분석 요청'], ['결과 제출', '추출', '폐기']);

    await setAuthenticatedRole(page, 'ServiceMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/recycling'));
    await expectButtons(page.locator('[data-page="recycling"] table.sn-table'), ['결과 제출', '재활용 판정'], ['분석 요청', '추출', '폐기']);

    await setAuthenticatedRole(page, 'RegulatorMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/recycling'));
    await expectButtons(page.locator('[data-page="recycling"] table.sn-table'), ['재활용 판정', '추출', '폐기'], ['분석 요청', '결과 제출']);

    await setAuthenticatedRole(page, 'ManufacturerMSP');
    await visitRoute(page, routeChecks.find((route) => route.path === '/recycling'));
    await expectButtons(page.locator('[data-page="recycling"] table.sn-table'), [], ['분석 요청', '결과 제출', '재활용 판정', '추출', '폐기']);

    expect(mutations).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
