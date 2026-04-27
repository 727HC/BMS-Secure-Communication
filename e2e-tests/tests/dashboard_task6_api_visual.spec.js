const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4173';
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(REPO_ROOT, '.sisyphus/evidence');

const AUTH_SEED = {
  token: 'task6-route-mock-token',
  userId: 'qa-dashboard-task6',
};

const VIEWPORTS = [
  { width: 3824, height: 1925, screenshot: 'dashboard-visual-containment-3824x1925.png' },
  { width: 1920, height: 1080, screenshot: 'dashboard-visual-containment-1920x1080.png' },
  { width: 1690, height: 931, screenshot: 'dashboard-visual-containment-1690x931.png' },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
];

const allowedDashboardEndpoints = [
  '/api/passports',
  '/api/status',
  '/api/bmu/records/:passportId',
  '/api/audit?page=1&limit=5&writeOnly=false',
];

const happyPassports = [
  {
    passportId: 'BAT-P-001',
    batteryId: 'BMS-001',
    model: 'NCM 82kWh Pack',
    serialNumber: 'SN-001',
    status: 'ACTIVE',
    vin: 'KMHQA240425001',
    currentSoc: 68,
    currentSoh: 91,
    totalDischargeCycles: 124,
    regulatoryVerificationStatus: 'VERIFIED',
    physicalHistoryVerification: { status: 'VERIFIED' },
    createdAt: '2026-04-20T08:00:00.000Z',
    updatedAt: '2026-04-25T08:30:00.000Z',
  },
  {
    passportId: 'BAT-P-002',
    batteryId: 'BMS-002',
    model: 'LFP 58kWh Pack',
    serialNumber: 'SN-002',
    status: 'MAINTENANCE',
    vin: '',
    currentSoc: 54,
    currentSoh: 76,
    totalDischargeCycles: 210,
    regulatoryVerificationStatus: 'PENDING',
    physicalHistoryVerification: { status: 'PENDING' },
    createdAt: '2026-04-21T08:00:00.000Z',
    updatedAt: '2026-04-25T07:10:00.000Z',
  },
  {
    passportId: 'BAT-P-003',
    batteryId: 'BMS-003',
    model: 'NCM 72kWh Pack',
    serialNumber: 'SN-003',
    status: 'ACTIVE',
    vin: 'KMHQA240425003',
    currentSoc: 81,
    currentSoh: 84,
    totalDischargeCycles: 98,
    regulatoryVerificationStatus: 'FAILED',
    physicalHistoryVerification: { status: 'VERIFIED' },
    createdAt: '2026-04-22T08:00:00.000Z',
    updatedAt: '2026-04-24T06:15:00.000Z',
  },
  {
    passportId: 'BAT-P-004',
    batteryId: 'BMS-004',
    model: 'Prototype Analysis Pack',
    serialNumber: 'SN-004',
    status: 'ANALYSIS',
    vin: 'KMHQA240425004',
    regulatoryVerificationStatus: 'VERIFIED',
    physicalHistoryVerification: { status: 'VERIFIED' },
    createdAt: '2026-04-23T08:00:00.000Z',
    updatedAt: '2026-04-23T10:15:00.000Z',
  },
];

const happyAuditRecords = [
  {
    id: 'tx-good-001',
    action: 'CreatePassport',
    timestamp: '2026-04-21T08:00:00.000Z',
    userId: 'issuer-1',
    orgMsp: 'ManufacturerMSP',
    block: '501',
    statusCode: 200,
    success: true,
    targetId: 'BAT-P-001',
  },
  {
    id: 'tx-good-002',
    action: 'BindVin',
    timestamp: '2026-04-22T08:00:00.000Z',
    userId: 'ev-ops',
    orgMsp: 'EVManufacturerMSP',
    blockNumber: '502',
    statusCode: 200,
    success: true,
    targetId: 'BAT-P-001',
  },
  {
    id: 'tx-good-003',
    method: 'UpdateVerification',
    timestamp: '2026-04-23T08:00:00.000Z',
    userId: 'regulator-1',
    orgMsp: 'RegulatorMSP',
    block: '503',
    statusCode: 204,
    success: true,
    targetId: 'BAT-P-003',
  },
  {
    id: 'tx-good-004',
    action: 'RecordMaintenance',
    timestamp: '2026-04-24T08:00:00.000Z',
    userId: 'service-1',
    orgMsp: 'ServiceMSP',
    block: '504',
    statusCode: 201,
    success: true,
    targetId: 'BAT-P-002',
  },
  {
    id: 'tx-fail-001',
    action: 'RecordBMUData',
    timestamp: '2026-04-25T08:00:00.000Z',
    userId: 'bmu-agent',
    orgMsp: 'ManufacturerMSP',
    block: '505',
    statusCode: 500,
    success: false,
    targetId: 'BAT-P-004',
  },
];

const happyBmuRecords = {
  'BAT-P-001': [
    {
      recordId: 'bmu-001-old',
      timestamp: '2026-04-24T08:00:00.000Z',
      soc: 71000,
      voltage: 402.1,
      current: 8.2,
      temperature: 30600,
      dischargeCycles: 123,
      statusFlags: 0,
    },
    {
      recordId: 'bmu-001-latest',
      timestamp: '2026-04-25T08:30:00.000Z',
      soc: 72000,
      voltage: 403.4,
      current: 9.5,
      temperature: 31200,
      dischargeCycles: 124,
      statusFlags: 1,
    },
  ],
  'BAT-P-002': [
    {
      recordId: 'bmu-002-latest',
      timestamp: '2026-04-25T08:35:00.000Z',
      soc: 56000,
      voltage: 389.2,
      current: 5.1,
      temperature: 33700,
      dischargeCycles: 211,
      statusFlags: 4,
    },
  ],
  'BAT-P-003': [],
  'BAT-P-004': [],
};

const scenarioFixtures = {
  happy: {
    passportsResponse: { status: 200, body: { records: happyPassports } },
    statusResponse: {
      status: 200,
      body: { fabric: 'connected', channel: 'passportchannel', contract: 'passport-contract' },
    },
    auditResponse: { status: 200, body: { records: happyAuditRecords } },
    bmuByPassport: happyBmuRecords,
  },
  empty: {
    passportsResponse: { status: 200, body: { records: [] } },
    statusResponse: {
      status: 200,
      body: { fabric: 'connected', channel: 'passportchannel', contract: 'passport-contract' },
    },
    auditResponse: { status: 200, body: { records: [] } },
    bmuByPassport: {},
  },
  status500Audit403: {
    passportsResponse: { status: 200, body: { records: [] } },
    statusResponse: { status: 500, body: { error: 'Status unavailable' } },
    auditResponse: { status: 403, body: { error: 'Forbidden' } },
    bmuByPassport: {},
  },
  statusNetworkFailure: {
    passportsResponse: { status: 200, body: { records: [] } },
    statusResponse: { networkError: 'Mock network failure for /api/status' },
    auditResponse: { status: 200, body: { records: [] } },
    bmuByPassport: {},
  },
};

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function writeEvidence(fileName, payload) {
  ensureEvidenceDir();
  fs.writeFileSync(path.join(EVIDENCE_DIR, fileName), `${JSON.stringify(payload, null, 2)}\n`);
}

function installRuntimeCollectors(page) {
  const runtime = {
    console: [],
    pageErrors: [],
    requestFailures: [],
  };

  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    runtime.console.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });
  page.on('pageerror', (error) => {
    runtime.pageErrors.push({ message: error.message, stack: error.stack });
  });
  page.on('requestfailed', (request) => {
    runtime.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure(),
    });
  });

  return runtime;
}

async function seedMockedDashboard(page, scenarioName, org) {
  const scenario = scenarioFixtures[scenarioName];
  await page.addInitScript(({ auth, fixture, orgMsp }) => {
    sessionStorage.setItem('auth_token', auth.token);
    sessionStorage.setItem('auth_userId', auth.userId);
    sessionStorage.setItem('auth_org', orgMsp);
    localStorage.setItem('auth_token', auth.token);
    localStorage.setItem('auth_userId', auth.userId);
    localStorage.setItem('auth_org', orgMsp);
    localStorage.setItem('bp_token', auth.token);
    localStorage.setItem('bp_userId', auth.userId);
    localStorage.setItem('bp_orgMsp', orgMsp);

    window.__dashboardQaCalls = [];
    window.__dashboardQaUnhandledCalls = [];

    const originalFetch = window.fetch.bind(window);
    const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
    const normalizeResponse = (response) => {
      if (response.networkError) throw new TypeError(response.networkError);
      return jsonResponse(response.body, response.status || 200);
    };

    window.fetch = async (input, init = {}) => {
      const request = input instanceof Request ? input : null;
      const rawUrl = request ? request.url : String(input);
      const url = new URL(rawUrl, window.location.origin);
      const method = init.method || (request ? request.method : 'GET');

      if (!url.pathname.startsWith('/api/')) {
        return originalFetch(input, init);
      }

      const call = {
        at: new Date().toISOString(),
        method,
        pathname: url.pathname,
        search: url.search,
        url: `${url.pathname}${url.search}`,
      };
      window.__dashboardQaCalls.push(call);

      try {
        if (url.pathname === '/api/passports' && url.search === '') {
          call.mock = 'passports';
          call.status = fixture.passportsResponse.status || 200;
          return normalizeResponse(fixture.passportsResponse);
        }

        if (url.pathname === '/api/status' && url.search === '') {
          call.mock = 'status';
          call.status = fixture.statusResponse.status || (fixture.statusResponse.networkError ? 'network-error' : 200);
          return normalizeResponse(fixture.statusResponse);
        }

        if (url.pathname.startsWith('/api/bmu/records/')) {
          const passportId = decodeURIComponent(url.pathname.slice('/api/bmu/records/'.length));
          call.mock = 'bmu-records';
          call.passportId = passportId;
          call.status = 200;
          return jsonResponse({ records: fixture.bmuByPassport[passportId] || [] });
        }

        if (url.pathname === '/api/audit' && url.search === '?page=1&limit=5&writeOnly=false') {
          call.mock = 'dashboard-audit';
          call.status = fixture.auditResponse.status || 200;
          return normalizeResponse(fixture.auditResponse);
        }

        if (url.pathname === '/api/audit') {
          call.mock = 'target-page-audit';
          call.status = fixture.auditResponse.status || 200;
          return normalizeResponse(fixture.auditResponse);
        }

        call.mock = 'unhandled';
        call.status = 404;
        window.__dashboardQaUnhandledCalls.push(call);
        return jsonResponse({ error: `Unhandled mock path: ${url.pathname}${url.search}` }, 404);
      } catch (error) {
        call.mockError = error instanceof Error ? error.message : String(error);
        call.status = 'network-error';
        throw error;
      }
    };
  }, { auth: AUTH_SEED, fixture: scenario, orgMsp: org });
}

async function openDashboard(browser, { scenarioName = 'happy', org = 'ManufacturerMSP', viewport = { width: 1690, height: 931 } } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const runtime = installRuntimeCollectors(page);
  await seedMockedDashboard(page, scenarioName, org);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.vk-dash')).toBeVisible();
  await page.evaluate(() => document.fonts?.ready ?? true);
  return { context, page, runtime };
}

async function waitForHappyDashboard(page) {
  await page.waitForURL(/passportId=BAT-P-001/);
  await page.waitForFunction(() => {
    const calls = window.__dashboardQaCalls || [];
    return calls.some((call) => call.url === '/api/passports')
      && calls.some((call) => call.url === '/api/status')
      && calls.some((call) => call.url === '/api/bmu/records/BAT-P-001')
      && calls.some((call) => call.url === '/api/audit?page=1&limit=5&writeOnly=false');
  });
  await expect(page.getByText('tx-good-001')).toBeVisible();
  await expect(page.locator('.vk-dash')).toHaveAttribute('data-selected-passport-id', 'BAT-P-001');
}

async function waitForEmptyDashboard(page) {
  await expect(page.getByText('표시할 알림이 없습니다')).toBeVisible();
  await expect(page.getByText('대기 중인 작업이 없습니다')).toBeVisible();
  await expect(page.getByText('원장 로그가 없습니다')).toBeVisible();
  await page.waitForFunction(() => {
    const calls = window.__dashboardQaCalls || [];
    return calls.some((call) => call.url === '/api/passports')
      && calls.some((call) => call.url === '/api/status')
      && calls.some((call) => call.url === '/api/audit?page=1&limit=5&writeOnly=false');
  });
}

async function waitForPermissionAndStatusFallback(page) {
  await expect(page.getByText('권한 필요').first()).toBeVisible();
  await expect(page.getByText('상태 확인 불가').first()).toBeVisible();
}

async function getCalls(page) {
  return page.evaluate(() => window.__dashboardQaCalls || []);
}

async function clearCalls(page) {
  await page.evaluate(() => {
    window.__dashboardQaCalls = [];
    window.__dashboardQaUnhandledCalls = [];
  });
}

function isAllowedDashboardEndpoint(call) {
  if (call.url === '/api/passports') return true;
  if (call.url === '/api/status') return true;
  if (call.pathname && call.pathname.startsWith('/api/bmu/records/') && !call.search) return true;
  return call.url === '/api/audit?page=1&limit=5&writeOnly=false';
}

function endpointPolicy(calls) {
  const forbiddenDashboardCalls = calls.filter((call) => call.pathname === '/api/dashboard' || call.url.includes('/api/dashboard'));
  const unexpectedDashboardCalls = calls.filter((call) => !isAllowedDashboardEndpoint(call));
  return {
    allowedDashboardEndpoints,
    calls,
    forbiddenDashboardCalls,
    unexpectedDashboardCalls,
    noApiDashboard: forbiddenDashboardCalls.length === 0,
    allowedDashboardOnly: unexpectedDashboardCalls.length === 0,
  };
}

async function collectRenderedValues(page) {
  return page.evaluate(() => {
    const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const rows = (selector) => Array.from(document.querySelectorAll(selector));

    return {
      url: window.location.href,
      selectedPassportId: document.querySelector('.vk-dash')?.getAttribute('data-selected-passport-id') || null,
      summary: document.querySelector('.vk-dash__sub')?.getAttribute('title') || '',
      kpis: rows('.vk-kpi').map((card) => ({
        label: text(card.querySelector('.vk-kpi__label')),
        value: text(card.querySelector('.vk-kpi__value')),
        delta: text(card.querySelector('.vk-kpi__delta')),
        sparkAriaLabel: card.querySelector('.vk-kpi__spark')?.getAttribute('aria-label') || '',
        sparkEmptyText: text(card.querySelector('.vk-kpi__spark-empty')),
      })),
      fleet: {
        title: text(document.querySelector('.vk-fleet .vk-card__title')),
        selectedLabel: text(document.querySelector('.vk-fleet .vk-card__sub')),
        gauges: rows('.vk-gauge').map((gauge) => ({
          label: text(gauge.querySelector('.vk-gauge__label')),
          value: text(gauge.querySelector('.vk-gauge__value')),
        })),
      },
      dataFlow: rows('.vk-dataflow__node').map((node) => ({
        label: text(node.querySelector('.vk-dataflow__label')),
        action: text(node.querySelector('.vk-dataflow__val')),
        status: text(node.querySelector('.vk-dataflow__status')),
      })),
      security: rows('.vk-sec').map((item) => ({
        label: text(item.querySelector('.vk-sec__label')),
        value: text(item.querySelector('.vk-sec__value')),
      })),
      alerts: rows('.vk-alerts__row').map((row) => ({
        text: text(row),
        message: text(row.querySelector('.vk-alerts__msg')),
        source: text(row.querySelector('.vk-alerts__id')),
        severity: text(row.querySelector('.vk-alerts__status')),
        time: text(row.querySelector('.vk-alerts__time')),
      })),
      tasks: rows('.vk-task').map((task) => ({
        text: text(task),
        label: text(task.querySelector('.vk-task__label')),
        count: text(task.querySelector('.vk-task__num')),
        unit: text(task.querySelector('.vk-task__unit')),
        disabled: task instanceof HTMLButtonElement ? task.disabled : false,
      })),
      ledger: rows('.vk-ledger tbody tr').map((row) => Array.from(row.querySelectorAll('td')).map((cell) => text(cell))),
      buttons: rows('button').map((button) => ({
        text: text(button),
        ariaLabel: button.getAttribute('aria-label') || '',
        title: button.getAttribute('title') || '',
        disabled: button.disabled,
        className: button.className,
      })),
    };
  });
}

async function collectContainmentMetrics(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => document.fonts?.ready ?? true);
  await page.waitForTimeout(100);

  return page.evaluate((currentViewport) => {
    const tolerance = 1;
    const rect = (element) => {
      if (!element) return null;
      const r = element.getBoundingClientRect();
      return {
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        left: r.left,
        width: r.width,
        height: r.height,
        x: r.x,
        y: r.y,
      };
    };
    const withinRect = (child, parent) => Boolean(child && parent)
      && child.left >= parent.left - tolerance
      && child.right <= parent.right + tolerance
      && child.top >= parent.top - tolerance
      && child.bottom <= parent.bottom + tolerance;

    const sparkContainment = Array.from(document.querySelectorAll('.vk-kpi__spark svg')).map((svg, index) => {
      const card = svg.closest('.vk-kpi');
      const spark = svg.closest('.vk-kpi__spark');
      const svgRect = rect(svg);
      const cardRect = rect(card);
      const sparkRect = rect(spark);
      return {
        index,
        label: card?.querySelector('.vk-kpi__label')?.textContent?.trim() || '',
        svgRect,
        sparkRect,
        cardRect,
        svgWithinSpark: withinRect(svgRect, sparkRect),
        svgWithinCard: withinRect(svgRect, cardRect),
      };
    });

    const alertsContainment = Array.from(document.querySelectorAll('.vk-alerts__row')).map((row, index) => {
      const card = row.closest('.vk-card');
      const list = row.closest('.vk-alerts');
      const rowRect = rect(row);
      const cardRect = rect(card);
      const listRect = rect(list);
      const style = list ? window.getComputedStyle(list) : null;
      const visibleWithinCard = withinRect(rowRect, cardRect);
      const visibleWithinList = withinRect(rowRect, listRect);
      const rowOffsetWithinList = list ? row.offsetTop - list.offsetTop : row.offsetTop;
      const insideInternalScrollArea = Boolean(list)
        && style?.overflowY !== 'visible'
        && list.scrollHeight >= list.clientHeight
        && rowOffsetWithinList >= -tolerance
        && rowOffsetWithinList + row.offsetHeight <= list.scrollHeight + tolerance
        && row.offsetWidth <= list.clientWidth + tolerance;
      return {
        index,
        text: row.textContent?.replace(/\s+/g, ' ').trim() || '',
        rowRect,
        cardRect,
        listRect,
        listScrollHeight: list?.scrollHeight || 0,
        listClientHeight: list?.clientHeight || 0,
        rowOffsetTop: row.offsetTop,
        listOffsetTop: list?.offsetTop || 0,
        rowOffsetWithinList,
        rowOffsetHeight: row.offsetHeight,
        overflowY: style?.overflowY || '',
        visibleWithinCard,
        visibleWithinList,
        insideInternalScrollArea,
        pass: visibleWithinCard || visibleWithinList || insideInternalScrollArea,
      };
    });

    const documentElement = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(documentElement.scrollWidth, body.scrollWidth);
    const scrollHeight = Math.max(documentElement.scrollHeight, body.scrollHeight);
    const clientWidth = documentElement.clientWidth;
    const clientHeight = documentElement.clientHeight;

    return {
      viewport: currentViewport,
      url: window.location.href,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth,
      scrollHeight,
      clientWidth,
      clientHeight,
      bodyScrollWidth: body.scrollWidth,
      bodyScrollHeight: body.scrollHeight,
      noDocumentHorizontalScroll: scrollWidth <= clientWidth + tolerance,
      hasDocumentVerticalScroll: scrollHeight > clientHeight + tolerance,
      dashRect: rect(document.querySelector('.vk-dash')),
      alertsRect: rect(document.querySelector('.vk-alerts')),
      kpiSparkContainment: sparkContainment,
      alertRowsContainment: alertsContainment,
      kpiSparkContainmentPassed: sparkContainment.every((item) => item.svgWithinSpark && item.svgWithinCard),
      alertRowsContainmentPassed: alertsContainment.every((item) => item.pass),
    };
  }, viewport);
}

async function captureContainmentSet(page) {
  const results = [];
  for (const viewport of VIEWPORTS) {
    const metrics = await collectContainmentMetrics(page, { width: viewport.width, height: viewport.height });
    if (viewport.screenshot) {
      await page.screenshot({ path: path.join(EVIDENCE_DIR, viewport.screenshot), fullPage: false });
      metrics.screenshot = `.sisyphus/evidence/${viewport.screenshot}`;
    }
    results.push(metrics);
  }
  return results;
}

async function verifyClickRoute(browser, name, locatorFactory, expectedPath) {
  const { context, page, runtime } = await openDashboard(browser, { scenarioName: 'happy' });
  await waitForHappyDashboard(page);
  await clearCalls(page);

  await locatorFactory(page).click();
  await page.waitForFunction((pathName) => window.location.pathname === pathName, expectedPath);
  await page.waitForTimeout(100);
  const callsAfterClick = await getCalls(page);
  const result = {
    name,
    expectedPath,
    actualPath: await page.evaluate(() => window.location.pathname),
    actualUrl: page.url(),
    callsAfterClick,
    runtime,
  };
  result.pass = result.actualPath === expectedPath;
  await context.close();
  return result;
}

async function collectSelectorOutcome(browser) {
  const { context, page, runtime } = await openDashboard(browser, { scenarioName: 'happy' });
  await waitForHappyDashboard(page);
  await clearCalls(page);

  await page.getByRole('button', { name: /Select Battery/ }).click();
  await page.getByRole('option', { name: /BAT-P-002/ }).click();
  await page.waitForURL(/passportId=BAT-P-002/);
  await page.waitForFunction(() => (window.__dashboardQaCalls || []).some((call) => call.url === '/api/bmu/records/BAT-P-002'));
  await expect(page.locator('.vk-dash')).toHaveAttribute('data-selected-passport-id', 'BAT-P-002');
  await expect(page.getByText('56 %')).toBeVisible();

  const result = {
    actualUrl: page.url(),
    selectedPassportId: await page.locator('.vk-dash').getAttribute('data-selected-passport-id'),
    callsAfterSelection: await getCalls(page),
    renderedValues: await collectRenderedValues(page),
    runtime,
  };
  result.pass = result.selectedPassportId === 'BAT-P-002'
    && result.actualUrl.includes('passportId=BAT-P-002')
    && result.callsAfterSelection.some((call) => call.url === '/api/bmu/records/BAT-P-002');
  await context.close();
  return result;
}

async function collectUnauthorizedOutcome(browser) {
  const { context, page, runtime } = await openDashboard(browser, { scenarioName: 'happy', org: 'ServiceMSP' });
  await expect(page.locator('.vk-dash')).toBeVisible();
  await page.waitForFunction(() => (window.__dashboardQaCalls || []).some((call) => call.url === '/api/status'));
  await waitForPermissionAndStatusFallback(page);
  await page.waitForTimeout(100);

  const values = await collectRenderedValues(page);
  const calls = await getCalls(page);
  const disabledAuditControls = values.buttons.filter((button) => button.disabled && button.text.includes('권한 필요'));
  const result = {
    org: 'ServiceMSP',
    calls,
    auditCalls: calls.filter((call) => call.pathname === '/api/audit'),
    disabledAuditControls,
    renderedValues: values,
    runtime,
  };
  result.pass = result.auditCalls.length === 0 && disabledAuditControls.length >= 3;
  await context.close();
  return result;
}

async function collectShellControlOutcome(browser) {
  const { context, page, runtime } = await openDashboard(browser, { scenarioName: 'happy' });
  await waitForHappyDashboard(page);
  const beforeDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByRole('button', { name: /다크 모드/ }).click();
  const afterDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

  const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map((anchor) => {
    const url = new URL(anchor.href, window.location.origin);
    return {
      text: anchor.textContent?.replace(/\s+/g, ' ').trim() || anchor.getAttribute('aria-label') || '',
      href: anchor.getAttribute('href') || '',
      pathname: url.pathname,
    };
  }));
  const knownRoutes = new Set(['/dashboard', '/maintenance', '/passports', '/materials', '/bmu-data', '/recycling', '/audit-log', '/login', '/']);
  const fakeHrefLinks = links.filter((link) => link.href === '#' || link.href.startsWith('javascript:'));
  const unroutedReferenceLinks = links.filter((link) => link.href.startsWith('/') && !knownRoutes.has(link.pathname));

  const topControls = await page.evaluate(() => Array.from(document.querySelectorAll('.vk-ref-top-action')).map((button) => ({
    ariaLabel: button.getAttribute('aria-label') || '',
    title: button.getAttribute('title') || '',
    text: button.textContent?.replace(/\s+/g, ' ').trim() || '',
    disabled: button.disabled,
  })));

  await page.getByRole('button', { name: /로그아웃/ }).click();
  await page.waitForFunction(() => window.location.pathname === '/login');
  const logoutState = await page.evaluate(() => ({
    path: window.location.pathname,
    sessionToken: sessionStorage.getItem('auth_token'),
    sessionUser: sessionStorage.getItem('auth_userId'),
    sessionOrg: sessionStorage.getItem('auth_org'),
    localToken: localStorage.getItem('auth_token'),
    bpToken: localStorage.getItem('bp_token'),
  }));

  const result = {
    darkMode: { before: beforeDark, after: afterDark, pass: beforeDark !== afterDark && afterDark === true },
    topControls,
    fakeHrefCount: fakeHrefLinks.length,
    fakeHrefLinks,
    unroutedReferenceLinks,
    logout: {
      ...logoutState,
      pass: logoutState.path === '/login'
        && logoutState.sessionToken === null
        && logoutState.sessionUser === null
        && logoutState.sessionOrg === null
        && logoutState.localToken === null
        && logoutState.bpToken === null,
    },
    runtime,
  };
  result.pass = result.darkMode.pass && result.logout.pass && result.fakeHrefCount === 0;
  await context.close();
  return result;
}

test.describe.serial('Dashboard Task 6 API integration and visual containment evidence', () => {
  test.setTimeout(180000);

  test('generates deterministic API, fallback, routing, and screenshot evidence', async ({ browser }) => {
    ensureEvidenceDir();

    const generatedAt = new Date().toISOString();
    const happySession = await openDashboard(browser, { scenarioName: 'happy' });
    await waitForHappyDashboard(happySession.page);
    const happyCalls = await getCalls(happySession.page);
    const happyEndpointPolicy = endpointPolicy(happyCalls);
    const happyRenderedValues = await collectRenderedValues(happySession.page);
    const containmentMetrics = await captureContainmentSet(happySession.page);

    const happyEvidence = {
      generatedAt,
      tool: 'Playwright test with addInitScript fetch route mocks via Vite preview',
      baseUrl: BASE,
      authSeed: { ...AUTH_SEED, org: 'ManufacturerMSP' },
      endpointPolicy: happyEndpointPolicy,
      fixtures: {
        passportCount: happyPassports.length,
        selectedPassportId: 'BAT-P-001',
        bmuRecordsForSelected: happyBmuRecords['BAT-P-001'].length,
        auditRecordCount: happyAuditRecords.length,
      },
      renderedValues: happyRenderedValues,
      containmentMetrics,
      runtime: happySession.runtime,
      pass: happyEndpointPolicy.noApiDashboard
        && happyEndpointPolicy.allowedDashboardOnly
        && containmentMetrics.every((metric) => metric.noDocumentHorizontalScroll)
        && containmentMetrics.every((metric) => metric.kpiSparkContainmentPassed)
        && containmentMetrics.every((metric) => metric.alertRowsContainmentPassed),
    };
    writeEvidence('dashboard-api-integration-metrics.json', happyEvidence);
    await happySession.context.close();

    const emptySession = await openDashboard(browser, { scenarioName: 'empty' });
    await waitForEmptyDashboard(emptySession.page);
    const emptyCalls = await getCalls(emptySession.page);
    const emptyValues = await collectRenderedValues(emptySession.page);
    const emptyEndpointPolicy = endpointPolicy(emptyCalls);
    await emptySession.context.close();

    const status403Session = await openDashboard(browser, { scenarioName: 'status500Audit403' });
    await waitForPermissionAndStatusFallback(status403Session.page);
    await expect(status403Session.page.getByText('플랫폼 상태 조회 실패')).toBeVisible();
    const status403Calls = await getCalls(status403Session.page);
    const status403Values = await collectRenderedValues(status403Session.page);
    const status403EndpointPolicy = endpointPolicy(status403Calls);
    await status403Session.context.close();

    const networkSession = await openDashboard(browser, {
      scenarioName: 'statusNetworkFailure',
      org: 'ServiceMSP',
    });
    await waitForPermissionAndStatusFallback(networkSession.page);
    const networkCalls = await getCalls(networkSession.page);
    const networkValues = await collectRenderedValues(networkSession.page);
    const networkEndpointPolicy = endpointPolicy(networkCalls);
    await networkSession.context.close();

    const emptyErrorEvidence = {
      generatedAt,
      tool: 'Playwright test with addInitScript fetch route mocks via Vite preview',
      baseUrl: BASE,
      scenarios: {
        emptyAuthorized: {
          authSeed: { ...AUTH_SEED, org: 'ManufacturerMSP' },
          endpointPolicy: emptyEndpointPolicy,
          renderedValues: emptyValues,
          visibleStates: {
            noAlerts: emptyValues.alerts.some((row) => row.message.includes('표시할 알림이 없습니다')),
            noTasks: emptyValues.tasks.some((task) => task.label.includes('대기 중인 작업이 없습니다')),
            noLedger: emptyValues.ledger.some((row) => row.join(' ').includes('원장 로그가 없습니다')),
          },
          runtime: emptySession.runtime,
        },
        status500Audit403: {
          authSeed: { ...AUTH_SEED, org: 'ManufacturerMSP' },
          endpointPolicy: status403EndpointPolicy,
          renderedValues: status403Values,
          visibleStates: {
            permissionRequired: status403Values.ledger.some((row) => row.join(' ').includes('권한 필요')),
            statusUnknown: status403Values.security.some((row) => row.value.includes('상태 확인 불가')),
            auditPermission: status403Values.security.some((row) => row.value.includes('감사 권한 필요')),
          },
          runtime: status403Session.runtime,
        },
        statusNetworkFailureNonAuthorized: {
          authSeed: { ...AUTH_SEED, org: 'ServiceMSP' },
          endpointPolicy: networkEndpointPolicy,
          renderedValues: networkValues,
          visibleStates: {
            permissionRequired: networkValues.ledger.some((row) => row.join(' ').includes('권한 필요')),
            statusUnknown: networkValues.security.some((row) => row.value.includes('상태 확인 불가')),
          },
          auditCalls: networkCalls.filter((call) => call.pathname === '/api/audit'),
          runtime: networkSession.runtime,
        },
      },
    };
    emptyErrorEvidence.pass = emptyErrorEvidence.scenarios.emptyAuthorized.endpointPolicy.noApiDashboard
      && emptyErrorEvidence.scenarios.emptyAuthorized.endpointPolicy.allowedDashboardOnly
      && emptyErrorEvidence.scenarios.emptyAuthorized.visibleStates.noAlerts
      && emptyErrorEvidence.scenarios.emptyAuthorized.visibleStates.noTasks
      && emptyErrorEvidence.scenarios.emptyAuthorized.visibleStates.noLedger
      && emptyErrorEvidence.scenarios.status500Audit403.endpointPolicy.noApiDashboard
      && emptyErrorEvidence.scenarios.status500Audit403.endpointPolicy.allowedDashboardOnly
      && emptyErrorEvidence.scenarios.status500Audit403.visibleStates.permissionRequired
      && emptyErrorEvidence.scenarios.status500Audit403.visibleStates.statusUnknown
      && emptyErrorEvidence.scenarios.status500Audit403.visibleStates.auditPermission
      && emptyErrorEvidence.scenarios.statusNetworkFailureNonAuthorized.endpointPolicy.noApiDashboard
      && emptyErrorEvidence.scenarios.statusNetworkFailureNonAuthorized.endpointPolicy.allowedDashboardOnly
      && emptyErrorEvidence.scenarios.statusNetworkFailureNonAuthorized.auditCalls.length === 0
      && emptyErrorEvidence.scenarios.statusNetworkFailureNonAuthorized.visibleStates.permissionRequired
      && emptyErrorEvidence.scenarios.statusNetworkFailureNonAuthorized.visibleStates.statusUnknown;
    writeEvidence('dashboard-api-empty-error-metrics.json', emptyErrorEvidence);

    const routeMatrix = [];
    routeMatrix.push(await verifyClickRoute(browser, 'dataflow-detail', (page) => page.locator('.vk-dataflow').getByRole('button', { name: /상세 보기/ }), '/bmu-data'));
    routeMatrix.push(await verifyClickRoute(browser, 'alerts-all', (page) => page.locator('.vk-grid--2 > .vk-card').nth(0).getByRole('button', { name: /전체 알림 보기/ }), '/audit-log'));
    routeMatrix.push(await verifyClickRoute(browser, 'security-detail', (page) => page.locator('.vk-grid--2 > .vk-card').nth(1).getByRole('button', { name: /상세 보기/ }), '/audit-log'));
    routeMatrix.push(await verifyClickRoute(browser, 'tasks-all', (page) => page.locator('.vk-grid--ledger > .vk-card').nth(0).getByRole('button', { name: /전체 보기/ }), '/passports'));
    routeMatrix.push(await verifyClickRoute(browser, 'task-vin', (page) => page.locator('button.vk-task').filter({ hasText: 'VIN 연결 대기' }), '/passports'));
    routeMatrix.push(await verifyClickRoute(browser, 'task-verification', (page) => page.locator('button.vk-task').filter({ hasText: '검증 대기' }), '/passports'));
    routeMatrix.push(await verifyClickRoute(browser, 'task-maintenance', (page) => page.locator('button.vk-task').filter({ hasText: '정비 필요' }), '/maintenance'));
    routeMatrix.push(await verifyClickRoute(browser, 'task-bmu', (page) => page.locator('button.vk-task').filter({ hasText: 'BMU 데이터 업로드 대기' }), '/bmu-data'));
    routeMatrix.push(await verifyClickRoute(browser, 'ledger-all', (page) => page.locator('.vk-grid--ledger > .vk-card').nth(1).getByRole('button', { name: /전체 보기/ }), '/audit-log'));
    routeMatrix.push(await verifyClickRoute(browser, 'topbar-bell', (page) => page.getByRole('button', { name: '감사 로그 열기' }), '/audit-log'));

    const selectorOutcome = await collectSelectorOutcome(browser);
    const unauthorizedOutcome = await collectUnauthorizedOutcome(browser);
    const shellControlOutcome = await collectShellControlOutcome(browser);

    const buttonEvidence = {
      generatedAt,
      tool: 'Playwright test with addInitScript fetch route mocks via Vite preview',
      baseUrl: BASE,
      routeMatrix,
      selectorOutcome,
      unauthorizedOutcome,
      shellControlOutcome,
      noApiDashboardInButtonRuns: routeMatrix.every((item) => item.callsAfterClick.every((call) => call.pathname !== '/api/dashboard'))
        && selectorOutcome.callsAfterSelection.every((call) => call.pathname !== '/api/dashboard')
        && unauthorizedOutcome.calls.every((call) => call.pathname !== '/api/dashboard'),
    };
    buttonEvidence.pass = routeMatrix.every((item) => item.pass)
      && selectorOutcome.pass
      && unauthorizedOutcome.pass
      && shellControlOutcome.pass
      && buttonEvidence.noApiDashboardInButtonRuns;
    writeEvidence('dashboard-button-routing.json', buttonEvidence);

    expect(happyEvidence.pass).toBe(true);
    expect(emptyErrorEvidence.pass).toBe(true);
    expect(buttonEvidence.pass).toBe(true);
  });
});
