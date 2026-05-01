const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.PW_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(REPO_ROOT, '.sisyphus/evidence/dashboard-reference-kpi-match');
const REFERENCE_SCREENSHOT = process.env.DASHBOARD_REFERENCE_SCREENSHOT
  || '/path/to/reference-screenshots/스크린샷 2026-04-26 192022.png';

const CURRENT_SCREENSHOT = path.join(EVIDENCE_DIR, 'task-4-dashboard-current.png');
const KPI_ROW_SCREENSHOT = path.join(EVIDENCE_DIR, 'task-4-dashboard-kpi-row.png');
const REFERENCE_COPY = path.join(EVIDENCE_DIR, 'task-4-reference-source.png');
const METRICS_PATH = path.join(EVIDENCE_DIR, 'task-4-reference-match-metrics.json');
const REGRESSION_GUARD_PATH = path.join(EVIDENCE_DIR, 'task-4-regression-guard.txt');
const EMPTY_STATE_METRICS_PATH = path.join(EVIDENCE_DIR, 'task-4-empty-state-metrics.json');

const TOTAL_TREND_MODE = 'daily-count';
const TOTAL_TREND_SOURCE = 'passports.createdAt';
const SNAPSHOT_TREND_MODE = 'snapshot-sparkline';
const SNAPSHOT_TREND_SOURCE = 'metric.snapshot';
const SNAPSHOT_RAIL_SELECTOR = [
  '.vk-kpi [data-kpi-snapshot-kind]',
  '.vk-kpi .vk-kpi__snapshot',
  '.vk-kpi .vk-kpi__snapshot-track',
  '.vk-kpi .vk-kpi__snapshot-fill',
].join(', ');

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function relativeEvidencePath(fileName) {
  return `.sisyphus/evidence/dashboard-reference-kpi-match/${fileName}`;
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/Auth(?:orization):\s*Bear(?:er)\s+[A-Za-z0-9._-]+/gi, 'authorization header [redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]')
    .replace(/((?:token|password|secret|authorization)["'\s:=]+)[^,"'\s}]+/gi, '$1[redacted]');
}

function apiPathname(url) {
  try {
    const parsed = new URL(url);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (/token|password|secret|auth/i.test(key)) {
        parsed.searchParams.set(key, '[redacted]');
      }
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch (error) {
    return sanitizeText(url).replace(/((?:token|password|secret|auth)=)[^&\s]+/gi, '$1[redacted]');
  }
}

function sanitizeLocation(location) {
  return {
    url: apiPathname(location.url || ''),
    lineNumber: location.lineNumber,
    columnNumber: location.columnNumber,
  };
}

function installRuntimeCollectors(page) {
  const runtime = {
    console: [],
    pageErrors: [],
    requestFailures: [],
    apiResponses: [],
  };

  page.on('console', (message) => {
    if (!['error', 'warning'].includes(message.type())) return;
    runtime.console.push({
      type: message.type(),
      text: sanitizeText(message.text()),
      location: sanitizeLocation(message.location()),
    });
  });

  page.on('pageerror', (error) => {
    runtime.pageErrors.push({
      name: error.name,
      message: sanitizeText(error.message),
    });
  });

  page.on('requestfailed', (request) => {
    runtime.requestFailures.push({
      url: apiPathname(request.url()),
      method: request.method(),
      failure: sanitizeText(request.failure()?.errorText || ''),
    });
  });

  page.on('response', (response) => {
    const pathname = apiPathname(response.url());
    if (!pathname.startsWith('/api/') || response.status() < 400) return;
    runtime.apiResponses.push({
      url: pathname,
      status: response.status(),
      statusText: sanitizeText(response.statusText()),
    });
  });

  return runtime;
}

function summarizeRuntime(runtime) {
  return {
    consoleErrorCount: runtime.console.filter((entry) => entry.type === 'error').length,
    consoleWarningCount: runtime.console.filter((entry) => entry.type === 'warning').length,
    pageErrorCount: runtime.pageErrors.length,
    requestFailureCount: runtime.requestFailures.length,
    apiErrorCount: runtime.apiResponses.length,
  };
}

async function loginForSeedToken(request) {
  const userId = process.env.DASHBOARD_SEED_USER_ID || 'dashboard-seed-test';
  const password = process.env.DASHBOARD_SEED_PASSWORD || '';
  const orgNum = process.env.DASHBOARD_SEED_ORG_NUM || '1';
  const response = await request.post(`${BASE}/api/auth/login`, {
    data: { userId, password, orgNum },
  });
  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`login returned non-JSON status ${response.status()}`);
  }

  if (!response.ok() || !payload.token) {
    const reason = payload.error ? `: ${sanitizeText(payload.error)}` : '';
    throw new Error(`DASHBOARD_SEED_TOKEN absent and /api/auth/login failed with status ${response.status()}${reason}`);
  }

  return {
    token: payload.token,
    userId: payload.userId || userId,
    org: payload.mspId || process.env.DASHBOARD_SEED_ORG || 'ManufacturerMSP',
    authSource: 'login',
  };
}

async function resolveSeedAuth(request) {
  if (process.env.DASHBOARD_SEED_TOKEN) {
    return {
      token: process.env.DASHBOARD_SEED_TOKEN,
      userId: process.env.DASHBOARD_SEED_USER_ID || 'dashboard-seed-test',
      org: process.env.DASHBOARD_SEED_ORG || process.env.DASHBOARD_SEED_ORG_MSP || 'ManufacturerMSP',
      authSource: 'env-token',
    };
  }

  return loginForSeedToken(request);
}

function writeAuthStorage({ token, userId, org }) {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_userId', userId);
    sessionStorage.setItem('auth_org', org);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_userId', userId);
    localStorage.setItem('auth_org', org);
    localStorage.setItem('bp_token', token);
    localStorage.setItem('bp_userId', userId);
    localStorage.setItem('bp_orgMsp', org);
}

async function seedBrowserSession(page, auth) {
  await page.context().addInitScript(writeAuthStorage, auth);
}

async function seedBrowserSessionOnOrigin(page, auth) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(writeAuthStorage, auth);
  await page.waitForFunction(() => (
    sessionStorage.getItem('auth_token')
    && sessionStorage.getItem('auth_userId')
    && sessionStorage.getItem('auth_org')
    && localStorage.getItem('auth_token')
    && localStorage.getItem('auth_userId')
    && localStorage.getItem('auth_org')
    && localStorage.getItem('bp_token')
    && localStorage.getItem('bp_userId')
    && localStorage.getItem('bp_orgMsp')
  ));
}

function fileInfo(filePath, fileName) {
  if (!fs.existsSync(filePath)) {
    return { path: relativeEvidencePath(fileName), exists: false, bytes: 0 };
  }

  const stat = fs.statSync(filePath);
  return { path: relativeEvidencePath(fileName), exists: stat.isFile(), bytes: stat.size };
}

function copyReferenceScreenshot() {
  const result = {
    configuredPath: REFERENCE_SCREENSHOT,
    evidencePath: relativeEvidencePath('task-4-reference-source.png'),
    exists: false,
    readable: false,
    copied: false,
    bytes: 0,
    error: '',
  };

  try {
    const stat = fs.statSync(REFERENCE_SCREENSHOT);
    result.exists = stat.isFile();
    result.bytes = stat.isFile() ? stat.size : 0;
    fs.accessSync(REFERENCE_SCREENSHOT, fs.constants.R_OK);
    result.readable = result.exists;
  } catch (error) {
    result.error = sanitizeText(error.message);
    return result;
  }

  if (!result.readable) return result;

  try {
    fs.copyFileSync(REFERENCE_SCREENSHOT, REFERENCE_COPY);
    result.copied = true;
  } catch (error) {
    result.error = sanitizeText(error.message);
    throw error;
  }

  return result;
}

function writeRegressionGuard() {
  fs.writeFileSync(REGRESSION_GUARD_PATH, [
    'Task 4 dashboard KPI regression guard',
    '- The real dashboard Playwright test asserts snapshotRailCount === 0.',
    `- snapshotRailCount is collected from: ${SNAPSHOT_RAIL_SELECTOR}`,
    '- Any restored gauge/progress rail inside a top KPI card would make the assertion fail.',
    '- The real dashboard validation does not mock /api/passports.',
    '',
  ].join('\n'));
}

async function collectKpiDomMetrics(page) {
  return page.evaluate((snapshotRailSelector) => {
    const round = (value) => Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
    const rectFor = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        left: round(rect.left),
      };
    };
    const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const cards = Array.from(document.querySelectorAll('.vk-kpi'));
    const trends = cards.map((card, index) => {
      const trend = card.querySelector('[data-kpi-trend-sparkline="true"]');
      const svg = trend?.querySelector('.vk-kpi__trend-svg') || null;
      return {
        index,
        label: text(card.querySelector('.vk-kpi__label')),
        value: text(card.querySelector('.vk-kpi__value')),
        kind: trend?.getAttribute('data-kpi-trend-kind') || '',
        mode: trend?.getAttribute('data-kpi-trend-mode') || '',
        source: trend?.getAttribute('data-kpi-trend-source') || '',
        pointCount: Number.parseInt(trend?.getAttribute('data-kpi-trend-points') || '0', 10),
        values: trend?.getAttribute('data-kpi-trend-values') || '',
        caption: trend?.getAttribute('data-kpi-trend-caption') || '',
        ariaLabel: trend?.getAttribute('aria-label') || '',
        cardBox: rectFor(card),
        sparklineBox: rectFor(trend),
        sparklineSvgBox: rectFor(svg),
      };
    });
    const totalTrend = trends.find((trend) => trend.kind === 'total') || null;
    const nonTotalTrends = trends.filter((trend) => trend.kind !== 'total');
    const widths = trends.map((trend) => trend.cardBox?.width || 0).filter((width) => width > 0);
    const heights = trends.map((trend) => trend.cardBox?.height || 0).filter((height) => height > 0);
    const scrollWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0
    );
    const clientWidth = document.documentElement.clientWidth;

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: {
        scrollWidth: round(scrollWidth),
        clientWidth: round(clientWidth),
        horizontalOverflow: scrollWidth > clientWidth + 1,
      },
      kpiCardCount: cards.length,
      kpiValueCount: document.querySelectorAll('.vk-kpi .vk-kpi__value').length,
      sparklineCount: document.querySelectorAll('.vk-kpi [data-kpi-trend-sparkline="true"]').length,
      sparklineSvgCount: document.querySelectorAll('.vk-kpi .vk-kpi__trend-svg').length,
      snapshotRailCount: document.querySelectorAll(snapshotRailSelector).length,
      legacySparkCount: document.querySelectorAll('.vk-kpi .vk-kpi__spark').length,
      totalTrendMode: totalTrend?.mode || '',
      totalTrendSource: totalTrend?.source || '',
      totalTrendValues: totalTrend?.values || '',
      totalTrendPointCount: totalTrend?.pointCount || 0,
      nonTotalTrendModes: nonTotalTrends.map((trend) => trend.mode),
      nonTotalTrendSources: nonTotalTrends.map((trend) => trend.source),
      nonTotalTrendKinds: nonTotalTrends.map((trend) => trend.kind),
      cardBoxes: trends.map((trend) => ({
        index: trend.index,
        label: trend.label,
        value: trend.value,
        box: trend.cardBox,
      })),
      sparklineBoxes: trends.map((trend) => ({
        index: trend.index,
        label: trend.label,
        kind: trend.kind,
        mode: trend.mode,
        source: trend.source,
        pointCount: trend.pointCount,
        caption: trend.caption,
        ariaLabel: trend.ariaLabel,
        box: trend.sparklineBox,
        svgBox: trend.sparklineSvgBox,
      })),
      layout: {
        minCardWidth: widths.length ? round(Math.min(...widths)) : 0,
        maxCardWidth: widths.length ? round(Math.max(...widths)) : 0,
        cardWidthSpread: widths.length ? round(Math.max(...widths) - Math.min(...widths)) : 0,
        minCardHeight: heights.length ? round(Math.min(...heights)) : 0,
        maxCardHeight: heights.length ? round(Math.max(...heights)) : 0,
      },
    };
  }, SNAPSHOT_RAIL_SELECTOR);
}

function judgeRealDashboardMetrics(domMetrics, runtime, reference) {
  const runtimeSummary = summarizeRuntime(runtime);
  const cardBoxes = domMetrics.cardBoxes.map((entry) => entry.box).filter(Boolean);
  const sparklineBoxes = domMetrics.sparklineBoxes.map((entry) => entry.box).filter(Boolean);
  const cardHeightPass = cardBoxes.every((box) => box.height >= 96 && box.height <= 128);
  const sparklineVisible = sparklineBoxes.length === 4
    && sparklineBoxes.every((box) => box.width > 0 && box.height > 0);
  const sparklinePlacementPass = domMetrics.sparklineBoxes.every((entry, index) => {
    const card = domMetrics.cardBoxes[index]?.box;
    const sparkline = entry.box;
    if (!card || !sparkline) return false;
    return sparkline.x >= card.x + card.width * 0.45
      && sparkline.y >= card.y + card.height * 0.42;
  });
  const domPass = domMetrics.kpiCardCount === 4
    && domMetrics.kpiValueCount === 4
    && domMetrics.sparklineCount === 4
    && domMetrics.sparklineSvgCount === 4
    && domMetrics.snapshotRailCount === 0
    && domMetrics.legacySparkCount === 0
    && domMetrics.totalTrendMode === TOTAL_TREND_MODE
    && domMetrics.totalTrendSource === TOTAL_TREND_SOURCE
    && domMetrics.nonTotalTrendModes.length === 3
    && domMetrics.nonTotalTrendModes.every((mode) => mode === SNAPSHOT_TREND_MODE)
    && domMetrics.nonTotalTrendSources.every((source) => source === SNAPSHOT_TREND_SOURCE);
  const layoutPass = cardHeightPass
    && domMetrics.layout.cardWidthSpread <= 3
    && sparklineVisible
    && sparklinePlacementPass
    && domMetrics.scroll.horizontalOverflow === false;
  const runtimePass = runtimeSummary.consoleErrorCount === 0
    && runtimeSummary.pageErrorCount === 0
    && runtimeSummary.requestFailureCount === 0
    && runtimeSummary.apiErrorCount === 0;

  return {
    runtimeSummary,
    visualVerdict: {
      domPass,
      layoutPass,
      runtimePass,
      referenceReadable: reference.readable,
      referenceCopied: reference.copied,
      cardHeightPass,
      sparklineVisible,
      sparklinePlacementPass,
      cardWidthSpreadPass: domMetrics.layout.cardWidthSpread <= 3,
      horizontalOverflowPass: domMetrics.scroll.horizontalOverflow === false,
      note: 'Reference image is copied for source comparison; pass/fail is based on DOM, layout boxes, and runtime health because crop and resolution may differ.',
    },
  };
}

async function collectRealDashboardMetrics(page, runtime, reference, authSource) {
  const domMetrics = await collectKpiDomMetrics(page);
  const verdict = judgeRealDashboardMetrics(domMetrics, runtime, reference);
  const metrics = {
    pass: false,
    generatedAt: new Date().toISOString(),
    tool: 'Playwright reference KPI match with real dashboard API',
    baseUrl: BASE,
    authSource,
    realApiValidation: true,
    routeMockedApiPassports: false,
    reference,
    screenshots: {
      dashboardCurrent: fileInfo(CURRENT_SCREENSHOT, 'task-4-dashboard-current.png'),
      dashboardKpiRow: fileInfo(KPI_ROW_SCREENSHOT, 'task-4-dashboard-kpi-row.png'),
      referenceSource: fileInfo(REFERENCE_COPY, 'task-4-reference-source.png'),
    },
    ...domMetrics,
    runtime: {
      ...verdict.runtimeSummary,
      details: runtime,
    },
    visualVerdict: verdict.visualVerdict,
  };
  metrics.domPass = metrics.visualVerdict.domPass;
  metrics.layoutPass = metrics.visualVerdict.layoutPass;
  metrics.runtimePass = metrics.visualVerdict.runtimePass;
  metrics.pass = metrics.domPass && metrics.layoutPass && metrics.runtimePass;
  return metrics;
}

async function installEmptyFixtureRoutes(page) {
  const calls = [];
  const jsonResponse = (payload, status = 200) => ({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const parsed = new URL(request.url());
    const call = {
      method: request.method(),
      url: apiPathname(request.url()),
      pathname: parsed.pathname,
      search: parsed.search,
      mock: '',
      status: 200,
    };
    calls.push(call);

    if (parsed.pathname === '/api/passports' && parsed.search === '') {
      call.mock = 'visual-only-empty-passports';
      await route.fulfill(jsonResponse({ records: [] }));
      return;
    }

    if (parsed.pathname === '/api/status' && parsed.search === '') {
      call.mock = 'visual-only-status';
      await route.fulfill(jsonResponse({ fabric: 'connected', channel: 'passportchannel', contract: 'passport-contract' }));
      return;
    }

    if (parsed.pathname === '/api/audit') {
      call.mock = 'visual-only-empty-audit';
      await route.fulfill(jsonResponse({ records: [] }));
      return;
    }

    if (parsed.pathname.startsWith('/api/bmu/records/')) {
      call.mock = 'visual-only-empty-bmu-records';
      await route.fulfill(jsonResponse({ records: [] }));
      return;
    }

    call.mock = 'visual-only-unhandled';
    call.status = 404;
    await route.fulfill(jsonResponse({ error: `Unhandled visual-only empty fixture path: ${parsed.pathname}${parsed.search}` }, 404));
  });

  return calls;
}

async function collectEmptyFixtureMetrics(page, runtime, routeCalls) {
  const domMetrics = await collectKpiDomMetrics(page);
  const runtimeSummary = summarizeRuntime(runtime);
  const routePolicy = {
    visualOnly: true,
    realApiValidation: false,
    routeMockedApiPassports: true,
    calls: routeCalls,
    unexpectedCalls: routeCalls.filter((call) => call.mock === 'visual-only-unhandled'),
  };
  const structurePass = domMetrics.kpiCardCount === 4
    && domMetrics.sparklineCount === 4
    && domMetrics.sparklineSvgCount === 4
    && domMetrics.snapshotRailCount === 0
    && domMetrics.scroll.horizontalOverflow === false;
  const runtimePass = runtimeSummary.consoleErrorCount === 0
    && runtimeSummary.pageErrorCount === 0
    && runtimeSummary.requestFailureCount === 0
    && runtimeSummary.apiErrorCount === 0;
  const routePass = routePolicy.unexpectedCalls.length === 0;

  return {
    pass: structurePass && runtimePass && routePass,
    generatedAt: new Date().toISOString(),
    tool: 'Playwright visual-only empty dashboard fixture',
    baseUrl: BASE,
    ...domMetrics,
    structurePass,
    runtimePass,
    routePass,
    runtime: {
      ...runtimeSummary,
      details: runtime,
    },
    routePolicy,
  };
}

test.describe.serial('Dashboard reference KPI match', () => {
  test.setTimeout(90000);

  test('matches reference KPI row with the real dashboard API', async ({ page, request }) => {
    ensureEvidenceDir();
    writeRegressionGuard();

    const auth = await resolveSeedAuth(request);
    const runtime = installRuntimeCollectors(page);
    await seedBrowserSession(page, auth);

    await page.setViewportSize({ width: 1690, height: 931 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.vk-dash')).toBeVisible();
    await expect(page.locator('.vk-kpi')).toHaveCount(4);
    await page.evaluate(() => document.fonts?.ready ?? true);
    await expect(page.locator('.vk-kpi [data-kpi-trend-sparkline="true"]')).toHaveCount(4);
    await expect(page.locator(SNAPSHOT_RAIL_SELECTOR)).toHaveCount(0);

    const kpiRow = page.locator('.vk-grid.vk-grid--4').first();
    await expect(kpiRow).toBeVisible();
    await page.screenshot({ path: CURRENT_SCREENSHOT, fullPage: true });
    await kpiRow.screenshot({ path: KPI_ROW_SCREENSHOT });
    const reference = copyReferenceScreenshot();

    const metrics = await collectRealDashboardMetrics(page, runtime, reference, auth.authSource);
    writeJson(METRICS_PATH, metrics);

    expect(metrics.kpiCardCount).toBe(4);
    expect(metrics.sparklineCount).toBe(4);
    expect(metrics.snapshotRailCount).toBe(0);
    expect(metrics.totalTrendMode).toBe(TOTAL_TREND_MODE);
    expect(metrics.totalTrendSource).toBe(TOTAL_TREND_SOURCE);
    expect(metrics.nonTotalTrendModes).toEqual([SNAPSHOT_TREND_MODE, SNAPSHOT_TREND_MODE, SNAPSHOT_TREND_MODE]);
    expect(metrics.nonTotalTrendSources).toEqual([SNAPSHOT_TREND_SOURCE, SNAPSHOT_TREND_SOURCE, SNAPSHOT_TREND_SOURCE]);
    expect(metrics.domPass).toBe(true);
    expect(metrics.layoutPass).toBe(true);
    expect(metrics.runtimePass).toBe(true);
    expect(metrics.pass).toBe(true);
  });

  test('visual-only empty fixture keeps KPI structure', async ({ page }) => {
    ensureEvidenceDir();
    const runtime = installRuntimeCollectors(page);
    const routeCalls = await installEmptyFixtureRoutes(page);
    const fixtureAuth = {
      token: 'fixture',
      userId: 'visual-empty-fixture',
      org: 'ManufacturerMSP',
    };
    await seedBrowserSession(page, fixtureAuth);

    await page.setViewportSize({ width: 390, height: 844 });
    await seedBrowserSessionOnOrigin(page, fixtureAuth);
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.vk-dash')).toBeVisible();
    await page.evaluate(() => document.fonts?.ready ?? true);
    await expect(page.locator('.vk-kpi')).toHaveCount(4);
    await expect(page.locator('.vk-kpi [data-kpi-trend-sparkline="true"]')).toHaveCount(4);
    await expect(page.locator(SNAPSHOT_RAIL_SELECTOR)).toHaveCount(0);

    const metrics = await collectEmptyFixtureMetrics(page, runtime, routeCalls);
    writeJson(EMPTY_STATE_METRICS_PATH, metrics);

    expect(metrics.kpiCardCount).toBe(4);
    expect(metrics.sparklineCount).toBe(4);
    expect(metrics.snapshotRailCount).toBe(0);
    expect(metrics.scroll.horizontalOverflow).toBe(false);
    expect(metrics.routePolicy.unexpectedCalls).toEqual([]);
    expect(metrics.pass).toBe(true);
  });
});
