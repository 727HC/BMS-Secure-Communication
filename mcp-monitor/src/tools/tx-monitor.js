// Tool 1: Fabric Transaction Monitoring
const fabricClient = require('../utils/fabric-client');
const { readRecentLogs } = require('../utils/log-reader');
const { addQueryError, queryErrorReport } = require('../utils/query-errors');

const LOG_READ_LIMIT = 1000;
const TX_LOG_CATEGORIES = new Set([
  'fabric',
  'bmu',
  'vc',
  'maintenance',
  'recycling',
  'analysis',
  'passport',
  'source',
  'physical',
  'verification',
  'regulatory',
]);
const SEQUENCE3_TX_NAMES = [
  'SetPassportExtendedAttributes',
  'BindBMSIdentifier',
  'RecordSourceVerification',
  'RecordBMUDataWithPayload',
  'RecordBMUData',
];

function lower(value) {
  return String(value || '').toLowerCase();
}

function normalizeBindingCode(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `0x${(value >>> 0).toString(16).padStart(8, '0')}`;
  }
  const text = String(value).trim().toLowerCase();
  if (/^0x[0-9a-f]+$/.test(text)) return `0x${parseInt(text, 16).toString(16).padStart(8, '0')}`;
  if (/^[0-9]+$/.test(text)) return `0x${(parseInt(text, 10) >>> 0).toString(16).padStart(8, '0')}`;
  return text;
}

function flattenPayloadCandidate(entry) {
  const candidates = [entry, entry.data, entry.requestBody, entry.body, entry.payload].filter(Boolean);
  const merged = {};
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) Object.assign(merged, candidate);
  }
  return merged;
}

function sequence3TxName(entry) {
  return entry.function || entry.action || 'unknown';
}

function isSequence3Tx(entry) {
  const name = lower(sequence3TxName(entry));
  const text = lower([entry.message, entry.error, entry.details, JSON.stringify(flattenPayloadCandidate(entry))].filter(Boolean).join(' '));
  return SEQUENCE3_TX_NAMES.some((tx) => name === lower(tx) || text.includes(lower(tx)));
}

function sequence3Fields(entry) {
  const payload = flattenPayloadCandidate(entry);
  const physicalVerification = payload.physicalVerification || payload.physical || {};
  const signals = physicalVerification.signals || payload.signals || {};
  const fields = {
    bmsManagementId: payload.bmsManagementId || payload.bmsManagementIdentifier || null,
    bmsBindingId: payload.bmsBindingId || null,
    bmsBindingCode32: normalizeBindingCode(payload.bmsBindingCode32 || payload.bindingCode32 || payload.bmsBindingCode),
    rawPayloadHashVerified: payload.rawPayloadHashVerified ?? payload.payloadHashVerified ?? null,
    bmsIdentifierMatched: signals.bmsIdentifierMatched ?? payload.bmsIdentifierMatched ?? null,
    evidenceHash: payload.evidenceHash || null,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== ''));
}

// Parse structured logs to extract transaction events
function extractTxFromLogs(hours) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const { logs } = readRecentLogs(LOG_READ_LIMIT, { since });

  const txLogs = logs.filter((l) => (l.function || l.action) && (
    TX_LOG_CATEGORIES.has(l.category) || isSequence3Tx(l)
  ));

  return txLogs.map((l) => ({
    timestamp: l.timestamp,
    function: sequence3TxName(l),
    category: l.category,
    success: l.level !== 'error',
    passportId: l.passportId || null,
    details: l.message,
    duration: l.durationMs || null,
    sequence3: isSequence3Tx(l) ? sequence3Fields(l) : undefined,
  }));
}

async function execute(params) {
  const { action, limit = 20, function_name, passport_id, hours = 24 } = params;

  switch (action) {
    case 'recent': {
      const queryErrors = [];
      // Primary source: actual transaction logs
      const logRecords = extractTxFromLogs(hours)
        .map((r) => ({ ...r, source: 'log' }));

      // Enrich with Fabric BMU data when passport_id specified
      let fabricRecords = [];
      if (passport_id) {
        try {
          const bmuResult = await fabricClient.evaluate(
            'QueryBMURecordsByPassport', passport_id, String(limit), ''
          );
          fabricRecords = (bmuResult.records || [])
            .filter((r) => r.status !== 'INVALIDATED')
            .map((r) => ({
              timestamp: r.timestamp || r.createdAt,
              function: 'RecordBMUData',
              category: 'bmu',
              success: true,
              passportId: r.passportId,
              details: `SOC=${r.soc} V=${r.voltage}`,
              duration: null,
              source: 'fabric',
            }));
        } catch (err) {
          addQueryError(queryErrors, err, {
            functionName: 'QueryBMURecordsByPassport',
            target: passport_id,
          });
        }
      }

      const records = [...logRecords, ...fabricRecords]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return {
        action: 'recent',
        count: records.length,
        fabricQuery: queryErrorReport(queryErrors),
        transactions: records,
      };
    }

    case 'stats': {
      const queryErrors = [];
      const logTxs = extractTxFromLogs(hours);

      // Count by function
      const byFunction = {};
      const byStatus = { success: 0, error: 0 };

      for (const tx of logTxs) {
        const fn = tx.function || 'unknown';
        byFunction[fn] = (byFunction[fn] || 0) + 1;
        if (tx.success) byStatus.success++;
        else byStatus.error++;
      }

      // TPS calculation
      const total = logTxs.length;
      const tps = hours > 0 ? (total / (hours * 3600)).toFixed(4) : 0;

      // Query passport count from Fabric
      let passportCount = null;
      try {
        const result = await fabricClient.evaluate('QueryPassportsWithPagination', '1', '');
        passportCount = result.count || 0;
      } catch (err) {
        addQueryError(queryErrors, err, { functionName: 'QueryPassportsWithPagination' });
      }

      return {
        action: 'stats',
        period: `${hours}h`,
        totalTransactions: total,
        tps: parseFloat(tps),
        successRate: total > 0 ? `${((byStatus.success / total) * 100).toFixed(1)}%` : 'N/A',
        byStatus,
        byFunction,
        passportCount,
        fabricQuery: queryErrorReport(queryErrors),
      };
    }

    case 'search': {
      if (!function_name) {
        throw new Error('function_name is required for search action');
      }

      const logTxs = extractTxFromLogs(hours);
      const matched = logTxs
        .filter((tx) => tx.function && tx.function.toLowerCase().includes(function_name.toLowerCase()))
        .slice(-limit);
      const queryErrors = [];

      // If searching for BMU and passport_id is given, also query Fabric
      let fabricResults = [];
      if (function_name.toLowerCase().includes('bmu') && passport_id) {
        try {
          const result = await fabricClient.evaluate(
            'QueryBMURecordsByPassport', passport_id, String(limit), ''
          );
          fabricResults = (result.records || []).map((r) => ({
            type: 'fabric_query',
            id: r.recordId,
            passportId: r.passportId,
            timestamp: r.timestamp,
            soc: r.soc,
            voltage: r.voltage,
            temperature: r.temperature,
          }));
        } catch (err) {
          addQueryError(queryErrors, err, {
            functionName: 'QueryBMURecordsByPassport',
            target: passport_id,
          });
        }
      }

      return {
        action: 'search',
        functionFilter: function_name,
        logMatches: matched.length,
        fabricMatches: fabricResults.length,
        fabricQuery: queryErrorReport(queryErrors),
        results: [...matched, ...fabricResults].slice(0, limit),
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = { execute };
