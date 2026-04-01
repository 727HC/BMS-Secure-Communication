// Tool 1: Fabric Transaction Monitoring
const fabricClient = require('../utils/fabric-client');
const { readRecentLogs } = require('../utils/log-reader');

// In-memory transaction log (populated from agent structured logs + Fabric queries)
let txCache = [];
const MAX_CACHE = 1000;

function recordTx(entry) {
  txCache.push(entry);
  if (txCache.length > MAX_CACHE) txCache = txCache.slice(-MAX_CACHE);
}

// Parse structured logs to extract transaction events
function extractTxFromLogs(hours) {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const { logs } = readRecentLogs(MAX_CACHE, { since });

  const txLogs = logs.filter((l) =>
    l.category === 'fabric' || l.category === 'bmu' ||
    l.category === 'vc' || l.category === 'maintenance' ||
    l.category === 'recycling' || l.category === 'analysis'
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
      // Query BMU records as proxy for recent transactions
      let records = [];
      try {
        const result = await fabricClient.evaluate(
          'QueryPassportsWithPagination', String(limit), ''
        );
        const passports = result.records || result || [];

        // Also get recent BMU records if passport_id specified
        if (passport_id) {
          const bmuResult = await fabricClient.evaluate(
            'QueryBMURecordsByPassport', passport_id, String(limit), ''
          );
          records = (bmuResult.records || []).map((r) => ({
            type: 'BMU_DATA',
            id: r.recordId,
            passportId: r.passportId,
            timestamp: r.timestamp || r.createdAt,
            function: 'RecordBMUData',
            soc: r.soc,
            voltage: r.voltage,
          }));
        }

        // Add passport creation/update events
        const passportTxs = passports.slice(0, limit).map((p) => ({
          type: 'PASSPORT',
          id: p.passportId,
          passportId: p.passportId,
          timestamp: p.updatedAt || p.createdAt,
          function: p.createdAt === p.updatedAt ? 'CreateBatteryPassport' : 'UpdatePassport',
          status: p.status,
          org: p.creatorMsp,
        }));

        records = [...records, ...passportTxs]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limit);
        return {
          action: 'recent',
          source: 'fabric',
          count: records.length,
          transactions: records,
        };
      } catch (err) {
        // Fallback to log-based records
        records = extractTxFromLogs(hours).slice(-limit);
        return {
          action: 'recent',
          source: 'logs',
          count: records.length,
          transactions: records,
        };
      }
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
        return { error: 'function_name is required for search action' };
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
      return { error: `Unknown action: ${action}` };
  }
}

module.exports = { execute, recordTx };
