#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.log(`Usage: node scripts/parse-jmeter-summary.js --jtl <results.jtl> [options]\n\nOptions:\n  --out-json <file>          Write summary JSON\n  --out-md <file>            Write evidence markdown\n  --success-rate-min <num>   Required 2xx success rate, default 99\n  --error-rate-max <num>     Required error rate, default 1\n  --run-id <id>              Evidence run id\n  --title <text>             Evidence title\n  --help                     Show this help`);
}

function parseArgs(argv) {
  const args = {
    successRateMin: 99,
    errorRateMax: 1,
    title: 'JMeter Read-only Benchmark Evidence',
    runId: new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'),
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--jtl': args.jtl = requireValue(argv, ++i, arg); break;
      case '--out-json': args.outJson = requireValue(argv, ++i, arg); break;
      case '--out-md': args.outMd = requireValue(argv, ++i, arg); break;
      case '--success-rate-min': args.successRateMin = Number(requireValue(argv, ++i, arg)); break;
      case '--error-rate-max': args.errorRateMax = Number(requireValue(argv, ++i, arg)); break;
      case '--run-id': args.runId = requireValue(argv, ++i, arg); break;
      case '--title': args.title = requireValue(argv, ++i, arg); break;
      case '--help': usage(); process.exit(0); break;
      default: throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!args.jtl) throw new Error('--jtl is required');
  if (!Number.isFinite(args.successRateMin)) throw new Error('--success-rate-min must be a number');
  if (!Number.isFinite(args.errorRateMax)) throw new Error('--error-rate-max must be a number');
  return args;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function parseJtl(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) throw new Error(`empty JTL file: ${file}`);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const hasHeader = headers.includes('timeStamp') || headers.includes('elapsed') || headers.includes('label');
  const columns = hasHeader ? headers : [
    'timeStamp', 'elapsed', 'label', 'responseCode', 'responseMessage', 'threadName',
    'dataType', 'success', 'failureMessage', 'bytes', 'sentBytes', 'grpThreads',
    'allThreads', 'URL', 'Latency', 'IdleTime', 'Connect',
  ];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map((line, index) => {
    const values = parseCsvLine(line);
    const row = { __line: index + (hasHeader ? 2 : 1) };
    for (let i = 0; i < columns.length; i++) row[columns[i]] = values[i] ?? '';
    return row;
  });
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
}

function isTrue(value) {
  return String(value).toLowerCase() === 'true';
}

function is2xx(code) {
  return /^2\d\d$/.test(String(code || '').trim());
}

function summarizeRows(rows, label = 'ALL') {
  const latencies = [];
  let minStart;
  let maxEnd;
  let twoXxSuccess = 0;
  let jmeterSuccess = 0;
  const responseCodes = {};

  for (const row of rows) {
    const elapsed = toNumber(row.elapsed);
    if (Number.isFinite(elapsed)) latencies.push(elapsed);

    const start = toNumber(row.timeStamp);
    if (Number.isFinite(start)) {
      const end = start + (Number.isFinite(elapsed) ? elapsed : 0);
      minStart = minStart === undefined ? start : Math.min(minStart, start);
      maxEnd = maxEnd === undefined ? end : Math.max(maxEnd, end);
    }

    const code = String(row.responseCode || '').trim() || 'UNKNOWN';
    responseCodes[code] = (responseCodes[code] || 0) + 1;
    const success = isTrue(row.success);
    if (success) jmeterSuccess++;
    if (success && is2xx(code)) twoXxSuccess++;
  }

  latencies.sort((a, b) => a - b);
  const total = rows.length;
  const errors = total - twoXxSuccess;
  const durationSeconds = minStart !== undefined && maxEnd !== undefined && maxEnd > minStart
    ? (maxEnd - minStart) / 1000
    : null;
  const throughput = durationSeconds ? total / durationSeconds : null;
  const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

  return {
    label,
    totalSamples: total,
    twoXxSuccess,
    jmeterSuccess,
    errors,
    successRate: total ? (twoXxSuccess / total) * 100 : 0,
    errorRate: total ? (errors / total) * 100 : 100,
    latencyMs: {
      average: avg,
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      min: latencies[0] ?? null,
      max: latencies[latencies.length - 1] ?? null,
    },
    throughputPerSecond: throughput,
    durationSeconds,
    responseCodes,
  };
}

function summarize(rows, thresholds) {
  const overall = summarizeRows(rows, 'ALL');
  const byLabel = [];
  const groups = new Map();
  for (const row of rows) {
    const label = row.label || 'UNLABELED';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  }
  for (const [label, groupRows] of groups.entries()) byLabel.push(summarizeRows(groupRows, label));
  byLabel.sort((a, b) => a.label.localeCompare(b.label));

  const passed = overall.totalSamples > 0
    && overall.successRate >= thresholds.successRateMin
    && overall.errorRate < thresholds.errorRateMax
    && overall.latencyMs.p95 !== null;

  return {
    tool: 'JMeter',
    evidenceType: 'HTTP/API read-only evidence',
    boundary: {
      fabricWriteKpi: 'Hyperledger Caliper successful commit TPS remains authoritative',
      jmeterTpsMeaning: 'reference HTTP/API read throughput only; not blockchain write TPS',
    },
    thresholds,
    passed,
    overall,
    byLabel,
  };
}

function fmt(value, digits = 2) {
  return value === null || value === undefined ? 'n/a' : Number(value).toFixed(digits);
}

function markdown(summary, args) {
  const lines = [];
  lines.push(`# ${args.title}`);
  lines.push('');
  lines.push('## Evidence Boundary');
  lines.push('');
  lines.push('- JMeter is HTTP/API read-only evidence.');
  lines.push('- Fabric write KPI remains Caliper successful commit TPS.');
  lines.push('- JMeter TPS is not blockchain write TPS.');
  lines.push('');
  lines.push('## Run Metadata');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Run ID | \`${args.runId}\` |`);
  lines.push(`| JTL | \`${path.resolve(args.jtl)}\` |`);
  lines.push(`| Status | ${summary.passed ? 'PASS' : 'FAIL'} |`);
  lines.push('');
  lines.push('## Acceptance Criteria');
  lines.push('');
  lines.push('| Criterion | Required | Actual |');
  lines.push('|---|---:|---:|');
  lines.push(`| HTTP 2xx success rate | >= ${summary.thresholds.successRateMin}% | ${fmt(summary.overall.successRate)}% |`);
  lines.push(`| Error rate | < ${summary.thresholds.errorRateMax}% | ${fmt(summary.overall.errorRate)}% |`);
  lines.push(`| p95 latency | recorded | ${fmt(summary.overall.latencyMs.p95, 0)} ms |`);
  lines.push(`| Throughput | reference only | ${fmt(summary.overall.throughputPerSecond)} samples/sec |`);
  lines.push('');
  lines.push('## Overall Summary');
  lines.push('');
  lines.push('| Samples | 2xx success | Errors | Avg ms | p95 ms | p99 ms | Throughput/sec |');
  lines.push('|---:|---:|---:|---:|---:|---:|---:|');
  lines.push(`| ${summary.overall.totalSamples} | ${summary.overall.twoXxSuccess} | ${summary.overall.errors} | ${fmt(summary.overall.latencyMs.average, 0)} | ${fmt(summary.overall.latencyMs.p95, 0)} | ${fmt(summary.overall.latencyMs.p99, 0)} | ${fmt(summary.overall.throughputPerSecond)} |`);
  lines.push('');
  lines.push('## By Sampler');
  lines.push('');
  lines.push('| Label | Samples | 2xx success | Errors | Success rate | p95 ms | Throughput/sec |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const item of summary.byLabel) {
    lines.push(`| ${item.label} | ${item.totalSamples} | ${item.twoXxSuccess} | ${item.errors} | ${fmt(item.successRate)}% | ${fmt(item.latencyMs.p95, 0)} | ${fmt(item.throughputPerSecond)} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = parseJtl(args.jtl);
  const summary = summarize(rows, {
    successRateMin: args.successRateMin,
    errorRateMax: args.errorRateMax,
  });

  if (args.outJson) {
    fs.mkdirSync(path.dirname(path.resolve(args.outJson)), { recursive: true });
    fs.writeFileSync(args.outJson, `${JSON.stringify(summary, null, 2)}\n`);
  }
  if (args.outMd) {
    fs.mkdirSync(path.dirname(path.resolve(args.outMd)), { recursive: true });
    fs.writeFileSync(args.outMd, markdown(summary, args));
  }

  console.log(`JMETER_READONLY ${summary.passed ? 'PASS' : 'FAIL'} samples=${summary.overall.totalSamples} successRate=${fmt(summary.overall.successRate)} errorRate=${fmt(summary.overall.errorRate)} p95Ms=${fmt(summary.overall.latencyMs.p95, 0)} throughput=${fmt(summary.overall.throughputPerSecond)}`);
  process.exit(summary.passed ? 0 : 2);
}

try {
  main();
} catch (err) {
  console.error(`parse-jmeter-summary failed: ${err.message}`);
  process.exit(1);
}
