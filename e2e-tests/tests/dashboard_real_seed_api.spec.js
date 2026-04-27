const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = (process.env.PW_BASE_URL || process.env.BMS_DEV_API_BASE || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(REPO_ROOT, '.sisyphus/evidence/dashboard-real-seed-data');
const METRICS_PATH = path.join(EVIDENCE_DIR, 'task-4-dashboard-real-api-metrics.json');
const SCREENSHOT_PATH = path.join(EVIDENCE_DIR, 'task-4-dashboard-real-api.png');

const EXPECTED_TOTAL_VALUE = '100';
const EXPECTED_TOTAL_TREND_MODE = 'daily-count';
const EXPECTED_TOTAL_TREND_SOURCE = 'passports.createdAt';
const EXPECTED_TOTAL_TREND_VALUES = '4,13,7,16,5,18,9,14,6,8';
const EXPECTED_TOTAL_TREND_POINTS = '10';

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function relativeEvidencePath(fileName) {
  return `.sisyphus/evidence/dashboard-real-seed-data/${fileName}`;
}

function apiPathname(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch (error) {
    return url;
  }
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
      text: message.text(),
      location: message.location(),
    });
  });

  page.on('pageerror', (error) => {
    runtime.pageErrors.push({ message: error.message, stack: error.stack });
  });

  page.on('requestfailed', (request) => {
    runtime.requestFailures.push({
      url: apiPathname(request.url()),
      method: request.method(),
      failure: request.failure(),
    });
  });

  page.on('response', (response) => {
    const url = response.url();
    if (!apiPathname(url).startsWith('/api/')) return;
    runtime.apiResponses.push({
      url: apiPathname(url),
      status: response.status(),
      seedHeader: response.headers()['x-bms-dev-seed'] || '',
    });
  });

  return runtime;
}

async function loginForSeedToken(request) {
  const userId = process.env.DASHBOARD_SEED_USER_ID
    || process.env.BMS_DEV_USER_ID
    || process.env.E2E_ADMIN_USER
    || 'admin';
  const password = process.env.DASHBOARD_SEED_PASSWORD
    || process.env.BMS_DEV_PASSWORD
    || process.env.E2E_ADMIN_PASSWORD
    || process.env.FABRIC_ADMIN_SECRET
    || '';
  const orgNum = process.env.DASHBOARD_SEED_ORG_NUM
    || process.env.BMS_DEV_ORG_NUM
    || process.env.E2E_ADMIN_ORG_NUM
    || '1';
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
    const reason = payload.error ? `: ${payload.error}` : '';
    throw new Error(`DASHBOARD_SEED_TOKEN absent and /api/auth/login failed with status ${response.status()}${reason}`);
  }

  return {
    token: payload.token,
    userId: payload.userId || userId,
    org: payload.mspId || process.env.DASHBOARD_SEED_ORG_MSP || process.env.BMS_DEV_ORG_MSP || process.env.DASHBOARD_SEED_ORG || 'ManufacturerMSP',
    authSource: 'login',
  };
}

async function resolveSeedAuth(request) {
  const token = process.env.DASHBOARD_SEED_TOKEN || process.env.BMS_DEV_TOKEN;
  if (token) {
    return {
      token,
      userId: process.env.DASHBOARD_SEED_USER_ID || process.env.BMS_DEV_USER_ID || process.env.E2E_ADMIN_USER || 'admin',
      org: process.env.DASHBOARD_SEED_ORG_MSP || process.env.BMS_DEV_ORG_MSP || process.env.DASHBOARD_SEED_ORG || 'ManufacturerMSP',
      authSource: 'env-token',
    };
  }

  return loginForSeedToken(request);
}

async function seedBrowserSession(page, auth) {
  await page.addInitScript(({ token, userId, org }) => {
    sessionStorage.setItem('auth_token', token);
    sessionStorage.setItem('auth_userId', userId);
    sessionStorage.setItem('auth_org', org);
    localStorage.setItem('bp_token', token);
    localStorage.setItem('bp_userId', userId);
    localStorage.setItem('bp_orgMsp', org);
  }, auth);
}

async function collectDashboardMetrics(page, runtime, authSource) {
  const totalTrend = page.locator(
    `[data-kpi-trend-kind="total"][data-kpi-trend-source="${EXPECTED_TOTAL_TREND_SOURCE}"]`
  );
  const totalKpi = page.locator('.vk-kpi').filter({
    has: page.locator(`[data-kpi-trend-kind="total"][data-kpi-trend-source="${EXPECTED_TOTAL_TREND_SOURCE}"]`),
  });
  const [trendAttributes, totalSnapshotCount, pageTotalSnapshotCount, totalValue, kpiValues] = await Promise.all([
    totalTrend.first().evaluate((element) => ({
      totalTrendMode: element.getAttribute('data-kpi-trend-mode') || '',
      totalTrendSource: element.getAttribute('data-kpi-trend-source') || '',
      totalTrendValues: element.getAttribute('data-kpi-trend-values') || '',
      totalTrendPoints: element.getAttribute('data-kpi-trend-points') || '',
      totalTrendCaption: element.getAttribute('data-kpi-trend-caption') || '',
      ariaLabel: element.getAttribute('aria-label') || '',
    })),
    totalKpi.locator('[data-kpi-snapshot-kind="total"]').count(),
    page.locator('[data-kpi-snapshot-kind="total"]').count(),
    totalKpi.locator('.vk-kpi__value').innerText(),
    page.locator('.vk-kpi__value').allInnerTexts(),
  ]);
  const consoleErrors = runtime.console.filter((entry) => entry.type === 'error');
  const auxiliaryApiErrors = runtime.apiResponses.filter((entry) => entry.status >= 400);

  const metrics = {
    pass: false,
    generatedAt: new Date().toISOString(),
    tool: 'Playwright real HTTP API dashboard verification',
    baseUrl: BASE,
    authSource,
    totalValue: totalValue.trim(),
    kpiValues: kpiValues.map((value) => value.trim()),
    totalSnapshotRendered: totalSnapshotCount > 0,
    totalSnapshotCount,
    pageTotalSnapshotCount,
    screenshot: relativeEvidencePath('task-4-dashboard-real-api.png'),
    runtimeSummary: {
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: runtime.pageErrors.length,
      requestFailureCount: runtime.requestFailures.length,
      auxiliaryApiErrorCount: auxiliaryApiErrors.length,
    },
    runtime,
    ...trendAttributes,
  };

  metrics.pass = metrics.totalTrendMode === EXPECTED_TOTAL_TREND_MODE
    && metrics.totalTrendSource === EXPECTED_TOTAL_TREND_SOURCE
    && metrics.totalTrendValues === EXPECTED_TOTAL_TREND_VALUES
    && metrics.totalTrendPoints === EXPECTED_TOTAL_TREND_POINTS
    && metrics.totalSnapshotRendered === false
    && metrics.pageTotalSnapshotCount === 0
    && metrics.totalValue === EXPECTED_TOTAL_VALUE
    && metrics.runtimeSummary.consoleErrorCount === 0
    && metrics.runtimeSummary.pageErrorCount === 0
    && metrics.runtimeSummary.requestFailureCount === 0
    && metrics.runtimeSummary.auxiliaryApiErrorCount === 0;

  return metrics;
}

test.describe('Dashboard real seed API metrics', () => {
  test.setTimeout(60000);

  test('renders seeded dashboard KPI trend from the real API', async ({ page, request }) => {
    ensureEvidenceDir();
    const auth = await resolveSeedAuth(request);
    const runtime = installRuntimeCollectors(page);
    await seedBrowserSession(page, auth);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.vk-dash')).toBeVisible();
    await expect(page.locator('.vk-kpi')).toHaveCount(4);

    const totalTrend = page.locator(
      `[data-kpi-trend-kind="total"][data-kpi-trend-source="${EXPECTED_TOTAL_TREND_SOURCE}"]`
    );
    await expect(totalTrend).toHaveCount(1);
    await expect(totalTrend).toHaveAttribute('data-kpi-trend-mode', EXPECTED_TOTAL_TREND_MODE);
    await expect(totalTrend).toHaveAttribute('data-kpi-trend-values', EXPECTED_TOTAL_TREND_VALUES);
    await expect(totalTrend).toHaveAttribute('data-kpi-trend-points', EXPECTED_TOTAL_TREND_POINTS);

    const totalKpi = page.locator('.vk-kpi').filter({ has: totalTrend });
    await expect(totalKpi).toHaveCount(1);
    await expect(totalKpi.locator('.vk-kpi__value')).toHaveText(EXPECTED_TOTAL_VALUE);
    await expect(totalKpi.locator('[data-kpi-snapshot-kind="total"]')).toHaveCount(0);
    await expect(page.locator('[data-kpi-snapshot-kind="total"]')).toHaveCount(0);

    await page.evaluate(() => document.fonts?.ready ?? true);
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });

    const metrics = await collectDashboardMetrics(page, runtime, auth.authSource);
    fs.writeFileSync(METRICS_PATH, `${JSON.stringify(metrics, null, 2)}\n`);

    expect(metrics.pass).toBe(true);
  });
});
