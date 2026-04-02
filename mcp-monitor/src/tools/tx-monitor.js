// Tool 1: Fabric Transaction Monitoring
const fabricClient = require('../utils/fabric-client');
const { readRecentLogs } = require('../utils/log-reader');

const LOG_READ_LIMIT = 1000;

// Parse structured logs to extract transaction events
function extractTxFromLogs(hours) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const { logs } = readRecentLogs(LOG_READ_LIMIT, { since });

  const txLogs = logs.filter((l) =>
    (l.category === 'fabric' || l.category === 'bmu' ||
    l.category === 'vc' || l.category === 'maintenance' ||
    l.category === 'recycling' || l.category === 'analysis') &&
    (l.function || l.action)
  );

  return txLogs.map((l) => ({
    timestamp: l.timestamp,
    function: l.function || l.action || 'unknown',
    category: l.category,
    success: l.level !== 'error',
    passportId: l.passportId || null,
    details: l.message,
    duration: l.durationMs || null,
  }));
}

async function execute(params) {
  const { action, limit = 20, function_name, passport_id, hours = 24 } = params;

  switch (action) {
    case 'recent': {
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
        } catch { /* Fabric unavailable — log-only results */ }
      }

      const records = [...logRecords, ...fabricRecords]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return {
        action: 'recent',
        count: records.length,
        transactions: records,
      };
    }

    case 'stats': {
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
      let passportCount = 0;
      try {
        const result = await fabricClient.evaluate('QueryPassportsWithPagination', '1', '');
        passportCount = result.count || 0;
      } catch { /* ignore */ }

      return {
        action: 'stats',
        period: `${hours}h`,
        totalTransactions: total,
        tps: parseFloat(tps),
        successRate: total > 0 ? `${((byStatus.success / total) * 100).toFixed(1)}%` : 'N/A',
        byStatus,
        byFunction,
        passportCount,
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
        } catch { /* ignore */ }
      }

      return {
        action: 'search',
        functionFilter: function_name,
        logMatches: matched.length,
        fabricMatches: fabricResults.length,
        results: [...matched, ...fabricResults].slice(0, limit),
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = { execute };
