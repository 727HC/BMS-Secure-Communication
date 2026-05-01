const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.PW_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(REPO_ROOT, '.sisyphus/evidence/task-12-non-dashboard-real-backend');
const EVIDENCE_PATH = path.join(EVIDENCE_DIR, 'real-backend-contract.json');

const ORGS = {
  manufacturer: { key: 'manufacturer', envKey: 'MANUFACTURER', orgNum: 1, msp: 'ManufacturerMSP', role: 'ManufacturerMSP' },
  service: { key: 'service', envKey: 'SERVICE', orgNum: 3, msp: 'ServiceMSP', role: 'ServiceMSP' },
};

const REQUIRED_API_CONTRACTS = [
  { label: 'login', matcher: (record) => record.method === 'POST' && record.path === '/api/auth/login' },
  { label: 'passports-list', matcher: (record) => record.method === 'GET' && record.path.startsWith('/api/passports') },
  { label: 'passport-detail', matcher: (record) => record.method === 'GET' && /^\/api\/passports\/[^/?]+/.test(record.path) },
  { label: 'materials', matcher: (record) => record.path.startsWith('/api/materials') },
  { label: 'bmu-records', matcher: (record) => record.method === 'GET' && record.path.startsWith('/api/bmu/records/') },
  { label: 'maintenance-passports', matcher: (record) => record.method === 'GET' && record.path.startsWith('/api/passports') && record.pageRoute === '/maintenance' },
  { label: 'recycling-passports', matcher: (record) => record.method === 'GET' && record.path.startsWith('/api/passports') && record.pageRoute === '/recycling' },
  { label: 'audit', matcher: (record) => record.method === 'GET' && record.path.startsWith('/api/audit') },
  { label: 'settings-no-api', matcher: (record) => record.path === '/api/settings' && record.status === 'not-called' },
  { label: 'qr-manual-lookup', matcher: (record) => record.method === 'GET' && /^\/api\/passports\/[^/?]+/.test(record.path) && record.pageRoute === '/qr-scan' },
];

const MUTATION_PATHS = new Set(['/api/passports', '/api/materials']);

function isoNow() {
  return new Date().toISOString();
}

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function redactSensitiveString(value) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/-----BEGIN [^-]+PRIVATE KEY-----[\s\S]*?-----END [^-]+PRIVATE KEY-----/g, '[redacted-private-key]')
    .replace(/\b(?:api[_-]?key|private[_-]?key|wallet[_-]?key|seed)\s*[:=]\s*[^\s,;]+/gi, (match) => {
      const separator = match.includes('=') ? '=' : ':';
      return `${match.split(separator)[0]}${separator}[redacted]`;
    });
}

function sanitize(value, depth = 0) {
  if (depth > 4) return '[truncated-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const redacted = redactSensitiveString(value);
    return redacted.length > 1200 ? `${redacted.slice(0, 1200)}...[truncated]` : redacted;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 8).map((entry) => sanitize(entry, depth + 1));

  const cleaned = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/token|password|secret|signature|authorization|api[_-]?key|private[_-]?key|wallet[_-]?key|seed/i.test(key)) {
      cleaned[key] = '[redacted]';
    } else {
      cleaned[key] = sanitize(entry, depth + 1);
    }
  }
  return cleaned;
}

function createEvidence(testInfo) {
  return {
    generatedAt: isoNow(),
    task: '12. Verify real backend integrations and serial mutation contracts',
    baseUrl: BASE,
    evidenceFile: '.sisyphus/evidence/task-12-non-dashboard-real-backend/real-backend-contract.json',
    workers: testInfo.config.workers,
    mocking: {
      apiMockingUsed: false,
      fakeTokenUsed: false,
      fakeResponseUsed: false,
    },
    records: [],
    blockers: [],
    contractViolations: [],
    serialMutations: [],
    contractCoverage: {},
  };
}

function finalizeEvidence(evidence) {
  for (const contract of REQUIRED_API_CONTRACTS) {
    evidence.contractCoverage[contract.label] = evidence.records.some(contract.matcher);
  }
  evidence.summary = {
    recordCount: evidence.records.length,
    blockerCount: evidence.blockers.length,
    contractViolationCount: evidence.contractViolations.length,
    allRequiredContractsObserved: Object.values(evidence.contractCoverage).every(Boolean),
  };
}

function writeEvidence(evidence) {
  ensureEvidenceDir();
  finalizeEvidence(evidence);
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

function apiPathFromUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function credentialsFor(org) {
  return {
    userId: process.env[`NON_DASHBOARD_${org.envKey}_USER_ID`]
      || process.env.NON_DASHBOARD_REAL_BACKEND_USER_ID
      || process.env.E2E_ADMIN_USER
      || 'admin',
    password: process.env[`NON_DASHBOARD_${org.envKey}_PASSWORD`]
      || process.env.NON_DASHBOARD_REAL_BACKEND_PASSWORD
      || process.env.E2E_ADMIN_PASSWORD
      || process.env.FABRIC_ADMIN_SECRET
      || '',
    orgNum: org.orgNum,
  };
}

function envTokenFor(org) {
  if (org.key === 'manufacturer') {
    return process.env.NON_DASHBOARD_MANUFACTURER_TOKEN
      || process.env.NON_DASHBOARD_REAL_BACKEND_TOKEN
      || process.env.E2E_AUTH_TOKEN
      || '';
  }
  return process.env[`NON_DASHBOARD_${org.envKey}_TOKEN`] || '';
}

function isLoopbackBaseUrl() {
  try {
    const parsed = new URL(BASE);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function mutationsAllowedForBaseUrl() {
  return isLoopbackBaseUrl() || process.env.NON_DASHBOARD_ALLOW_MUTATIONS === '1';
}

function makeRecord({ source, method, apiPath, status, role, msp, pageRoute, note }) {
  return {
    generatedAt: isoNow(),
    source,
    method,
    path: apiPath,
    status,
    role,
    msp,
    pageRoute,
    mocked: false,
    note,
  };
}

async function realApi(apiContext, evidence, options) {
  const { method, apiPath, token, role, msp, pageRoute, data, note } = options;
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (['POST', 'PUT'].includes(method) && MUTATION_PATHS.has(apiPath) && !mutationsAllowedForBaseUrl()) {
    const record = makeRecord({
      source: 'playwright-api-request-guarded',
      method,
      apiPath,
      status: 'MUTATION_GUARDED',
      role,
      msp,
      pageRoute,
      note: `${note || 'mutation'} skipped because ${BASE} is not loopback and NON_DASHBOARD_ALLOW_MUTATIONS=1 is absent`,
    });
    record.ok = false;
    record.response = { error: 'Mutation requires loopback base URL or NON_DASHBOARD_ALLOW_MUTATIONS=1' };
    evidence.records.push(record);
    evidence.blockers.push({
      generatedAt: isoNow(),
      type: 'mutation-guarded',
      path: apiPath,
      method,
      role,
      msp,
      pageRoute,
      baseUrl: BASE,
      reason: 'non-loopback mutation requires explicit opt-in',
    });
    return { response: null, body: record.response, record };
  }

  const record = makeRecord({
    source: 'playwright-api-request',
    method,
    apiPath,
    status: null,
    role,
    msp,
    pageRoute,
    note,
  });

  try {
    const url = `${BASE}${apiPath}`;
    let response;
    if (method === 'GET') response = await apiContext.get(url, { headers });
    if (method === 'POST') response = await apiContext.post(url, { headers, data });
    if (method === 'PUT') response = await apiContext.put(url, { headers, data });
    if (!response) throw new Error(`Unsupported method ${method}`);

    const text = await response.text();
    const body = parseJson(text);
    record.status = response.status();
    record.ok = response.ok();
    record.response = sanitize(body);
    record.seedHeaderPresent = Boolean(response.headers()['x-bms-dev-seed']);
    evidence.records.push(record);
    return { response, body, record };
  } catch (error) {
    record.status = 'NETWORK_ERROR';
    record.ok = false;
    record.error = error.message;
    evidence.records.push(record);
    evidence.blockers.push({
      generatedAt: isoNow(),
      type: 'network-error',
      path: apiPath,
      method,
      role,
      msp,
      pageRoute,
      message: error.message,
    });
    return { response: null, body: null, record, error };
  }
}

async function resolveOrgAuth(apiContext, evidence, org, { attemptLogin }) {
  const credentials = credentialsFor(org);
  let loginResult = null;

  if (attemptLogin) {
    loginResult = await realApi(apiContext, evidence, {
      method: 'POST',
      apiPath: '/api/auth/login',
      role: org.role,
      msp: org.msp,
      pageRoute: '/login',
      data: credentials,
      note: credentials.password ? 'real login attempt with configured credentials' : 'real login probe with missing credential blocker',
    });
  }

  if (loginResult?.body?.token) {
    return {
      token: loginResult.body.token,
      userId: loginResult.body.userId || credentials.userId,
      role: loginResult.body.mspId || org.role,
      msp: loginResult.body.mspId || org.msp,
      authSource: 'login',
    };
  }

  const envToken = envTokenFor(org);
  if (envToken) {
    return {
      token: envToken,
      userId: credentials.userId,
      role: process.env[`NON_DASHBOARD_${org.envKey}_MSP`] || org.role,
      msp: process.env[`NON_DASHBOARD_${org.envKey}_MSP`] || org.msp,
      authSource: 'env-token',
    };
  }

  if (attemptLogin) {
    evidence.blockers.push({
      generatedAt: isoNow(),
      type: 'auth-unavailable',
      msp: org.msp,
      role: org.role,
      loginStatus: loginResult?.record?.status || 'not-attempted',
      reason: credentials.password
        ? 'configured credential did not produce a token'
        : 'E2E_ADMIN_PASSWORD/FABRIC_ADMIN_SECRET/NON_DASHBOARD_REAL_BACKEND_PASSWORD absent and no real token env was provided',
    });
  }

  return null;
}

function extractRecords(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.records)) return body.records;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function buildPassportPayload(id) {
  return {
    passportId: `${id}-PASSPORT`,
    batteryId: `${id}-BATTERY`,
    did: `did:sov:${id}`,
    model: 'QA Contract Pack',
    serialNumber: `SN-${id}`,
    manufacturerName: 'QA Manufacturer',
    manufactureCountry: 'KR',
    cellManufacturer: 'QA Cell',
    cellManufactureCountry: 'KR',
    manufactureDate: '2026-04-27',
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
    carbonFootprint: 42,
  };
}

function buildMaterialPayload(id) {
  return {
    materialId: `${id}-MATERIAL`,
    name: 'QA Lithium Carbonate',
    origin: 'Australia',
    supplier: 'QA Supplier',
    quantity: '500',
    unit: 'kg',
    certificationId: `${id}-CERT`,
  };
}

function addNoRequestEvidence(evidence, { apiPath, role, msp, pageRoute, observedCount, note }) {
  const record = makeRecord({
    source: 'playwright-browser-negative-check',
    method: 'NO_REQUEST',
    apiPath,
    status: observedCount === 0 ? 'not-called' : `called-${observedCount}`,
    role,
    msp,
    pageRoute,
    note,
  });
  record.observedCount = observedCount;
  evidence.records.push(record);
  return record;
}

function installPageApiRecorder(page, evidence, { role, msp, pageRoute }) {
  const seen = [];

  const onResponse = (response) => {
    const apiPath = apiPathFromUrl(response.url());
    if (!apiPath.startsWith('/api/')) return;
    const record = makeRecord({
      source: 'playwright-browser-response',
      method: response.request().method(),
      apiPath,
      status: response.status(),
      role,
      msp,
      pageRoute,
      note: 'browser navigation used real same-origin API request',
    });
    seen.push(record);
    evidence.records.push(record);
  };

  const onRequestFailed = (browserRequest) => {
    const apiPath = apiPathFromUrl(browserRequest.url());
    if (!apiPath.startsWith('/api/')) return;
    const record = makeRecord({
      source: 'playwright-browser-requestfailed',
      method: browserRequest.method(),
      apiPath,
      status: 'REQUEST_FAILED',
      role,
      msp,
      pageRoute,
      note: 'browser API request failed before HTTP response',
    });
    record.failure = browserRequest.failure();
    seen.push(record);
    evidence.records.push(record);
  };

  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);

  return {
    seen,
    dispose: () => {
      page.off('response', onResponse);
      page.off('requestfailed', onRequestFailed);
    },
  };
}

async function seedBrowserSession(page, auth) {
  await page.addInitScript(({ token, userId, msp }) => {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_userId', userId);
    sessionStorage.setItem('auth_org', msp);
    localStorage.setItem('bp_token', token);
    localStorage.setItem('bp_userId', userId);
    localStorage.setItem('bp_orgMsp', msp);
  }, { token: auth.token, userId: auth.userId, msp: auth.msp });
}

async function waitForQuietNetwork(page) {
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function verifySettingsDoesNotCallApi(page, evidence, auth) {
  const collector = installPageApiRecorder(page, evidence, {
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/settings',
  });

  try {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-page="settings"]').waitFor({ state: 'visible', timeout: 10000 });
    await waitForQuietNetwork(page);
  } catch (error) {
    evidence.blockers.push({
      generatedAt: isoNow(),
      type: 'browser-route-unavailable',
      pageRoute: '/settings',
      message: error.message,
    });
  } finally {
    const settingsCalls = collector.seen.filter((record) => record.path.startsWith('/api/settings'));
    addNoRequestEvidence(evidence, {
      apiPath: '/api/settings',
      role: auth.role,
      msp: auth.msp,
      pageRoute: '/settings',
      observedCount: settingsCalls.length,
      note: '/settings must stay local/session-only and must not request a settings backend',
    });
    if (settingsCalls.length > 0) {
      evidence.contractViolations.push({
        generatedAt: isoNow(),
        type: 'unexpected-settings-api',
        pageRoute: '/settings',
        calls: settingsCalls,
      });
    }
    collector.dispose();
  }
}

async function verifySettingsRedirectDoesNotCallApi(page, evidence, auth) {
  const collector = installPageApiRecorder(page, evidence, {
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/settings',
  });

  try {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
    await waitForQuietNetwork(page);
  } catch (error) {
    evidence.blockers.push({
      generatedAt: isoNow(),
      type: 'browser-route-unavailable',
      pageRoute: '/settings',
      message: error.message,
    });
  } finally {
    const settingsCalls = collector.seen.filter((record) => record.path.startsWith('/api/settings'));
    addNoRequestEvidence(evidence, {
      apiPath: '/api/settings',
      role: auth.role,
      msp: auth.msp,
      pageRoute: '/settings',
      observedCount: settingsCalls.length,
      note: 'unauthenticated /settings redirect still must not request a settings backend',
    });
    if (settingsCalls.length > 0) {
      evidence.contractViolations.push({
        generatedAt: isoNow(),
        type: 'unexpected-settings-api',
        pageRoute: '/settings',
        calls: settingsCalls,
      });
    }
    collector.dispose();
  }
}

async function verifyQrManualLookup(page, evidence, auth, passportId) {
  const collector = installPageApiRecorder(page, evidence, {
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/qr-scan',
  });

  try {
    await page.goto(`${BASE}/qr-scan`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-page="qr-scan"]').waitFor({ state: 'visible', timeout: 10000 });
    await waitForQuietNetwork(page);

    const cameraButton = page.getByRole('button', { name: '카메라 열기' }).first();
    if (await cameraButton.isVisible().catch(() => false)) {
      await cameraButton.click().catch((error) => {
        evidence.blockers.push({
          generatedAt: isoNow(),
          type: 'camera-click-blocked',
          pageRoute: '/qr-scan',
          message: error.message,
        });
      });
      await page.waitForTimeout(1000);
    }

    const scanBackendCalls = collector.seen.filter((record) => /\/api\/(qr|scan|nfc)/i.test(record.path));
    addNoRequestEvidence(evidence, {
      apiPath: '/api/scan',
      role: auth.role,
      msp: auth.msp,
      pageRoute: '/qr-scan',
      observedCount: scanBackendCalls.length,
      note: 'camera/NFC identify must not call a backend scan endpoint',
    });
    if (scanBackendCalls.length > 0) {
      evidence.contractViolations.push({
        generatedAt: isoNow(),
        type: 'unexpected-scan-api',
        pageRoute: '/qr-scan',
        calls: scanBackendCalls,
      });
    }

    if (!passportId) {
      evidence.blockers.push({
        generatedAt: isoNow(),
        type: 'qr-manual-lookup-skipped',
        pageRoute: '/qr-scan',
        reason: 'no real passportId available from list or serial create response',
      });
      return;
    }

    const encodedPassportId = encodeURIComponent(passportId);
    const manualPath = `/api/passports/${encodedPassportId}`;
    await page.getByPlaceholder(/여권 ID 또는 DID 입력/).fill(passportId);
    const responsePromise = page.waitForResponse((response) => {
      return apiPathFromUrl(response.url()) === manualPath && response.request().method() === 'GET';
    }, { timeout: 10000 }).catch((error) => {
      evidence.blockers.push({
        generatedAt: isoNow(),
        type: 'qr-manual-response-timeout',
        pageRoute: '/qr-scan',
        apiPath: manualPath,
        message: error.message,
      });
      return null;
    });
    await page.getByRole('button', { name: '조회' }).click();
    await responsePromise;
    await waitForQuietNetwork(page);

    const manualCalls = collector.seen.filter((record) => record.method === 'GET' && record.path === manualPath);
    if (manualCalls.length === 0) {
      evidence.contractViolations.push({
        generatedAt: isoNow(),
        type: 'missing-qr-manual-passport-lookup',
        pageRoute: '/qr-scan',
        expectedPath: manualPath,
      });
    }
  } catch (error) {
    evidence.blockers.push({
      generatedAt: isoNow(),
      type: 'browser-route-unavailable',
      pageRoute: '/qr-scan',
      message: error.message,
    });
  } finally {
    collector.dispose();
  }
}

function isAllowedDenial(status) {
  return status === 401 || status === 403;
}

async function probeContractsWithoutManufacturerAuth(apiContext, page, evidence, auth, passportMutationRecord, passportQaId) {
  const qaBlockedId = `QA-${Date.now()}-AUTH-BLOCKED`;
  const materialPayload = buildMaterialPayload(qaBlockedId);

  await realApi(apiContext, evidence, {
    method: 'GET',
    apiPath: '/api/passports?pageSize=5',
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/passports',
    note: 'auth-unavailable probe for passport register endpoint',
  });
  await realApi(apiContext, evidence, {
    method: 'GET',
    apiPath: '/api/passports?pageSize=5',
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/maintenance',
    note: 'auth-unavailable probe for maintenance route passport read endpoint',
  });
  await realApi(apiContext, evidence, {
    method: 'GET',
    apiPath: '/api/passports?pageSize=5',
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/recycling',
    note: 'auth-unavailable probe for recycling route passport read endpoint',
  });
  await realApi(apiContext, evidence, {
    method: 'GET',
    apiPath: `/api/passports/${qaBlockedId}-PASSPORT`,
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/passports/:id',
    note: 'auth-unavailable probe for passport detail endpoint',
  });
  await realApi(apiContext, evidence, {
    method: 'GET',
    apiPath: '/api/materials',
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/materials',
    note: 'auth-unavailable probe for materials endpoint',
  });

  const materialDenied = await realApi(apiContext, evidence, {
    method: 'POST',
    apiPath: '/api/materials',
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/materials',
    data: materialPayload,
    note: 'auth-unavailable serial material mutation probe without fake fallback',
  });
  await realApi(apiContext, evidence, {
    method: 'GET',
    apiPath: `/api/bmu/records/${qaBlockedId}-PASSPORT`,
    token: '',
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/bmu-data',
    note: 'auth-unavailable probe for BMU records endpoint',
  });

  evidence.serialMutations.push({
    generatedAt: isoNow(),
    method: 'POST',
    path: '/api/passports',
    intendedRole: ORGS.manufacturer.role,
    intendedMsp: ORGS.manufacturer.msp,
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/passports',
    status: passportMutationRecord.status,
    mocked: false,
    qaId: passportQaId || passportMutationRecord.response?.passportId || 'auth-unavailable-passport-probe',
    outcome: 'auth-unavailable-real-backend-error',
    response: passportMutationRecord.response,
  });
  evidence.serialMutations.push({
    generatedAt: isoNow(),
    method: 'POST',
    path: '/api/materials',
    intendedRole: ORGS.manufacturer.role,
    intendedMsp: ORGS.manufacturer.msp,
    role: auth.role,
    msp: auth.msp,
    pageRoute: '/materials',
    status: materialDenied.record.status,
    mocked: false,
    qaId: materialPayload.materialId,
    outcome: 'auth-unavailable-real-backend-error',
    response: materialDenied.record.response,
  });

  await verifySettingsRedirectDoesNotCallApi(page, evidence, auth);
  evidence.blockers.push({
    generatedAt: isoNow(),
    type: 'qr-manual-lookup-skipped',
    pageRoute: '/qr-scan',
    reason: 'manual lookup requires a real auth token; no fake token was inserted',
  });
}

test.describe('Non-dashboard real backend contracts', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120000);

  test('records real API evidence and serial mutation contracts without API stubbing', async ({ page, request }, testInfo) => {
    const evidence = createEvidence(testInfo);

    try {
      if (testInfo.config.workers !== 1) {
        evidence.contractViolations.push({
          generatedAt: isoNow(),
          type: 'workers-not-serial',
          expected: 1,
          actual: testInfo.config.workers,
        });
        throw new Error(`non_dashboard_real_backend.spec.js must run with --workers=1; got ${testInfo.config.workers}`);
      }

      const manufacturerAuth = await resolveOrgAuth(request, evidence, ORGS.manufacturer, { attemptLogin: true });
      const serviceAuth = await resolveOrgAuth(request, evidence, ORGS.service, {
        attemptLogin: Boolean(credentialsFor(ORGS.service).password),
      });

      const denialAuth = serviceAuth?.authSource === 'login' && serviceAuth.msp === ORGS.service.msp
        ? serviceAuth
        : { token: '', userId: 'unauthenticated', role: 'Unauthenticated', msp: 'Unauthenticated', authSource: 'no-token' };

      const denialPassportPayload = buildPassportPayload(`QA-${Date.now()}-DENY`);
      const auditDenied = await realApi(request, evidence, {
        method: 'GET',
        apiPath: '/api/audit?page=1&limit=50',
        token: denialAuth.token,
        role: denialAuth.role,
        msp: denialAuth.msp,
        pageRoute: '/audit-log',
        note: 'unauthorized role check for audit ledger',
      });
      if (!isAllowedDenial(auditDenied.record.status)) {
        evidence.contractViolations.push({
          generatedAt: isoNow(),
          type: 'audit-denial-status-unexpected',
          expected: '401 or 403',
          actual: auditDenied.record.status,
          authSource: denialAuth.authSource,
        });
      }

      const mutationDenied = await realApi(request, evidence, {
        method: 'POST',
        apiPath: '/api/passports',
        token: denialAuth.token,
        role: denialAuth.role,
        msp: denialAuth.msp,
        pageRoute: '/passports',
        data: denialPassportPayload,
        note: 'unauthorized role check for passport mutation',
      });
      if (!isAllowedDenial(mutationDenied.record.status)) {
        evidence.contractViolations.push({
          generatedAt: isoNow(),
          type: 'mutation-denial-status-unexpected',
          expected: '401 or 403',
          actual: mutationDenied.record.status,
          authSource: denialAuth.authSource,
        });
      }

      if (!manufacturerAuth?.token) {
        evidence.blockers.push({
          generatedAt: isoNow(),
          type: 'authenticated-contracts-skipped',
          reason: 'no real ManufacturerMSP token from /api/auth/login or explicit env token',
        });
        await probeContractsWithoutManufacturerAuth(request, page, evidence, denialAuth, mutationDenied.record, denialPassportPayload.passportId);
      } else {
        const listResult = await realApi(request, evidence, {
          method: 'GET',
          apiPath: '/api/passports?pageSize=5',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/passports',
          note: 'real passport register read',
        });
        await realApi(request, evidence, {
          method: 'GET',
          apiPath: '/api/passports?pageSize=5',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/maintenance',
          note: 'real maintenance route passport read',
        });
        await realApi(request, evidence, {
          method: 'GET',
          apiPath: '/api/passports?pageSize=5',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/recycling',
          note: 'real recycling route passport read',
        });
        const listedPassports = extractRecords(listResult.body);

        const qaBase = `QA-${Date.now()}`;
        const passportPayload = buildPassportPayload(qaBase);
        const passportCreate = await realApi(request, evidence, {
          method: 'POST',
          apiPath: '/api/passports',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/passports',
          data: passportPayload,
          note: 'serial ManufacturerMSP passport mutation with unique QA id',
        });
        evidence.serialMutations.push({
          generatedAt: isoNow(),
          method: 'POST',
          path: '/api/passports',
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/passports',
          status: passportCreate.record.status,
          mocked: false,
          qaId: passportPayload.passportId,
          outcome: passportCreate.record.ok ? 'success' : 'real-backend-policy-or-error',
          response: passportCreate.record.response,
        });

        const materialList = await realApi(request, evidence, {
          method: 'GET',
          apiPath: '/api/materials',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/materials',
          note: 'real materials register read',
        });

        const materialPayload = buildMaterialPayload(`QA-${Date.now()}`);
        const materialCreate = await realApi(request, evidence, {
          method: 'POST',
          apiPath: '/api/materials',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/materials',
          data: materialPayload,
          note: 'serial ManufacturerMSP material mutation with unique QA id',
        });
        evidence.serialMutations.push({
          generatedAt: isoNow(),
          method: 'POST',
          path: '/api/materials',
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/materials',
          status: materialCreate.record.status,
          mocked: false,
          qaId: materialPayload.materialId,
          outcome: materialCreate.record.ok ? 'success' : 'real-backend-policy-or-error',
          response: materialCreate.record.response,
        });

        const createdPassportId = passportCreate.record.ok
          ? (passportCreate.body?.passportId || passportPayload.passportId)
          : '';
        const listedPassportId = listedPassports.find((passport) => passport?.passportId)?.passportId || '';
        const passportIdForDetail = createdPassportId || listedPassportId;

        if (passportIdForDetail) {
          const encodedPassportId = encodeURIComponent(passportIdForDetail);
          await realApi(request, evidence, {
            method: 'GET',
            apiPath: `/api/passports/${encodedPassportId}`,
            token: manufacturerAuth.token,
            role: manufacturerAuth.role,
            msp: manufacturerAuth.msp,
            pageRoute: '/passports/:id',
            note: 'real passport dossier detail read',
          });
          await realApi(request, evidence, {
            method: 'GET',
            apiPath: `/api/bmu/records/${encodedPassportId}`,
            token: manufacturerAuth.token,
            role: manufacturerAuth.role,
            msp: manufacturerAuth.msp,
            pageRoute: '/bmu-data',
            note: 'real BMU records read for a real passport id',
          });
        } else {
          evidence.blockers.push({
            generatedAt: isoNow(),
            type: 'passport-id-unavailable',
            reason: 'no listed passport and serial POST /api/passports did not return a usable passportId',
            listStatus: listResult.record.status,
            createStatus: passportCreate.record.status,
          });
        }

        await realApi(request, evidence, {
          method: 'GET',
          apiPath: '/api/audit?page=1&limit=50',
          token: manufacturerAuth.token,
          role: manufacturerAuth.role,
          msp: manufacturerAuth.msp,
          pageRoute: '/audit-log',
          note: 'real audit ledger read under an allowed MSP',
        });

        if (!materialList.record.ok) {
          evidence.blockers.push({
            generatedAt: isoNow(),
            type: 'materials-read-policy-or-error',
            status: materialList.record.status,
            response: materialList.record.response,
          });
        }

        await seedBrowserSession(page, manufacturerAuth);
        await verifySettingsDoesNotCallApi(page, evidence, manufacturerAuth);
        await verifyQrManualLookup(page, evidence, manufacturerAuth, passportIdForDetail);
      }
    } finally {
      writeEvidence(evidence);
    }

    expect(evidence.contractViolations).toEqual([]);
  });
});
