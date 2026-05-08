// Tool 5: Passport API observability for 3rd-year functional-test monitoring
// Read-only by contract: HTTP GET only, local log reads, Fabric evaluateTransaction only via other tools.
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { readRecentLogs } = require('../utils/log-reader');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';
const AUDIT_TOKEN = process.env.PASSPORT_AUDIT_TOKEN || process.env.MCP_PASSPORT_AUDIT_TOKEN || '';
const AUDIT_LOG_PATH = process.env.PASSPORT_AUDIT_LOG_PATH
  ? path.resolve(__dirname, '..', '..', process.env.PASSPORT_AUDIT_LOG_PATH)
  : path.resolve(__dirname, '..', '..', '..', 'logs', 'audit.log');
const READ_CHUNK_SIZE = 16 * 1024;
const DEFAULT_FRESHNESS_GAP_WARN = parseInt(process.env.BMU_FRESHNESS_GAP_WARN || '1000', 10);
const OUTPUT_REDACTED = '[REDACTED_BY_MCP_MONITOR]';
const OUTPUT_SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'signature',
  'rawPayload',
  'privateKey',
  'authorization',
]);

function buildUrl(apiPath) {
  return `${AGENT_URL.replace(/\/$/, '')}${apiPath}`;
}

async function getPassportApi(apiPath, { params, auth = false } = {}) {
  const headers = {};
  if (auth && AUDIT_TOKEN) headers.Authorization = `Bearer ${AUDIT_TOKEN}`;

  try {
    const res = await axios.get(buildUrl(apiPath), { params, headers, timeout: 5000 });
    return {
      ok: true,
      statusCode: res.status,
      path: apiPath,
      method: 'GET',
      auth: auth ? (AUDIT_TOKEN ? 'bearer-token-present' : 'missing-token') : 'not-required',
      data: res.data,
    };
  } catch (err) {
    return {
      ok: false,
      statusCode: err.response?.status || null,
      path: apiPath,
      method: 'GET',
      auth: auth ? (AUDIT_TOKEN ? 'bearer-token-present' : 'missing-token') : 'not-required',
      error: err.response?.data?.error || err.code || err.message,
    };
  }
}

function readTailLines(filePath, maxLines) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    if (stat.size === 0) return [];

    let position = stat.size;
    let remaining = '';
    const lines = [];

    while (position > 0 && lines.length < maxLines) {
      const readSize = Math.min(READ_CHUNK_SIZE, position);
      position -= readSize;
      const buf = Buffer.alloc(readSize);
      fs.readSync(fd, buf, 0, readSize, position);
      remaining = buf.toString('utf8') + remaining;

      const parts = remaining.split('\n');
      remaining = parts.shift();

      for (let i = parts.length - 1; i >= 0 && lines.length < maxLines; i--) {
        if (parts[i]) lines.unshift(parts[i]);
      }
    }

    if (position === 0 && remaining && lines.length < maxLines) lines.unshift(remaining);
    return lines;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function parseNdjsonTail(filePath, count) {
  if (!fs.existsSync(filePath)) {
    return { ok: false, source: filePath, error: `Log file not found: ${filePath}`, records: [] };
  }

  const records = [];
  const malformed = [];
  const lines = readTailLines(filePath, count);
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch (err) {
      malformed.push({ message: err.message, raw: line.slice(0, 160) });
    }
  }

  return { ok: true, source: filePath, records, malformedCount: malformed.length, malformed: malformed.slice(0, 3) };
}

function summarizeAuditApiProbe(probe) {
  if (!probe) return null;
  const summary = {
    ok: probe.ok,
    statusCode: probe.statusCode,
    path: probe.path,
    method: probe.method,
    auth: probe.auth,
    error: probe.error,
  };
  if (probe.ok) {
    summary.data = {
      total: probe.data?.total,
      page: probe.data?.page,
      limit: probe.data?.limit,
      recordCount: Array.isArray(probe.data?.records) ? probe.data.records.length : 0,
    };
  }
  return summary;
}

function summarizeLocalRead(local) {
  if (!local) return null;
  return {
    ok: local.ok,
    source: local.source,
    error: local.error,
    recordCount: Array.isArray(local.records) ? local.records.length : 0,
    malformedCount: local.malformedCount || 0,
  };
}

function filterSince(records, hours) {
  const since = Date.now() - hours * 3600000;
  return records.filter((record) => {
    if (!record.timestamp) return false;
    const ts = new Date(record.timestamp).getTime();
    return Number.isFinite(ts) && ts >= since;
  });
}

function sanitizeObservableValue(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeObservableValue(item));

  const clean = {};
  for (const [key, nested] of Object.entries(value)) {
    if (OUTPUT_SENSITIVE_KEYS.has(key)) {
      clean[key] = OUTPUT_REDACTED;
    } else {
      clean[key] = sanitizeObservableValue(nested);
    }
  }
  return clean;
}

function lower(value) {
  return String(value || '').toLowerCase();
}

function textOf(entry) {
  return [
    entry.message,
    entry.error,
    entry.details,
    entry.action,
    entry.function,
    entry.path,
    entry.targetId,
    entry.statusCode,
  ].filter((v) => v !== undefined && v !== null).join(' ');
}

function includesAny(entry, patterns) {
  const text = lower(textOf(entry));
  return patterns.some((pattern) => text.includes(pattern));
}

function isSuccess(entry) {
  if (typeof entry.success === 'boolean') return entry.success;
  if (entry.level) return entry.level !== 'error';
  if (entry.statusCode) return entry.statusCode >= 200 && entry.statusCode < 300;
  return true;
}

function isBmuRecord(entry) {
  return entry.action === 'RECORD_BMU' || includesAny(entry, ['/bmu/data', 'recordbmudata', 'record_bmu']);
}

function isBmuInvalidation(entry) {
  return entry.action === 'INVALIDATE_BMU' || includesAny(entry, ['/invalidate', 'invalidatebmu', 'invalidate_bmu']);
}

function isVcVerification(entry) {
  return entry.action === 'VERIFY_VC' || includesAny(entry, ['/vc/verify', 'verifyvc', 'verify_vc']);
}

function isRegulatoryVerification(entry) {
  return includesAny(entry, [
    '/recycling', 'recycling', 'compliance', 'regulatory', 'dispose_battery',
    'extract_materials', 'set_recycle', 'verify_vc', '/vc/verify',
  ]);
}

function isPhysicalVerification(entry) {
  return includesAny(entry, [
    '/maintenance', 'maintenance', 'accident', '/analysis', 'analysis',
    'signed bmu', 'signature', 'physical', 'verify_bmu', 'record_bmu', '/bmu/data',
  ]);
}

function isErrorEntry(entry) {
  return entry.level === 'error' || isSuccess(entry) === false || (entry.statusCode && entry.statusCode >= 400);
}

function categoryForError(entry) {
  const text = lower(textOf(entry));
  if (entry.statusCode === 401 || entry.statusCode === 403 || /\b(auth|rbac|token|forbidden|unauthorized)\b/.test(text)) {
    return 'AUTHORIZATION';
  }
  if (entry.statusCode === 400 || entry.statusCode === 422 || /\b(validation|invalid|required|schema|range)\b/.test(text)) {
    return 'VALIDATION';
  }
  if (/\b(internal|chaincode internal|error code 500|endorsement failure)\b/.test(text)) {
    return 'CHAINCODE_INTERNAL';
  }
  if (/\b(fabric|gateway|peer|orderer|endorse|evaluate)\b/.test(text)) {
    return 'FABRIC_GATEWAY';
  }
  if (/\b(48-byte|payload|freshness|counter|signature|can-fd|bms)\b/.test(text)) {
    return 'BMS_PAYLOAD';
  }
  return 'UNKNOWN';
}

function countBy(records, keyFn) {
  const counts = {};
  for (const record of records) {
    const key = keyFn(record) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function bucketHour(timestamp) {
  const d = new Date(timestamp);
  if (!Number.isFinite(d.getTime())) return 'unknown';
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

function summariseBooleanTrend(records, predicate) {
  const matched = records.filter(predicate);
  const success = matched.filter(isSuccess).length;
  const failed = matched.length - success;
  return {
    total: matched.length,
    success,
    failed,
    byHour: countBy(matched, (entry) => bucketHour(entry.timestamp)),
  };
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickFirstNumber(record, keys) {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function flattenPayloadCandidate(entry) {
  const candidates = [entry, entry.data, entry.requestBody, entry.body, entry.payload].filter(Boolean);
  const merged = {};
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      Object.assign(merged, candidate);
    }
  }
  return merged;
}

function detectFreshnessAnomalies(entries, gapWarn = DEFAULT_FRESHNESS_GAP_WARN) {
  const byPassport = {};
  let skippedWithoutSubject = 0;

  for (const entry of entries) {
    const payload = flattenPayloadCandidate(entry);
    const fc = pickFirstNumber(payload, ['fc', 'freshnessCounter', 'freshness_counter', 'counter']);
    if (fc === null) continue;
    const passportId = payload.passportId || payload.passport_id || entry.passportId || entry.targetId || payload.did || entry.did;
    if (!passportId) {
      skippedWithoutSubject++;
      continue;
    }
    if (!byPassport[passportId]) byPassport[passportId] = [];
    byPassport[passportId].push({ timestamp: entry.timestamp, freshnessCounter: fc });
  }

  const anomalies = [];
  for (const [passportId, points] of Object.entries(byPassport)) {
    points.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const current = points[i];
      const delta = current.freshnessCounter - prev.freshnessCounter;
      if (delta <= 0) {
        anomalies.push({
          passportId,
          type: 'FRESHNESS_COUNTER_REPLAY_OR_STALE',
          previous: prev.freshnessCounter,
          current: current.freshnessCounter,
          delta,
          timestamp: current.timestamp,
        });
      } else if (delta > gapWarn) {
        anomalies.push({
          passportId,
          type: 'FRESHNESS_COUNTER_GAP',
          previous: prev.freshnessCounter,
          current: current.freshnessCounter,
          delta,
          threshold: gapWarn,
          timestamp: current.timestamp,
        });
      }
    }
  }

  return {
    passportsScanned: Object.keys(byPassport).length,
    sampleCount: Object.values(byPassport).reduce((sum, points) => sum + points.length, 0),
    skippedWithoutSubject,
    anomalyCount: anomalies.length,
    anomalies: anomalies.slice(0, 50),
  };
}

function chaincodeInternalTrend(entries) {
  const internalErrors = entries.filter((entry) => isErrorEntry(entry) && categoryForError(entry) === 'CHAINCODE_INTERNAL');
  return {
    total: internalErrors.length,
    byHour: countBy(internalErrors, (entry) => bucketHour(entry.timestamp)),
    byFunctionOrAction: countBy(internalErrors, (entry) => entry.function || entry.action || entry.path || 'unknown'),
    recent: internalErrors.slice(-10).map((entry) => ({
      timestamp: entry.timestamp,
      action: entry.action || entry.function || 'unknown',
      statusCode: entry.statusCode || null,
      message: entry.message || entry.error || entry.path || null,
    })),
  };
}

function buildTrendSummary({ auditRecords, agentLogs, hours }) {
  const allEntries = [...auditRecords, ...agentLogs];
  const errorEntries = allEntries.filter(isErrorEntry);
  const bmuRecords = allEntries.filter(isBmuRecord);
  const bmuErrors = bmuRecords.filter((entry) => !isSuccess(entry));
  const ingestionAttempts = bmuRecords.length;

  return {
    period: `${hours}h`,
    sourceCounts: {
      audit: auditRecords.length,
      agentLog: agentLogs.length,
      combined: allEntries.length,
    },
    passportStatus: {
      note: 'Use action=status for live /api/status probe.',
    },
    bmu: {
      recordCount: bmuRecords.length,
      invalidation: summariseBooleanTrend(allEntries, isBmuInvalidation),
      ingestionErrorRate: {
        attempts: ingestionAttempts,
        failed: bmuErrors.length,
        errorRate: ingestionAttempts > 0 ? Number((bmuErrors.length / ingestionAttempts).toFixed(4)) : null,
      },
      freshnessCounter: detectFreshnessAnomalies(allEntries),
      errorTrend: {
        total: bmuErrors.length,
        byHour: countBy(bmuErrors, (entry) => bucketHour(entry.timestamp)),
        byCategory: countBy(bmuErrors, categoryForError),
      },
    },
    vc: {
      verificationTrend: summariseBooleanTrend(allEntries, isVcVerification),
    },
    verificationStatus: {
      regulatory: summariseBooleanTrend(allEntries, isRegulatoryVerification),
      physical: summariseBooleanTrend(allEntries, isPhysicalVerification),
    },
    errors: {
      total: errorEntries.length,
      validationErrorCategoryCount: countBy(errorEntries, categoryForError),
      chaincodeInternalTrend: chaincodeInternalTrend(allEntries),
    },
  };
}

function observationCatalog() {
  return [
    {
      id: 'passport-api-status',
      requirement: '실시간 문제 추적/해결 모니터링',
      source: 'GET /api/status',
      metric: ['fabric connection', 'channel', 'contract', 'org'],
      pass: 'HTTP 200 and fabric=connected for live integration test',
      fail: 'timeout, 5xx, or fabric disconnected when live Fabric is required',
    },
    {
      id: 'passport-api-audit',
      requirement: '로그 및 오류 모니터링/추적/감사',
      source: 'GET /api/audit with pre-provisioned ManufacturerMSP/RegulatorMSP bearer token, or local logs/audit.log fallback',
      metric: ['audit total', 'write actions', 'statusCode', 'success/fail', 'duration'],
      pass: 'read succeeds or local fallback is available; no secret/raw payload expectation because Passport redacts sensitive fields',
      fail: '401/403 without configured identity and no readable local audit log',
    },
    {
      id: 'bmu-ingestion-health',
      requirement: '대규모 데이터 처리 안정성 관찰',
      source: 'audit action=RECORD_BMU + agent category=bmu',
      metric: ['BMU record count', 'ingestion error rate', 'invalidation count', 'freshness counter anomaly'],
      pass: 'error rate under test threshold and zero replay/stale freshness anomalies',
      fail: 'threshold breach, repeated invalidation spike, or replay/stale counter evidence',
    },
    {
      id: 'vc-verification-health',
      requirement: '규제/검증 흐름 모니터링',
      source: 'audit action=VERIFY_VC + agent category=vc',
      metric: ['VC verification success/failure by hour', 'regulatory verification status'],
      pass: 'expected verification events are visible and failure count matches test scenario',
      fail: 'missing verification events or unexplained failure spike',
    },
    {
      id: 'chaincode-internal-errors',
      requirement: '실시간 오류 추적',
      source: 'audit/log errors containing INTERNAL / endorsement / Fabric gateway markers',
      metric: ['chaincode INTERNAL error count by hour/function'],
      pass: 'zero INTERNAL errors in nominal test; injected failures appear with handoff payload',
      fail: 'unexplained INTERNAL trend or missing evidence for injected fault',
    },
  ];
}

function alertPayloadExamples() {
  const now = new Date().toISOString();
  return [
    {
      alertId: 'MCP-PASSPORT-INGESTION-ERROR-RATE',
      severity: 'warning|critical',
      detectedAt: now,
      source: 'mcp-monitor.monitor_passport.trends',
      handoffTo: ['배터리여권', '임베디드'],
      metric: 'bmu.ingestionErrorRate',
      threshold: { warning: 0.01, critical: 0.05 },
      observed: { attempts: 1000, failed: 23, errorRate: 0.023 },
      evidence: { auditActions: ['RECORD_BMU'], sampleRecordIds: ['AUDIT-...'] },
      readOnly: true,
      requestedAction: 'Passport validates API errors; Embedded checks 48-byte payload and signing source.',
    },
    {
      alertId: 'MCP-PASSPORT-BMU-FRESHNESS-COUNTER',
      severity: 'critical',
      detectedAt: now,
      source: 'mcp-monitor.monitor_passport.trends',
      handoffTo: ['임베디드', '배터리여권'],
      metric: 'bmu.freshnessCounter',
      observed: { passportId: 'BAT-...', previous: 42, current: 42, type: 'FRESHNESS_COUNTER_REPLAY_OR_STALE' },
      evidence: { logCategory: 'bmu', timestamps: ['...'] },
      readOnly: true,
      requestedAction: 'Embedded validates reserved bytes/freshness counter; Passport confirms rejection/audit trail.',
    },
    {
      alertId: 'MCP-PASSPORT-CHAINCODE-INTERNAL',
      severity: 'critical',
      detectedAt: now,
      source: 'mcp-monitor.monitor_passport.trends',
      handoffTo: ['블록체인', '배터리여권'],
      metric: 'errors.chaincodeInternalTrend',
      observed: { function: 'RecordBMUData', count: 3, period: '1h' },
      evidence: { messages: ['INTERNAL: ...'], auditStatusCodes: [500] },
      readOnly: true,
      requestedAction: 'Blockchain checks smart contract validation and BMS identifier mapping; Passport checks API error wrapping.',
    },
    {
      alertId: 'MCP-PASSPORT-VC-VERIFY-DRIFT',
      severity: 'warning',
      detectedAt: now,
      source: 'mcp-monitor.monitor_passport.trends',
      handoffTo: ['배터리여권', '블록체인'],
      metric: 'vc.verificationTrend',
      observed: { total: 50, failed: 12 },
      evidence: { auditActions: ['VERIFY_VC'], credentialTypes: ['COMPLIANCE', 'RECYCLING'] },
      readOnly: true,
      requestedAction: 'Passport verifies RBAC/VC status handling; Blockchain checks credential ledger query scope.',
    },
  ];
}

function readOnlyGuarantee() {
  return {
    businessStateMutation: false,
    allowedOperations: [
      'GET /api/status',
      'GET /api/audit with externally supplied bearer token',
      'read logs/audit.log and logs/agent.log',
      'Fabric evaluateTransaction through existing read-only client only',
    ],
    forbiddenOperations: [
      'POST/PUT/PATCH/DELETE Passport API calls',
      'Passport login with stored credentials',
      'Fabric submitTransaction',
      'fabric-ca-client enrollment or wallet mutation',
    ],
    caveat: 'Passport audit middleware may append an audit entry for GET probes; MCP does not mutate business data or ledger state.',
  };
}

function verificationCommands() {
  return [
    {
      check: 'syntax',
      command: 'cd mcp-monitor && node -c src/index.js && node -c src/tools/passport-monitor.js && node -c src/utils/log-reader.js',
      pass: 'exit code 0',
      fail: 'any SyntaxError or non-zero exit',
    },
    {
      check: 'tool-registration',
      command: 'cd mcp-monitor && printf \'{"jsonrpc":"2.0","id":1,"method":"tools/list"}\\n\' | node src/index.js',
      pass: 'response includes monitor_passport',
      fail: 'server start failure or missing tool',
    },
    {
      check: 'live-status-read-only',
      command: 'MCP JSON-RPC tools/call monitor_passport with {"action":"status"}',
      pass: 'result.statusProbe.ok=true and method=GET',
      fail: 'timeout/5xx when Passport API should be running',
    },
    {
      check: 'audit-identity',
      command: 'Set PASSPORT_AUDIT_TOKEN to a ManufacturerMSP or RegulatorMSP JWT, then call {"action":"audit","source":"api"}',
      pass: 'HTTP 200 and records array present',
      fail: '401/403 means MCP identity/RBAC handoff is unresolved',
    },
    {
      check: 'adversarial-read-only-boundary',
      command: 'grep -R -E "submitTransaction[[:space:]]*\\\\(|axios\\\\.(post|put|patch|delete)[[:space:]]*\\\\(" -n mcp-monitor/src',
      pass: 'no matches for write-call expressions in monitor source',
      fail: 'any write-capable call path requires removal or explicit exception review',
    },
  ];
}

async function collectAuditRecords({ source, limit, hours }) {
  const result = {
    selectedSource: source,
    api: null,
    local: null,
    records: [],
    notes: [],
    redaction: 'MCP output redacts password/token/secret/signature/rawPayload/privateKey/authorization fields.',
  };

  if (source === 'api' || source === 'auto') {
    if (!AUDIT_TOKEN) {
      result.api = {
        ok: false,
        path: '/api/audit',
        method: 'GET',
        auth: 'missing-token',
        error: 'PASSPORT_AUDIT_TOKEN or MCP_PASSPORT_AUDIT_TOKEN is required for /api/audit',
      };
      result.notes.push('/api/audit was not called because no bearer token is configured.');
    } else {
      result.api = await getPassportApi('/api/audit', { params: { limit, page: 1 }, auth: true });
      if (result.api.ok) {
        result.records = filterSince(result.api.data?.records || [], hours).map(sanitizeObservableValue);
        result.selectedSource = 'api';
        result.api = summarizeAuditApiProbe(result.api);
        return result;
      }
      result.notes.push(`/api/audit read failed: ${result.api.statusCode || ''} ${result.api.error || ''}`.trim());
      result.api = summarizeAuditApiProbe(result.api);
    }
  }

  if (source === 'local' || source === 'auto') {
    result.local = parseNdjsonTail(AUDIT_LOG_PATH, Math.max(limit * 5, 500));
    if (result.local.ok) {
      result.records = filterSince(result.local.records, hours).slice(-limit).map(sanitizeObservableValue);
      result.selectedSource = 'local';
    } else if (source === 'local') {
      result.notes.push(result.local.error);
    }
    result.local = summarizeLocalRead(result.local);
  }

  return result;
}

async function execute(params) {
  const {
    action,
    hours = 24,
    limit = 50,
    source = 'auto',
    include_examples = true,
  } = params;

  switch (action) {
    case 'status': {
      const statusProbe = await getPassportApi('/api/status');
      return {
        action: 'status',
        timestamp: new Date().toISOString(),
        statusProbe,
        observation: observationCatalog().filter((item) => item.id === 'passport-api-status'),
        readOnly: readOnlyGuarantee(),
      };
    }

    case 'audit': {
      const audit = await collectAuditRecords({ source, limit, hours });
      return {
        action: 'audit',
        timestamp: new Date().toISOString(),
        period: `${hours}h`,
        audit,
        summary: {
          total: audit.records.length,
          writeActions: audit.records.filter((entry) => entry.action && entry.action !== 'QUERY').length,
          failures: audit.records.filter((entry) => !isSuccess(entry)).length,
          byAction: countBy(audit.records, (entry) => entry.action || 'unknown'),
          byStatusCode: countBy(audit.records, (entry) => String(entry.statusCode || 'unknown')),
        },
        readOnly: readOnlyGuarantee(),
      };
    }

    case 'trends': {
      const audit = await collectAuditRecords({ source, limit: Math.max(limit, 200), hours });
      const agentLogResult = readRecentLogs(Math.max(limit * 10, 1000), {
        since: new Date(Date.now() - hours * 3600000).toISOString(),
      });
      const agentLogs = agentLogResult.logs || [];
      const trendSummary = buildTrendSummary({ auditRecords: audit.records, agentLogs, hours });
      return {
        action: 'trends',
        timestamp: new Date().toISOString(),
        auditSource: {
          selectedSource: audit.selectedSource,
          api: audit.api,
          local: audit.local ? { ok: audit.local.ok, source: audit.local.source, error: audit.local.error, malformedCount: audit.local.malformedCount || 0 } : null,
          notes: audit.notes,
        },
        agentLogSource: {
          source: 'logs/agent.log via log-reader',
          total: agentLogResult.total || 0,
          error: agentLogResult.error || null,
        },
        trends: trendSummary,
        alerts: include_examples ? alertPayloadExamples() : [],
        readOnly: readOnlyGuarantee(),
      };
    }

    case 'observation_plan': {
      return {
        action: 'observation_plan',
        timestamp: new Date().toISOString(),
        observationItems: observationCatalog(),
        alertPayloadExamples: include_examples ? alertPayloadExamples() : [],
        verificationCommands: verificationCommands(),
        readOnly: readOnlyGuarantee(),
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = {
  execute,
  _private: {
    buildTrendSummary,
    categoryForError,
    detectFreshnessAnomalies,
    isBmuRecord,
    isBmuInvalidation,
    isVcVerification,
    observationCatalog,
    readOnlyGuarantee,
    verificationCommands,
  },
};
