const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PW_BASE_URL || 'http://127.0.0.1:4177';
const REPO_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(REPO_ROOT, '.sisyphus/evidence/dashboard-visual-polish');

const AUTH_SEED = {
  token: 'qa-dashboard-polish-token',
  userId: 'qa-dashboard-polish',
  org: 'ManufacturerMSP',
};

const SCREENSHOTS = {
  wide: 'dashboard-1920x1080.png',
  laptop: 'dashboard-1366x768.png',
  emptyAudit: 'dashboard-empty-audit.png',
};

const VIEWPORTS = [
  { key: '1920x1080', width: 1920, height: 1080, screenshot: SCREENSHOTS.wide },
  { key: '1366x768', width: 1366, height: 768, screenshot: SCREENSHOTS.laptop },
];

const EXPECTED_POPULATED_KPI_VALUES = ['100', '0', '200', '0'];
const EXPECTED_TOTAL_TREND_SOURCE = 'passports.createdAt';
const EXPECTED_TOTAL_TREND_MODE = 'daily-count';
const EXPECTED_DAILY_TREND_VALUES = [4, 13, 7, 16, 5, 18, 9, 14, 6, 8];
const FORBIDDEN_CUMULATIVE_TREND_VALUES = [4, 17, 24, 40, 45, 63, 72, 86, 92, 100];
const POLISH_CREATED_AT_BUCKETS = [
  { date: '2026-04-10', count: 4 },
  { date: '2026-04-11', count: 13 },
  { date: '2026-04-12', count: 7 },
  { date: '2026-04-13', count: 16 },
  { date: '2026-04-14', count: 5 },
  { date: '2026-04-15', count: 18 },
  { date: '2026-04-16', count: 9 },
  { date: '2026-04-17', count: 14 },
  { date: '2026-04-18', count: 6 },
  { date: '2026-04-19', count: 8 },
];
const EXPECTED_CREATED_AT_BUCKET_COUNTS = Object.fromEntries(
  POLISH_CREATED_AT_BUCKETS.map(({ date, count }) => [date, count])
);
const EXPECTED_POPULATED_SNAPSHOT_FILLS = {
  normal: 0,
  alerts: 2 / 3,
  verified: 0,
};
const EXPECTED_POPULATED_SNAPSHOT_VALUES = {
  normal: '0',
  alerts: '200',
  verified: '0',
};
const EXPECTED_NO_DATA_CAPTIONS = {
  total: '등록 데이터 없음',
  normal: '등록 데이터 없음',
  alerts: '경보 없음',
  verified: '등록 데이터 없음',
};
const SNAPSHOT_FILL_EPSILON = 0.0001;

const POLISH_PASSPORTS = POLISH_CREATED_AT_BUCKETS.reduce((passports, bucket) => {
  const startIndex = passports.length;
  const bucketPassports = Array.from({ length: bucket.count }, (_, offset) => {
    const index = startIndex + offset;
    const ordinal = String(index + 1).padStart(3, '0');
    return {
      passportId: `POLISH-P-${ordinal}`,
      batteryId: `POLISH-BMU-${ordinal}`,
      model: index % 2 === 0 ? 'NCM QA Pack' : 'LFP QA Pack',
      serialNumber: `POLISH-SN-${ordinal}`,
      status: 'ACTIVE',
      vin: '',
      currentSoc: 48 + (index % 45),
      currentSoh: 72 + (index % 8),
      totalDischargeCycles: 40 + index,
      regulatoryVerificationStatus: 'PENDING',
      physicalHistoryVerification: { status: 'PENDING' },
      createdAt: `${bucket.date}T08:00:00.000Z`,
      updatedAt: `2026-04-${String(20 + (index % 7)).padStart(2, '0')}T09:30:00.000Z`,
    };
  });

  return passports.concat(bucketPassports);
}, []);

const POLISH_AUDIT_RECORDS = [
  { id: 'polish-audit-001', action: 'CreatePassport', timestamp: '2026-04-19T08:00:00.000Z', userId: 'issuer-1', orgMsp: 'ManufacturerMSP', block: '9101', statusCode: 200, success: true, targetId: 'POLISH-P-001' },
  { id: 'polish-audit-002', action: 'BindVin', timestamp: '2026-04-20T08:20:00.000Z', userId: 'ev-ops', orgMsp: 'EVManufacturerMSP', block: '9102', statusCode: 201, success: true, targetId: 'POLISH-P-002' },
  { id: 'polish-audit-003', action: 'UpdateVerification', timestamp: '2026-04-20T10:10:00.000Z', userId: 'regulator-1', orgMsp: 'RegulatorMSP', block: '9103', statusCode: 200, success: true, targetId: 'POLISH-P-003' },
  { id: 'polish-audit-004', action: 'RecordBMUData', timestamp: '2026-04-22T13:00:00.000Z', userId: 'bmu-agent', orgMsp: 'ManufacturerMSP', block: '9104', statusCode: 200, success: true, targetId: 'POLISH-P-004' },
  { id: 'polish-audit-005', action: 'MaterialUpdate', timestamp: '2026-04-23T08:00:00.000Z', userId: 'issuer-2', orgMsp: 'ManufacturerMSP', block: '9105', statusCode: 204, success: true, targetId: 'POLISH-P-005' },
  { id: 'polish-audit-006', action: 'AuditRead', timestamp: '2026-04-23T11:45:00.000Z', userId: 'auditor-1', orgMsp: 'RegulatorMSP', block: '9106', statusCode: 200, success: true, targetId: 'POLISH-P-006' },
  { id: 'polish-audit-007', action: 'LifecycleReview', timestamp: '2026-04-23T15:30:00.000Z', userId: 'regulator-2', orgMsp: 'RegulatorMSP', block: '9107', statusCode: 200, success: true, targetId: 'POLISH-P-007' },
];

function ensureEvidenceDir() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function relativeEvidencePath(fileName) {
  return `.sisyphus/evidence/dashboard-visual-polish/${fileName}`;
}

function bmuRecordsFor(passportId) {
  return [
    {
      recordId: `${passportId}-bmu-old`,
      timestamp: '2026-04-24T08:00:00.000Z',
      soc: 68000,
      voltage: 399.2,
      current: 8.4,
      temperature: 30600,
      dischargeCycles: 87,
      statusFlags: 0,
    },
    {
      recordId: `${passportId}-bmu-latest`,
      timestamp: '2026-04-25T08:30:00.000Z',
      soc: 72000,
      voltage: 402.7,
      current: 9.1,
      temperature: 31200,
      dischargeCycles: 88,
      statusFlags: 1,
    },
  ];
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

async function seedMockedDashboard(page, { passports = POLISH_PASSPORTS, auditRecords }) {
  await page.addInitScript(({ auth, passports, audits }) => {
    sessionStorage.setItem('auth_token', auth.token);
    sessionStorage.setItem('auth_userId', auth.userId);
    sessionStorage.setItem('auth_org', auth.org);
    localStorage.setItem('auth_token', auth.token);
    localStorage.setItem('auth_userId', auth.userId);
    localStorage.setItem('auth_org', auth.org);
    localStorage.setItem('bp_token', auth.token);
    localStorage.setItem('bp_userId', auth.userId);
    localStorage.setItem('bp_orgMsp', auth.org);

    window.__dashboardVisualPolishCalls = [];
    window.__dashboardVisualPolishUnhandledCalls = [];

    const originalFetch = window.fetch.bind(window);
    const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
    const bmuRecordsForPassport = (passportId) => [
      {
        recordId: `${passportId}-bmu-old`,
        timestamp: '2026-04-24T08:00:00.000Z',
        soc: 68000,
        voltage: 399.2,
        current: 8.4,
        temperature: 30600,
        dischargeCycles: 87,
        statusFlags: 0,
      },
      {
        recordId: `${passportId}-bmu-latest`,
        timestamp: '2026-04-25T08:30:00.000Z',
        soc: 72000,
        voltage: 402.7,
        current: 9.1,
        temperature: 31200,
        dischargeCycles: 88,
        statusFlags: 1,
      },
    ];

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
      window.__dashboardVisualPolishCalls.push(call);

      if (url.pathname === '/api/passports' && url.search === '') {
        call.mock = 'passports';
        call.status = 200;
        return jsonResponse({ records: passports });
      }

      if (url.pathname === '/api/status' && url.search === '') {
        call.mock = 'status';
        call.status = 200;
        return jsonResponse({ fabric: 'connected', channel: 'passportchannel', contract: 'passport-contract' });
      }

      if (url.pathname.startsWith('/api/bmu/records/') && url.search === '') {
        const passportId = decodeURIComponent(url.pathname.slice('/api/bmu/records/'.length));
        call.mock = 'bmu-records';
        call.passportId = passportId;
        call.status = 200;
        return jsonResponse({ records: bmuRecordsForPassport(passportId) });
      }

      if (url.pathname === '/api/audit' && url.search === '?page=1&limit=5&writeOnly=false') {
        call.mock = 'dashboard-audit';
        call.status = 200;
        return jsonResponse({ records: audits });
      }

      call.mock = 'unhandled';
      call.status = 404;
      window.__dashboardVisualPolishUnhandledCalls.push(call);
      return jsonResponse({ error: `Unhandled mock path: ${url.pathname}${url.search}` }, 404);
    };
  }, { auth: AUTH_SEED, passports, audits: auditRecords });
}

async function openDashboard(browser, { viewport, passports = POLISH_PASSPORTS, auditRecords }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const runtime = installRuntimeCollectors(page);
  await seedMockedDashboard(page, { passports, auditRecords });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.vk-dash')).toBeVisible();
  await page.evaluate(() => document.fonts?.ready ?? true);
  return { context, page, runtime };
}

async function waitForDashboard(page) {
  await page.waitForURL(/passportId=POLISH-P-001/);
  await page.waitForFunction(() => {
    const calls = window.__dashboardVisualPolishCalls || [];
    return calls.some((call) => call.url === '/api/passports')
      && calls.some((call) => call.url === '/api/status')
      && calls.some((call) => call.url === '/api/bmu/records/POLISH-P-001')
      && calls.some((call) => call.url === '/api/audit?page=1&limit=5&writeOnly=false')
      && document.querySelector('.vk-dash')?.getAttribute('data-selected-passport-id') === 'POLISH-P-001';
  });
  await expect(page.locator('.vk-task__num')).toHaveText(['100', '100', '0', '0']);
}

async function waitForNoDataDashboard(page) {
  await expect(page.getByText('표시할 알림이 없습니다')).toBeVisible();
  await expect(page.getByText('대기 중인 작업이 없습니다')).toBeVisible();
  await expect(page.getByText('원장 로그가 없습니다')).toBeVisible();
  await page.waitForFunction(() => {
    const calls = window.__dashboardVisualPolishCalls || [];
    return calls.some((call) => call.url === '/api/passports')
      && calls.some((call) => call.url === '/api/status')
      && calls.some((call) => call.url === '/api/audit?page=1&limit=5&writeOnly=false')
      && document.querySelector('.vk-dash')?.getAttribute('data-selected-passport-id') === null;
  });
}

async function getCalls(page) {
  return page.evaluate(() => window.__dashboardVisualPolishCalls || []);
}

async function getUnhandledCalls(page) {
  return page.evaluate(() => window.__dashboardVisualPolishUnhandledCalls || []);
}

function isAllowedEndpoint(call) {
  if (call.url === '/api/passports') return true;
  if (call.url === '/api/status') return true;
  if (call.pathname?.startsWith('/api/bmu/records/') && call.search === '') return true;
  return call.url === '/api/audit?page=1&limit=5&writeOnly=false';
}

function closeEnough(actual, expected) {
  return Math.abs(actual - expected) <= SNAPSHOT_FILL_EPSILON;
}

function createdAtUtcDateBuckets(passports) {
  return Array.from(new Set(passports.map((passport) => {
    const timestamp = new Date(passport.createdAt);
    return Number.isNaN(timestamp.getTime()) ? '' : timestamp.toISOString().slice(0, 10);
  }).filter(Boolean))).sort();
}

function createdAtUtcDateBucketCounts(passports) {
  return passports.reduce((counts, passport) => {
    const timestamp = new Date(passport.createdAt);
    if (Number.isNaN(timestamp.getTime())) return counts;

    const date = timestamp.toISOString().slice(0, 10);
    return {
      ...counts,
      [date]: (counts[date] || 0) + 1,
    };
  }, {});
}

function arraysEqual(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function hasExpectedDailyTotalTrend(kpiVisualSummary, expectedPointCount) {
  return kpiVisualSummary.totalTrendSource === EXPECTED_TOTAL_TREND_SOURCE
    && kpiVisualSummary.totalTrendPoints === expectedPointCount
    && kpiVisualSummary.totalTrendMode === EXPECTED_TOTAL_TREND_MODE
    && arraysEqual(kpiVisualSummary.totalTrendValues, EXPECTED_DAILY_TREND_VALUES)
    && !arraysEqual(kpiVisualSummary.totalTrendValues, FORBIDDEN_CUMULATIVE_TREND_VALUES)
    && kpiVisualSummary.totalTrendDirectionChanges >= 4;
}

function assertBoundedKpiSnapshots(kpiSnapshots) {
  for (const snapshot of kpiSnapshots) {
    expect(snapshot.rawFill).not.toMatch(/NaN|Infinity/);
    expect(Number.isFinite(snapshot.fill)).toBe(true);
    expect(snapshot.fill).toBeGreaterThanOrEqual(0);
    expect(snapshot.fill).toBeLessThanOrEqual(1);
  }
}

function kpiSnapshotsByKind(kpiSnapshots) {
  return Object.fromEntries(kpiSnapshots.map((snapshot) => [snapshot.kind, snapshot]));
}

function assertPopulatedKpiSnapshots(kpiSnapshots) {
  expect(kpiSnapshots).toHaveLength(3);
  assertBoundedKpiSnapshots(kpiSnapshots);

  const byKind = kpiSnapshotsByKind(kpiSnapshots);
  expect(Object.keys(byKind).sort()).toEqual(Object.keys(EXPECTED_POPULATED_SNAPSHOT_FILLS).sort());

  for (const [kind, expectedValue] of Object.entries(EXPECTED_POPULATED_SNAPSHOT_VALUES)) {
    expect(byKind[kind]).toBeTruthy();
    expect(byKind[kind].value).toBe(expectedValue);
  }

  for (const [kind, expectedFill] of Object.entries(EXPECTED_POPULATED_SNAPSHOT_FILLS)) {
    expect(byKind[kind]).toBeTruthy();
    expect(byKind[kind].fill).toBeCloseTo(expectedFill, 4);
  }

  const distinctFills = new Set(kpiSnapshots.map((snapshot) => snapshot.fill.toFixed(4)));
  expect(distinctFills.size).toBeGreaterThanOrEqual(2);
}

function assertPopulatedKpiTrends(kpiTrends, expectedPointCount) {
  expect(kpiTrends).toHaveLength(1);

  const [totalTrend] = kpiTrends;
  expect(totalTrend.kind).toBe('total');
  expect(totalTrend.value).toBe('100');
  expect(totalTrend.source).toBe(EXPECTED_TOTAL_TREND_SOURCE);
  expect(totalTrend.mode).toBe(EXPECTED_TOTAL_TREND_MODE);
  expect(totalTrend.rawPointCount).toMatch(/^\d+$/);
  expect(totalTrend.pointCount).toBe(expectedPointCount);
  expect(totalTrend.pointCount).toBeGreaterThanOrEqual(2);
  expect(totalTrend.rawValues).toBe(EXPECTED_DAILY_TREND_VALUES.join(','));
  expect(totalTrend.values).toEqual(EXPECTED_DAILY_TREND_VALUES);
  expect(totalTrend.values).not.toEqual(FORBIDDEN_CUMULATIVE_TREND_VALUES);
  expect(totalTrend.values.reduce((total, value) => total + value, 0)).toBe(100);
  expect(totalTrend.directionChanges).toBeGreaterThanOrEqual(4);
  expect(totalTrend.caption).toBeTruthy();
  expect(totalTrend.ariaLabel).toContain('총 등록 배터리');
  expect(Number.isFinite(totalTrend.rect.width)).toBe(true);
  expect(Number.isFinite(totalTrend.rect.height)).toBe(true);
  expect(totalTrend.rect.width).toBeGreaterThan(0);
  expect(totalTrend.rect.height).toBeGreaterThan(0);
}

function assertNoDataKpiSnapshots(kpiSnapshots) {
  expect(kpiSnapshots).toHaveLength(4);
  assertBoundedKpiSnapshots(kpiSnapshots);
  expect(kpiSnapshots.map((snapshot) => snapshot.value)).toEqual(['0', '0', '0', '0']);

  const byKind = kpiSnapshotsByKind(kpiSnapshots);
  for (const [kind, expectedCaption] of Object.entries(EXPECTED_NO_DATA_CAPTIONS)) {
    expect(byKind[kind]).toBeTruthy();
    expect(byKind[kind].caption).toBe(expectedCaption);
  }
}

function assertNoDataKpiTrends(kpiTrends) {
  expect(kpiTrends).toHaveLength(0);
}

async function collectKpiTrendMetrics(page) {
  return page.locator('.vk-kpi').evaluateAll((cards) => {
    const parseTrendValues = (trend) => {
      const rawValues = trend.getAttribute('data-kpi-trend-values');
      if (rawValues === null) {
        throw new Error('Missing data-kpi-trend-values attribute');
      }

      const tokens = rawValues.split(',');
      if (tokens.length === 0) {
        throw new Error('Empty data-kpi-trend-values attribute');
      }

      const values = tokens.map((token) => {
        const normalized = token.trim();
        if (normalized === '') {
          throw new Error(`Empty token in data-kpi-trend-values: ${rawValues}`);
        }

        const value = Number(normalized);
        if (!Number.isFinite(value)) {
          throw new Error(`Non-finite token in data-kpi-trend-values: ${normalized}`);
        }
        if (!Number.isInteger(value)) {
          throw new Error(`Non-integer token in data-kpi-trend-values: ${normalized}`);
        }

        return value;
      });

      return { rawValues, values };
    };

    const countDirectionChanges = (values) => {
      let directionChanges = 0;
      let previousDirection = 0;

      for (let index = 1; index < values.length; index += 1) {
        const direction = Math.sign(values[index] - values[index - 1]);
        if (direction === 0) continue;

        if (previousDirection !== 0 && direction !== previousDirection) {
          directionChanges += 1;
        }
        previousDirection = direction;
      }

      return directionChanges;
    };

    return cards.flatMap((card, index) => {
      const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const trend = card.querySelector('[data-kpi-trend-sparkline]');
      if (!trend) return [];

      const rawPointCount = trend.getAttribute('data-kpi-trend-points') || '';
      const { rawValues, values } = parseTrendValues(trend);
      const rect = trend.getBoundingClientRect();
      const svg = trend.querySelector('svg');
      const svgRect = svg?.getBoundingClientRect();

      return [{
        index,
        label: text(card.querySelector('.vk-kpi__label')),
        value: text(card.querySelector('.vk-kpi__value')),
        kind: trend.getAttribute('data-kpi-trend-kind') || '',
        source: trend.getAttribute('data-kpi-trend-source') || '',
        mode: trend.getAttribute('data-kpi-trend-mode') || '',
        rawPointCount,
        pointCount: Number.parseInt(rawPointCount, 10),
        rawValues,
        values,
        directionChanges: countDirectionChanges(values),
        caption: trend.getAttribute('data-kpi-trend-caption') || '',
        ariaLabel: trend.getAttribute('aria-label') || '',
        pathCount: trend.querySelectorAll('svg path').length,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        svgRect: svgRect ? {
          x: svgRect.x,
          y: svgRect.y,
          width: svgRect.width,
          height: svgRect.height,
        } : null,
      }];
    });
  });
}

async function collectKpiSnapshotMetrics(page) {
  return page.locator('.vk-kpi').evaluateAll((cards) => cards.flatMap((card, index) => {
    const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const snapshot = card.querySelector('[data-kpi-snapshot-kind]');
    if (!snapshot) return [];

    const rawFill = snapshot?.getAttribute('data-kpi-snapshot-fill') || '';
    const fill = Number.parseFloat(rawFill);
    const rect = snapshot.getBoundingClientRect();

    return [{
      index,
      label: text(card.querySelector('.vk-kpi__label')),
      value: text(card.querySelector('.vk-kpi__value')),
      kind: snapshot?.getAttribute('data-kpi-snapshot-kind') || '',
      rawFill,
      fill,
      caption: snapshot?.getAttribute('data-kpi-snapshot-caption') || '',
      valueLabel: text(card.querySelector('.vk-kpi__snapshot-value')),
      ariaLabel: snapshot?.getAttribute('aria-label') || '',
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    }];
  }));
}

function summarizeKpiSnapshots(kpiSnapshots) {
  return {
    count: kpiSnapshots.length,
    bounded: kpiSnapshots.every((snapshot) => Number.isFinite(snapshot.fill) && snapshot.fill >= 0 && snapshot.fill <= 1),
    hasInvalidFillText: kpiSnapshots.some((snapshot) => /NaN|Infinity/.test(snapshot.rawFill)),
    distinctFillCount: new Set(kpiSnapshots.map((snapshot) => snapshot.fill.toFixed(4))).size,
    expectedPopulatedFallbackFills: Object.entries(EXPECTED_POPULATED_SNAPSHOT_FILLS).every(([kind, expectedFill]) => {
      const snapshot = kpiSnapshots.find((item) => item.kind === kind);
      return snapshot ? closeEnough(snapshot.fill, expectedFill) : false;
    }),
  };
}

function summarizeKpiVisuals(kpiTrends, kpiSnapshots, legacySparkCount) {
  const totalTrend = kpiTrends.find((trend) => trend.kind === 'total');

  return {
    trendCount: kpiTrends.length,
    snapshotCount: kpiSnapshots.length,
    legacySparkCount,
    totalTrendSource: totalTrend?.source || '',
    totalTrendPoints: totalTrend?.pointCount || 0,
    totalTrendMode: totalTrend?.mode || '',
    totalTrendValues: totalTrend?.values || [],
    totalTrendDirectionChanges: totalTrend?.directionChanges || 0,
    trendKinds: kpiTrends.map((trend) => trend.kind),
    snapshotKinds: kpiSnapshots.map((snapshot) => snapshot.kind),
    snapshotFills: Object.fromEntries(kpiSnapshots.map((snapshot) => [snapshot.kind, snapshot.fill])),
    snapshotBounded: kpiSnapshots.every((snapshot) => Number.isFinite(snapshot.fill) && snapshot.fill >= 0 && snapshot.fill <= 1),
  };
}

async function collectKpiVisuals(page) {
  const kpiLegacySparkCount = await page.locator('.vk-kpi__spark').count();
  expect(kpiLegacySparkCount).toBe(0);

  const kpiTrends = await collectKpiTrendMetrics(page);
  const kpiSnapshots = await collectKpiSnapshotMetrics(page);
  const kpiSnapshotSummary = summarizeKpiSnapshots(kpiSnapshots);
  const kpiVisualSummary = summarizeKpiVisuals(kpiTrends, kpiSnapshots, kpiLegacySparkCount);

  return {
    kpiTrendCount: kpiTrends.length,
    kpiTrends,
    kpiSnapshotCount: kpiSnapshots.length,
    kpiSnapshots,
    kpiSnapshotSummary,
    kpiVisualSummary,
    kpiLegacySparkCount,
  };
}

async function collectVisualMetrics(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate(() => document.fonts?.ready ?? true);
  await page.waitForTimeout(150);

  const alertIcon = page.locator('.vk-alerts__row:first-of-type .vk-alerts__icon');
  const alertMessage = page.locator('.vk-alerts__row:first-of-type .vk-alerts__msg');
  await expect(alertIcon).toBeVisible();
  await expect(alertMessage).toBeVisible();

  const iconRect = await alertIcon.boundingBox();
  const messageRect = await alertMessage.boundingBox();
  expect(iconRect).not.toBeNull();
  expect(messageRect).not.toBeNull();
  const alertGapPx = messageRect.x - (iconRect.x + iconRect.width);
  expect(alertGapPx).toBeGreaterThanOrEqual(8);

  const taskNumberFontPx = await page.locator('.vk-task').evaluateAll((tasks) => tasks.map((task, index) => {
    const number = task.querySelector('.vk-task__num');
    const label = task.querySelector('.vk-task__label')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const value = number?.textContent?.trim() || '';
    const fontSize = number ? Number.parseFloat(window.getComputedStyle(number).fontSize) : 0;
    return { index, label, value, fontSizePx: fontSize };
  }));
  for (const item of taskNumberFontPx) {
    expect(item.fontSizePx).toBeLessThanOrEqual(28);
  }

  const taskOverflow = await page.locator('.vk-task').evaluateAll((tasks) => tasks.map((task, index) => ({
    index,
    label: task.querySelector('.vk-task__label')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    scrollWidth: task.scrollWidth,
    clientWidth: task.clientWidth,
    overflow: task.scrollWidth > task.clientWidth,
  })));
  for (const item of taskOverflow) {
    expect(item.overflow).toBe(false);
  }

  const kpiVisuals = await collectKpiVisuals(page);
  assertPopulatedKpiTrends(kpiVisuals.kpiTrends, createdAtUtcDateBuckets(POLISH_PASSPORTS).length);
  assertPopulatedKpiSnapshots(kpiVisuals.kpiSnapshots);

  const screenshotPath = path.join(EVIDENCE_DIR, viewport.screenshot);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  return {
    viewport: { width: viewport.width, height: viewport.height },
    alertGapPx,
    alertIconRect: iconRect,
    alertMessageRect: messageRect,
    taskNumberFontPx,
    taskOverflow,
    ...kpiVisuals,
    screenshot: relativeEvidencePath(viewport.screenshot),
  };
}

async function collectEmptyAuditMetrics(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => document.fonts?.ready ?? true);
  await page.waitForTimeout(150);

  await expect(page.getByText('원장 로그가 없습니다')).toBeVisible();

  const kpiVisuals = await collectKpiVisuals(page);
  assertPopulatedKpiTrends(kpiVisuals.kpiTrends, createdAtUtcDateBuckets(POLISH_PASSPORTS).length);
  assertPopulatedKpiSnapshots(kpiVisuals.kpiSnapshots);

  await page.screenshot({ path: path.join(EVIDENCE_DIR, SCREENSHOTS.emptyAudit), fullPage: false });

  return {
    viewport: { width: 1920, height: 1080 },
    ledgerEmptyStateVisible: await page.getByText('원장 로그가 없습니다').isVisible(),
    ...kpiVisuals,
    screenshot: relativeEvidencePath(SCREENSHOTS.emptyAudit),
  };
}

async function collectNoDataMetrics(page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(() => document.fonts?.ready ?? true);
  await page.waitForTimeout(150);

  const kpiVisuals = await collectKpiVisuals(page);
  assertNoDataKpiTrends(kpiVisuals.kpiTrends);
  assertNoDataKpiSnapshots(kpiVisuals.kpiSnapshots);

  const emptyStates = {
    noAlerts: await page.getByText('표시할 알림이 없습니다').isVisible(),
    noTasks: await page.getByText('대기 중인 작업이 없습니다').isVisible(),
    noLedger: await page.getByText('원장 로그가 없습니다').isVisible(),
  };

  return {
    viewport: { width: 1920, height: 1080 },
    passportCount: 0,
    kpiTrendCount: kpiVisuals.kpiTrendCount,
    kpiTrends: kpiVisuals.kpiTrends,
    kpiSnapshotCount: kpiVisuals.kpiSnapshotCount,
    kpiSnapshots: kpiVisuals.kpiSnapshots,
    kpiSnapshotSummary: {
      count: kpiVisuals.kpiSnapshots.length,
      bounded: kpiVisuals.kpiSnapshots.every((snapshot) => Number.isFinite(snapshot.fill) && snapshot.fill >= 0 && snapshot.fill <= 1),
      hasInvalidFillText: kpiVisuals.kpiSnapshots.some((snapshot) => /NaN|Infinity/.test(snapshot.rawFill)),
      expectedCaptions: Object.entries(EXPECTED_NO_DATA_CAPTIONS).every(([kind, expectedCaption]) => {
        const snapshot = kpiVisuals.kpiSnapshots.find((item) => item.kind === kind);
        return snapshot?.caption === expectedCaption;
      }),
    },
    kpiVisualSummary: kpiVisuals.kpiVisualSummary,
    kpiLegacySparkCount: kpiVisuals.kpiLegacySparkCount,
    emptyStates,
  };
}

test.describe.serial('Dashboard visual polish evidence', () => {
  test.setTimeout(180000);

  test('captures route-mocked visual polish metrics and screenshots', async ({ browser }) => {
    ensureEvidenceDir();
    const generatedAt = new Date().toISOString();
    const createdAtDateBuckets = createdAtUtcDateBuckets(POLISH_PASSPORTS);
    const createdAtDateBucketCounts = createdAtUtcDateBucketCounts(POLISH_PASSPORTS);

    expect(POLISH_PASSPORTS).toHaveLength(100);
    expect(EXPECTED_DAILY_TREND_VALUES.reduce((total, value) => total + value, 0)).toBe(100);
    expect(createdAtDateBuckets).toEqual(POLISH_CREATED_AT_BUCKETS.map(({ date }) => date));
    expect(createdAtDateBucketCounts).toEqual(EXPECTED_CREATED_AT_BUCKET_COUNTS);
    expect(EXPECTED_DAILY_TREND_VALUES).not.toEqual(FORBIDDEN_CUMULATIVE_TREND_VALUES);

    const populatedSession = await openDashboard(browser, {
      viewport: { width: 1920, height: 1080 },
      auditRecords: POLISH_AUDIT_RECORDS,
    });
    await waitForDashboard(populatedSession.page);
    await expect(populatedSession.page.locator('.vk-kpi [data-kpi-snapshot-kind]')).toHaveCount(3);
    await expect(populatedSession.page.locator('.vk-kpi [data-kpi-trend-sparkline]')).toHaveCount(1);
    const totalTrendLocator = populatedSession.page.locator(`.vk-kpi [data-kpi-trend-kind="total"][data-kpi-trend-source="${EXPECTED_TOTAL_TREND_SOURCE}"]`);
    await expect(totalTrendLocator).toHaveAttribute('data-kpi-trend-points', String(createdAtDateBuckets.length));
    await expect(totalTrendLocator).toHaveAttribute('data-kpi-trend-mode', EXPECTED_TOTAL_TREND_MODE);
    await expect(totalTrendLocator).toHaveAttribute('data-kpi-trend-values', EXPECTED_DAILY_TREND_VALUES.join(','));
    await expect(populatedSession.page.locator('.vk-kpi__spark')).toHaveCount(0);
    await expect(populatedSession.page.locator('.vk-kpi__value')).toHaveText(EXPECTED_POPULATED_KPI_VALUES);

    const viewportMetrics = {};
    for (const viewport of VIEWPORTS) {
      viewportMetrics[viewport.key] = await collectVisualMetrics(populatedSession.page, viewport);
    }
    const populatedCalls = await getCalls(populatedSession.page);
    const populatedUnhandledCalls = await getUnhandledCalls(populatedSession.page);
    await populatedSession.context.close();

    const emptySession = await openDashboard(browser, {
      viewport: { width: 1920, height: 1080 },
      auditRecords: [],
    });
    await waitForDashboard(emptySession.page);
    const emptyAuditMetrics = await collectEmptyAuditMetrics(emptySession.page);
    const emptyCalls = await getCalls(emptySession.page);
    const emptyUnhandledCalls = await getUnhandledCalls(emptySession.page);
    await emptySession.context.close();

    const noDataSession = await openDashboard(browser, {
      viewport: { width: 1920, height: 1080 },
      passports: [],
      auditRecords: [],
    });
    await waitForNoDataDashboard(noDataSession.page);
    const noDataMetrics = await collectNoDataMetrics(noDataSession.page);
    const noDataCalls = await getCalls(noDataSession.page);
    const noDataUnhandledCalls = await getUnhandledCalls(noDataSession.page);
    await noDataSession.context.close();

    const allCalls = [...populatedCalls, ...emptyCalls, ...noDataCalls];
    const endpointPolicy = {
      calls: allCalls,
      unhandledCalls: [...populatedUnhandledCalls, ...emptyUnhandledCalls, ...noDataUnhandledCalls],
      forbiddenDashboardCalls: allCalls.filter((call) => call.pathname === '/api/dashboard' || call.url.includes('/api/dashboard')),
      unexpectedCalls: allCalls.filter((call) => !isAllowedEndpoint(call)),
    };

    const metrics = {
      generatedAt,
      tool: 'Playwright test with addInitScript fetch route mocks via Vite preview',
      baseUrl: BASE,
      authSeed: AUTH_SEED,
      fixtures: {
        passportCount: POLISH_PASSPORTS.length,
        selectedPassportId: 'POLISH-P-001',
        bmuRecordsForSelected: bmuRecordsFor('POLISH-P-001').length,
        auditRecordCount: POLISH_AUDIT_RECORDS.length,
        taskQueueExpected: ['100', '100', '0', '0'],
        kpiValuesExpected: EXPECTED_POPULATED_KPI_VALUES,
        createdAtDateBuckets,
        createdAtDateBucketCount: createdAtDateBuckets.length,
        createdAtDateBucketCounts,
        createdAtDateBucketCountsExpected: EXPECTED_CREATED_AT_BUCKET_COUNTS,
        createdAtBucketsExpected: POLISH_CREATED_AT_BUCKETS,
        totalTrendSourceExpected: EXPECTED_TOTAL_TREND_SOURCE,
        totalTrendModeExpected: EXPECTED_TOTAL_TREND_MODE,
        totalTrendValuesExpected: EXPECTED_DAILY_TREND_VALUES,
        totalTrendForbiddenCumulativeValues: FORBIDDEN_CUMULATIVE_TREND_VALUES,
        kpiSnapshotFillsExpected: EXPECTED_POPULATED_SNAPSHOT_FILLS,
        noDataCaptionsExpected: EXPECTED_NO_DATA_CAPTIONS,
      },
      kpiTrends: viewportMetrics['1920x1080'].kpiTrends,
      kpiSnapshots: viewportMetrics['1920x1080'].kpiSnapshots,
      kpiVisualSummary: viewportMetrics['1920x1080'].kpiVisualSummary,
      viewports: viewportMetrics,
      emptyAudit: emptyAuditMetrics,
      noData: noDataMetrics,
      endpointPolicy,
      runtime: {
        populated: populatedSession.runtime,
        emptyAudit: emptySession.runtime,
        noData: noDataSession.runtime,
      },
      screenshotPaths: {
        dashboard1920x1080: relativeEvidencePath(SCREENSHOTS.wide),
        dashboard1366x768: relativeEvidencePath(SCREENSHOTS.laptop),
        dashboardEmptyAudit: relativeEvidencePath(SCREENSHOTS.emptyAudit),
      },
    };
    metrics.pass = endpointPolicy.forbiddenDashboardCalls.length === 0
      && endpointPolicy.unhandledCalls.length === 0
      && endpointPolicy.unexpectedCalls.length === 0
      && viewportMetrics['1920x1080'].alertGapPx >= 8
      && viewportMetrics['1366x768'].alertGapPx >= 8
      && viewportMetrics['1920x1080'].taskNumberFontPx.every((item) => item.fontSizePx <= 28)
      && Object.values(viewportMetrics).every((metric) => metric.taskOverflow.every((item) => item.overflow === false))
      && Object.values(viewportMetrics).every((metric) => metric.kpiVisualSummary.trendCount === 1)
      && Object.values(viewportMetrics).every((metric) => metric.kpiVisualSummary.snapshotCount === 3)
      && Object.values(viewportMetrics).every((metric) => metric.kpiVisualSummary.legacySparkCount === 0)
      && Object.values(viewportMetrics).every((metric) => hasExpectedDailyTotalTrend(metric.kpiVisualSummary, createdAtDateBuckets.length))
      && Object.values(viewportMetrics).every((metric) => metric.kpiSnapshotSummary.bounded)
      && Object.values(viewportMetrics).every((metric) => !metric.kpiSnapshotSummary.hasInvalidFillText)
      && Object.values(viewportMetrics).every((metric) => metric.kpiSnapshotSummary.distinctFillCount >= 2)
      && Object.values(viewportMetrics).every((metric) => metric.kpiSnapshotSummary.expectedPopulatedFallbackFills)
      && emptyAuditMetrics.ledgerEmptyStateVisible
      && emptyAuditMetrics.kpiVisualSummary.trendCount === 1
      && emptyAuditMetrics.kpiVisualSummary.snapshotCount === 3
      && emptyAuditMetrics.kpiVisualSummary.legacySparkCount === 0
      && hasExpectedDailyTotalTrend(emptyAuditMetrics.kpiVisualSummary, createdAtDateBuckets.length)
      && emptyAuditMetrics.kpiSnapshotSummary.bounded
      && !emptyAuditMetrics.kpiSnapshotSummary.hasInvalidFillText
      && emptyAuditMetrics.kpiSnapshotSummary.distinctFillCount >= 2
      && emptyAuditMetrics.kpiSnapshotSummary.expectedPopulatedFallbackFills
      && noDataMetrics.kpiSnapshotCount === 4
      && noDataMetrics.kpiVisualSummary.trendCount === 0
      && noDataMetrics.kpiVisualSummary.snapshotCount === 4
      && noDataMetrics.kpiVisualSummary.legacySparkCount === 0
      && noDataMetrics.kpiSnapshotSummary.bounded
      && !noDataMetrics.kpiSnapshotSummary.hasInvalidFillText
      && noDataMetrics.kpiSnapshotSummary.expectedCaptions
      && noDataMetrics.emptyStates.noAlerts
      && noDataMetrics.emptyStates.noTasks
      && noDataMetrics.emptyStates.noLedger;

    fs.writeFileSync(path.join(EVIDENCE_DIR, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`);

    expect(endpointPolicy.forbiddenDashboardCalls).toEqual([]);
    expect(endpointPolicy.unhandledCalls).toEqual([]);
    expect(endpointPolicy.unexpectedCalls).toEqual([]);
    expect(metrics.pass).toBe(true);
  });
});
