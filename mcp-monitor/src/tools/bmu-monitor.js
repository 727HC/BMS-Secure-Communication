// Tool 2: BMU Data Anomaly Detection
const fabricClient = require('../utils/fabric-client');
const { readRecentLogs } = require('../utils/log-reader');

// Runtime thresholds (can be changed via thresholds action)
const thresholds = {
  soc_min: parseInt(process.env.BMU_SOC_MIN || '10', 10),
  soc_max: parseInt(process.env.BMU_SOC_MAX || '95', 10),
  voltage_min: parseFloat(process.env.BMU_VOLTAGE_MIN || '27.5'),   // pack voltage (11S)
  voltage_max: parseFloat(process.env.BMU_VOLTAGE_MAX || '47.85'), // pack voltage (11S)
  temp_min: parseInt(process.env.BMU_TEMP_MIN || '0', 10),
  temp_max: parseInt(process.env.BMU_TEMP_MAX || '60', 10),
};

// BMU raw uint16 scale factors (from bmu-parser.service.js)
// soc_u16 / 655.35 = SOC %
// temperature_u16 / 1310.7 = deg C
const SOC_SCALE = 655.35;
const TEMP_SCALE = 1310.7;

function filterValid(records) {
  return (records || []).filter((r) => r.status !== 'INVALIDATED');
}

function scaleSOC(raw) {
  return +(raw / SOC_SCALE).toFixed(1);
}

function scaleTemp(raw) {
  return +(raw / TEMP_SCALE).toFixed(1);
}

function checkAnomalies(record) {
  const anomalies = [];
  const soc = scaleSOC(record.soc);
  const temp = scaleTemp(record.temperature);
  const voltage = record.voltage;

  if (soc < thresholds.soc_min) {
    anomalies.push({ type: 'SOC_LOW', value: soc, threshold: thresholds.soc_min, unit: '%' });
  }
  if (soc > thresholds.soc_max) {
    anomalies.push({ type: 'SOC_HIGH', value: soc, threshold: thresholds.soc_max, unit: '%' });
  }
  if (voltage < thresholds.voltage_min) {
    anomalies.push({ type: 'VOLTAGE_LOW', value: voltage, threshold: thresholds.voltage_min, unit: 'V' });
  }
  if (voltage > thresholds.voltage_max) {
    anomalies.push({ type: 'VOLTAGE_HIGH', value: voltage, threshold: thresholds.voltage_max, unit: 'V' });
  }
  if (temp < thresholds.temp_min) {
    anomalies.push({ type: 'TEMP_LOW', value: temp, threshold: thresholds.temp_min, unit: 'C' });
  }
  if (temp > thresholds.temp_max) {
    anomalies.push({ type: 'TEMP_HIGH', value: temp, threshold: thresholds.temp_max, unit: 'C' });
  }

  // Status flags check (bit 2 = fault)
  if (record.statusFlags & 0x04) {
    anomalies.push({ type: 'FAULT_FLAG', value: record.statusFlags, threshold: null, unit: 'flags' });
  }

  return anomalies;
}

async function execute(params) {
  const { action, passport_id, limit = 50, hours = 1, set_thresholds } = params;

  switch (action) {
    case 'anomalies': {
      let allRecords = [];

      if (passport_id) {
        // Query specific passport's BMU records
        try {
          const result = await fabricClient.evaluate(
            'QueryBMURecordsByPassport', passport_id, String(limit), ''
          );
          allRecords = filterValid(result.records);
        } catch (err) {
          throw new Error(`Failed to query BMU records: ${err.message}`);
        }
      } else {
        // Get records from logs
        const since = new Date(Date.now() - hours * 3600000).toISOString();
        const { logs } = readRecentLogs(500, { category: 'bmu', since });
        allRecords = logs
          .filter((l) => l.data)
          .map((l) => l.data);

        // Also try querying all passports and their BMU data (parallel)
        try {
          const passports = await fabricClient.evaluate('QueryPassportsWithPagination', '10', '');
          const ids = (passports.records || passports || []).map((p) => p.passportId).filter(Boolean);
          const perPassport = String(Math.ceil(limit / 5));
          const results = await Promise.allSettled(
            ids.slice(0, 5).map((pid) =>
              fabricClient.evaluate('QueryBMURecordsByPassport', pid, perPassport, '')
            )
          );
          for (const r of results) {
            if (r.status === 'fulfilled') allRecords.push(...filterValid(r.value.records));
          }
        } catch { /* ignore */ }
      }

      // Check each record for anomalies
      const anomalyRecords = [];
      for (const record of allRecords) {
        const anomalies = checkAnomalies(record);
        if (anomalies.length > 0) {
          anomalyRecords.push({
            recordId: record.recordId,
            passportId: record.passportId,
            timestamp: record.timestamp,
            soc: scaleSOC(record.soc),
            voltage: record.voltage,
            temperature: scaleTemp(record.temperature),
            anomalies,
          });
        }
      }

      return {
        action: 'anomalies',
        totalRecordsScanned: allRecords.length,
        anomalyCount: anomalyRecords.length,
        thresholds: { ...thresholds },
        anomalies: anomalyRecords.slice(0, limit),
      };
    }

    case 'latest': {
      if (!passport_id) {
        // Try to get all passports and return latest BMU from each
        try {
          const passports = await fabricClient.evaluate('QueryPassportsWithPagination', '20', '');
          const ids = (passports.records || passports || []).map((p) => p.passportId).filter(Boolean);
          const latestByPassport = [];

          const results = await Promise.allSettled(
            ids.slice(0, 10).map((pid) =>
              fabricClient.evaluate('QueryBMURecordsByPassport', pid, '1', '')
                .then((result) => ({ pid, records: result.records || [] }))
            )
          );
          for (const res of results) {
            if (res.status === 'fulfilled') {
              const { pid } = res.value;
              const valid = filterValid(res.value.records);
              if (valid.length === 0) continue;
              const r = valid[0];
              latestByPassport.push({
                passportId: pid,
                recordId: r.recordId,
                timestamp: r.timestamp,
                soc: scaleSOC(r.soc),
                voltage: r.voltage,
                current: r.current,
                temperature: scaleTemp(r.temperature),
                statusFlags: r.statusFlags,
                dischargeCycles: r.dischargeCycles,
                anomalies: checkAnomalies(r),
              });
            }
          }

          return {
            action: 'latest',
            count: latestByPassport.length,
            records: latestByPassport,
          };
        } catch (err) {
          throw new Error(`Failed to query passports: ${err.message}`);
        }
      }

      try {
        const result = await fabricClient.evaluate(
          'QueryBMURecordsByPassport', passport_id, String(limit), ''
        );
        const records = filterValid(result.records).map((r) => ({
          recordId: r.recordId,
          passportId: r.passportId,
          did: r.did,
          timestamp: r.timestamp,
          soc: scaleSOC(r.soc),
          voltage: r.voltage,
          current: r.current,
          temperature: scaleTemp(r.temperature),
          cellCount: r.cellCount,
          statusFlags: r.statusFlags,
          isCharging: !!(r.statusFlags & 0x01),
          isBalancing: !!(r.statusFlags & 0x02),
          isFault: !!(r.statusFlags & 0x04),
          dischargeCycles: r.dischargeCycles,
          freshnessCounter: r.fc,
          anomalies: checkAnomalies(r),
        }));

        return {
          action: 'latest',
          passportId: passport_id,
          count: records.length,
          records,
        };
      } catch (err) {
        throw new Error(`Failed to query BMU records: ${err.message}`);
      }
    }

    case 'frequency': {
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { logs } = readRecentLogs(1000, { since });

      const bmuLogs = logs.filter((l) => l.category === 'bmu' && l.level === 'info');

      // Group by passport ID and calculate frequency
      const byPassport = {};
      for (const log of bmuLogs) {
        const pid = log.passportId || 'unknown';
        if (!byPassport[pid]) byPassport[pid] = [];
        byPassport[pid].push(new Date(log.timestamp).getTime());
      }

      const frequencies = {};
      for (const [pid, timestamps] of Object.entries(byPassport)) {
        timestamps.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        const avgInterval = intervals.length > 0
          ? (intervals.reduce((a, b) => a + b, 0) / intervals.length / 1000).toFixed(1)
          : null;

        frequencies[pid] = {
          totalRecords: timestamps.length,
          avgIntervalSeconds: avgInterval ? parseFloat(avgInterval) : null,
          lastReceived: timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]).toISOString() : null,
          firstReceived: timestamps.length > 0 ? new Date(timestamps[0]).toISOString() : null,
        };
      }

      // Also check for missing data (no BMU in last hour)
      const now = Date.now();
      const alerts = [];
      for (const [pid, freq] of Object.entries(frequencies)) {
        if (freq.lastReceived) {
          const gap = (now - new Date(freq.lastReceived).getTime()) / 60000;
          if (gap > 30) {
            alerts.push({
              passportId: pid,
              type: 'DATA_GAP',
              minutesSinceLastData: Math.round(gap),
              lastReceived: freq.lastReceived,
            });
          }
        }
      }

      return {
        action: 'frequency',
        period: `${hours}h`,
        totalBMULogs: bmuLogs.length,
        passportCount: Object.keys(frequencies).length,
        frequencies,
        alerts,
      };
    }

    case 'thresholds': {
      if (set_thresholds) {
        // Apply updates to a copy first for cross-validation
        const next = { ...thresholds };
        if (set_thresholds.soc_min !== undefined) next.soc_min = set_thresholds.soc_min;
        if (set_thresholds.soc_max !== undefined) next.soc_max = set_thresholds.soc_max;
        if (set_thresholds.voltage_min !== undefined) next.voltage_min = set_thresholds.voltage_min;
        if (set_thresholds.voltage_max !== undefined) next.voltage_max = set_thresholds.voltage_max;
        if (set_thresholds.temp_min !== undefined) next.temp_min = set_thresholds.temp_min;
        if (set_thresholds.temp_max !== undefined) next.temp_max = set_thresholds.temp_max;

        if (next.soc_min >= next.soc_max) throw new Error(`soc_min (${next.soc_min}) must be < soc_max (${next.soc_max})`);
        if (next.voltage_min >= next.voltage_max) throw new Error(`voltage_min (${next.voltage_min}) must be < voltage_max (${next.voltage_max})`);
        if (next.temp_min >= next.temp_max) throw new Error(`temp_min (${next.temp_min}) must be < temp_max (${next.temp_max})`);

        Object.assign(thresholds, next);
        return {
          action: 'thresholds',
          message: 'Thresholds updated',
          thresholds: { ...thresholds },
        };
      }
      return {
        action: 'thresholds',
        thresholds: { ...thresholds },
        scaleInfo: {
          soc: 'raw_uint16 / 655.35 = SOC %',
          temperature: 'raw_uint16 / 1310.7 = degrees C',
          voltage: 'IEEE 754 float V',
        },
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = { execute, thresholds };
