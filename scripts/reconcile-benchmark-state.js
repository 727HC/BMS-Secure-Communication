#!/usr/bin/env node
'use strict';

// Reconcile Caliper's reported write count with benchmark world-state evidence.
// This script is intentionally read-only: it queries CouchDB and peer heights,
// and summarizes optional txmap JSONL files emitted by the Caliper workload.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { keyPrefix } = require('../caliper-workspace/caliperIds');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      throw new Error(`unknown positional argument: ${arg}`);
    }
    const key = arg.slice(2);
    if (key.startsWith('no-')) {
      out[key.slice(3)] = false;
      continue;
    }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

function repoRoot() {
  return path.resolve(__dirname, '..');
}

function loadEnvFile(file) {
  const env = {};
  if (!file || !fs.existsSync(file)) {
    return env;
  }
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const idx = line.indexOf('=');
    const name = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[name] = value;
  }
  return env;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readCsv(file) {
  if (!file || !fs.existsSync(file)) {
    return [];
  }
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((name, idx) => { row[name] = cells[idx] || ''; });
    return row;
  });
}

function listJsonlFiles(dir) {
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }
  const result = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        result.push(full);
      }
    }
  };
  walk(dir);
  return result.sort();
}

function summarizeTxmap(dir, runId) {
  const files = listJsonlFiles(dir);
  const summary = {
    dir: dir || null,
    files: files.length,
    lines: 0,
    matchingRunLines: 0,
    uniqueRecordIds: 0,
    uniqueTxIds: 0,
    statusCounts: {},
    verifiedCounts: {},
    errorCount: 0,
    successVerifiedCount: 0,
    parseErrors: 0,
    sampleErrors: [],
  };
  const recordIds = new Set();
  const txids = new Set();
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      summary.lines++;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch (error) {
        summary.parseErrors++;
        continue;
      }
      if (runId && obj.runId !== runId) {
        continue;
      }
      summary.matchingRunLines++;
      if (obj.recordId) {
        recordIds.add(obj.recordId);
      }
      if (obj.txid) {
        txids.add(obj.txid);
      }
      const status = obj.status === null || obj.status === undefined ? '<null>' : String(obj.status);
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + 1;
      const verified = obj.verified === null || obj.verified === undefined ? '<null>' : String(obj.verified);
      summary.verifiedCounts[verified] = (summary.verifiedCounts[verified] || 0) + 1;
      if (obj.error) {
        summary.errorCount++;
        if (summary.sampleErrors.length < 5) {
          summary.sampleErrors.push(String(obj.error).slice(0, 500));
        }
      }
      if (obj.status === 'success' && obj.verified === true && !obj.error) {
        summary.successVerifiedCount++;
      }
    }
  }
  summary.uniqueRecordIds = recordIds.size;
  summary.uniqueTxIds = txids.size;
  return summary;
}

function txmapRunKey(obj) {
  if (obj.recordEpoch) {
    return String(obj.recordEpoch);
  }
  const recordId = obj.recordId || '';
  const match = recordId.match(/-(r\d+)-/);
  return match ? match[1] : 'unknown';
}

function compareRunKeys(a, b) {
  const parse = (value) => {
    const match = String(value).match(/^r(\d+)$/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };
  const av = parse(a);
  const bv = parse(b);
  if (av !== bv) {
    return av - bv;
  }
  return String(a).localeCompare(String(b));
}

function summarizeTxmapByRepeat(dir, runId) {
  const files = listJsonlFiles(dir);
  const runs = new Map();
  const ensureRun = (key) => {
    if (!runs.has(key)) {
      runs.set(key, {
        run: key,
        lines: 0,
        succ: 0,
        fail: 0,
        verifiedTrue: 0,
        errors: 0,
        uniqueTxIds: new Set(),
        uniqueRecordIds: new Set(),
        minStart: null,
        maxEnd: null,
      });
    }
    return runs.get(key);
  };

  let parseErrors = 0;
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      let obj;
      try {
        obj = JSON.parse(line);
      } catch (_error) {
        parseErrors++;
        continue;
      }
      if (runId && obj.runId !== runId) {
        continue;
      }
      const run = ensureRun(txmapRunKey(obj));
      run.lines++;
      if (obj.txid) {
        run.uniqueTxIds.add(obj.txid);
      }
      if (obj.recordId) {
        run.uniqueRecordIds.add(obj.recordId);
      }
      if (obj.verified === true) {
        run.verifiedTrue++;
      }
      if (obj.status === 'success' && obj.verified === true && !obj.error) {
        run.succ++;
      } else {
        run.fail++;
        if (obj.error) {
          run.errors++;
        }
      }
      if (Number.isInteger(obj.tsStart)) {
        run.minStart = run.minStart === null ? obj.tsStart : Math.min(run.minStart, obj.tsStart);
      }
      if (Number.isInteger(obj.tsEnd)) {
        run.maxEnd = run.maxEnd === null ? obj.tsEnd : Math.max(run.maxEnd, obj.tsEnd);
      }
    }
  }

  const resultRuns = [...runs.values()]
    .sort((a, b) => compareRunKeys(a.run, b.run))
    .map((run) => {
      let durationSeconds = null;
      let callbackTps = null;
      if (run.minStart !== null && run.maxEnd !== null && run.maxEnd > run.minStart) {
        durationSeconds = (run.maxEnd - run.minStart) / 1000;
        callbackTps = run.succ / durationSeconds;
      }
      return {
        run: run.run,
        lines: run.lines,
        succ: run.succ,
        fail: run.fail,
        verifiedTrue: run.verifiedTrue,
        errors: run.errors,
        uniqueTxIds: run.uniqueTxIds.size,
        uniqueRecordIds: run.uniqueRecordIds.size,
        durationSeconds,
        callbackTps,
      };
    });

  return {
    basis: 'caliper_sendRequests_txmap_callback',
    dir: dir || null,
    files: files.length,
    parseErrors,
    runs: resultRuns,
    allRunsSuccessVerified: resultRuns.length > 0 && resultRuns.every((run) => (
      run.lines > 0
      && run.succ === run.lines
      && run.fail === 0
      && run.verifiedTrue === run.lines
      && run.errors === 0
      && run.uniqueTxIds === run.lines
      && run.uniqueRecordIds === run.lines
    )),
  };
}

function dockerExecJson(container, args, allowFailure = false) {
  const res = spawnSync('docker', ['exec', container, ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  if (res.status !== 0) {
    if (allowFailure) {
      return { error: (res.stderr || res.stdout || `exit ${res.status}`).trim() };
    }
    throw new Error(`docker exec ${container} failed: ${(res.stderr || res.stdout || `exit ${res.status}`).trim()}`);
  }
  try {
    return JSON.parse(res.stdout);
  } catch (error) {
    if (allowFailure) {
      return { error: `invalid JSON: ${error.message}`, raw: res.stdout.slice(0, 1000) };
    }
    throw error;
  }
}

function dockerExecText(container, args, allowFailure = false) {
  const res = spawnSync('docker', ['exec', container, ...args], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 16,
  });
  if (res.status !== 0) {
    if (allowFailure) {
      return { error: (res.stderr || res.stdout || `exit ${res.status}`).trim() };
    }
    throw new Error(`docker exec ${container} failed: ${(res.stderr || res.stdout || `exit ${res.status}`).trim()}`);
  }
  return { text: res.stdout };
}

function couchGet(couch, user, password, urlPath, query = {}) {
  const qs = new URLSearchParams(query).toString();
  const url = `http://127.0.0.1:5984/${urlPath}${qs ? `?${qs}` : ''}`;
  return dockerExecJson(couch, ['curl', '-fsS', '-u', `${user}:${password}`, url], true);
}

function discoverDb(couch, user, password, channel, chaincode) {
  const allDbs = couchGet(couch, user, password, '_all_dbs');
  if (allDbs.error) {
    return { error: allDbs.error };
  }
  const dbs = Array.isArray(allDbs) ? allDbs : [];
  const exact = `${channel}_${chaincode}`.toLowerCase();
  const foundExact = dbs.find((db) => db === exact);
  if (foundExact) {
    return { db: foundExact, candidates: [foundExact] };
  }
  const candidates = dbs.filter((db) => db.includes(channel.toLowerCase()) && db.includes(chaincode.toLowerCase()));
  return { db: candidates[0] || null, candidates };
}

function summarizeCouch({ couch, user, password, channel, chaincode, recordPrefix, expected }) {
  const found = discoverDb(couch, user, password, channel, chaincode);
  if (found.error || !found.db) {
    return {
      couch,
      db: found.db || null,
      candidates: found.candidates || [],
      error: found.error || 'benchmark chaincode DB not found',
    };
  }
  const limit = String(Math.max(Number(expected || 0) + 1000, 1000));
  const body = couchGet(couch, user, password, `${encodeURIComponent(found.db)}/_all_docs`, {
    startkey: JSON.stringify(recordPrefix),
    endkey: JSON.stringify(`${recordPrefix}\ufff0`),
    limit,
  });
  if (body.error) {
    return { couch, db: found.db, candidates: found.candidates || [], error: body.error };
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  return {
    couch,
    db: found.db,
    candidates: found.candidates || [found.db],
    recordPrefix,
    count: rows.length,
    limited: rows.length >= Number(limit),
    first: rows[0] ? rows[0].id : null,
    last: rows[rows.length - 1] ? rows[rows.length - 1].id : null,
  };
}

function summarizePeerHeight(peer, channel) {
  const result = dockerExecText(peer, ['peer', 'channel', 'getinfo', '-c', channel], true);
  if (result.error) {
    return { peer, error: result.error };
  }
  const match = result.text.match(/Blockchain info:\s*(\{.*\})/s);
  if (!match) {
    return { peer, error: 'unable to parse peer channel getinfo output', raw: result.text.slice(0, 1000) };
  }
  try {
    const info = JSON.parse(match[1]);
    return { peer, height: info.height, currentBlockHash: info.currentBlockHash || null, previousBlockHash: info.previousBlockHash || null };
  } catch (error) {
    return { peer, error: `invalid getinfo JSON: ${error.message}`, raw: match[1].slice(0, 1000) };
  }
}

function classify({ caliper, couchdb, txmap, expected }) {
  const expectedNum = Number(expected || 0);
  const succ = Number(caliper && caliper.succ !== undefined ? caliper.succ : NaN);
  const fail = Number(caliper && caliper.fail !== undefined ? caliper.fail : NaN);
  const reject = Number(caliper && caliper.reject !== undefined ? caliper.reject : NaN);
  const couchCounts = couchdb.map((c) => c.count).filter((v) => Number.isFinite(v));
  const allCouchExpected = expectedNum > 0 && couchCounts.length > 0 && couchCounts.every((v) => v === expectedNum);
  const anyCouchBelow = expectedNum > 0 && couchCounts.some((v) => v < expectedNum);
  const txmapExpected = expectedNum > 0 && txmap && txmap.matchingRunLines === expectedNum;
  const txmapVerifiedExpected = expectedNum > 0 && txmap && txmap.successVerifiedCount === expectedNum;

  if (Number.isFinite(succ) && expectedNum > 0 && succ === expectedNum && fail === 0 && reject === 0 && allCouchExpected) {
    return 'ledger_matches_caliper_success';
  }
  if (Number.isFinite(succ) && expectedNum > 0 && succ < expectedNum && fail === 0 && reject === 0) {
    if (allCouchExpected && txmapVerifiedExpected) {
      return 'caliper_reporter_aggregation_artifact';
    }
    if (allCouchExpected && txmapExpected) {
      return 'caliper_event_or_accounting_artifact';
    }
    if (allCouchExpected) {
      return 'caliper_event_or_accounting_artifact_couchdb_only';
    }
    if (txmapVerifiedExpected) {
      return 'caliper_reporter_aggregation_artifact_txmap_only';
    }
  }
  if (anyCouchBelow) {
    return 'world_state_missing_or_lagging';
  }
  return 'inconclusive';
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const env = {
    ...loadEnvFile(path.join(root, 'passport-network/.env')),
    ...process.env,
  };

  const runId = args['run-id'] || env.CALIPER_RUN_ID || env.RUN_ID;
  const channel = args.channel || env.CHANNEL_NAME;
  if (!runId) throw new Error('--run-id or CALIPER_RUN_ID/RUN_ID is required');
  if (!channel) throw new Error('--channel or CHANNEL_NAME is required');

  const chaincode = args.chaincode || env.CHAINCODE_NAME || 'passport-contract';
  const expected = Number(args.expected || env.CALIPER_WRITE_TX_NUMBER || env.WRITE_TX_NUMBER || 0);
  const evidenceDir = args['evidence-dir'] || env.EVIDENCE_ROOT || process.cwd();
  const output = args.output || path.join(evidenceDir, 'ledger-reconciliation.json');
  const txmapDir = args['txmap-dir'] || env.CALIPER_TXMAP_DIR || '';
  const summaryPath = args.summary || path.join(evidenceDir, 'summary.json');
  const csvPath = args.csv || path.join(evidenceDir, 'repeat-results.csv');
  const recordPrefix = args['record-prefix'] || `B-CAL-${keyPrefix(runId)}-`;
  const skipCouchdb = args['skip-couchdb'] === true || args.couchdb === false;
  const skipPeerHeights = args['skip-peer-heights'] === true || args['peer-heights'] === false;

  const summarizeCsvRows = (rows) => {
    if (rows.length === 0) {
      return null;
    }
    const totalExpected = rows.reduce((sum, row) => sum + Number(row.expected || 0), 0);
    if (expected && totalExpected !== expected) {
      return { csvPath, repeatRunCount: rows.length, totalExpected, note: 'CSV total expected does not match reconciliation expected; not aggregating Caliper counts for this group' };
    }
    return {
      csvPath,
      repeatRunCount: rows.length,
      expected: totalExpected,
      succ: rows.reduce((sum, row) => sum + Number(row.succ || 0), 0),
      fail: rows.reduce((sum, row) => sum + Number(row.fail || 0), 0),
      reject: rows.reduce((sum, row) => sum + Number(row.reject || 0), 0),
      minSuccessfulTps: Math.min(...rows.map((row) => Number(row.successful_tps || 0))),
    };
  };

  let caliper = {};
  if (fs.existsSync(summaryPath)) {
    const summary = readJson(summaryPath);
    const run = Array.isArray(summary.runs) && summary.runs.length === 1 ? summary.runs[0] : null;
    caliper = {
      summaryPath,
      repeatRunCount: summary.repeatRunCount,
      allRunsSuccExpected: summary.allRunsSuccExpected,
      allRunsFailZero: summary.allRunsFailZero,
      allRunsRejectZero: summary.allRunsRejectZero,
      p50Tps: summary.p50Tps,
      minTps: summary.minTps,
      succ: run ? Number(run.succ) : undefined,
      fail: run ? Number(run.fail) : undefined,
      reject: run ? Number(run.reject) : undefined,
    };
    if (caliper.succ === undefined) {
      const csvSummary = summarizeCsvRows(readCsv(csvPath));
      if (csvSummary) {
        caliper = { ...caliper, ...csvSummary };
      }
    }
  } else {
    caliper = summarizeCsvRows(readCsv(csvPath)) || {};
  }

  const txmap = summarizeTxmap(txmapDir, runId);
  const txmapRepeatSummary = summarizeTxmapByRepeat(txmapDir, runId);
  const outputBase = path.basename(output);
  const txmapRepeatBase = outputBase.startsWith('ledger-reconciliation')
    ? outputBase.replace(/^ledger-reconciliation/, 'txmap-repeat-summary')
    : `${path.basename(outputBase, path.extname(outputBase))}-txmap-repeat-summary.json`;
  const txmapRepeatOutput = args['txmap-repeat-output'] || path.join(path.dirname(output), txmapRepeatBase);

  let couchdb = [];
  if (!skipCouchdb) {
    const user = args['couchdb-user'] || env.COUCHDB_USER || 'admin';
    const password = args['couchdb-password'] || env.COUCHDB_PASSWORD || 'password';
    couchdb = ['couchdb0', 'couchdb1', 'couchdb2', 'couchdb3'].map((couch) => summarizeCouch({
      couch,
      user,
      password,
      channel,
      chaincode,
      recordPrefix,
      expected,
    }));
  }

  let peerHeights = [];
  if (!skipPeerHeights) {
    peerHeights = [
      'peer0.manufacturer.battery.com',
      'peer0.evmanufacturer.battery.com',
      'peer0.service.battery.com',
      'peer0.regulator.battery.com',
    ].map((peer) => summarizePeerHeight(peer, channel));
  }

  const result = {
    generatedAt: new Date().toISOString(),
    runId,
    channel,
    chaincode,
    expected: expected || null,
    recordPrefix,
    caliper,
    txmap,
    txmapRepeatSummary,
    couchdb,
    peerHeights,
  };
  result.classification = classify({ caliper, couchdb, txmap, expected });

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(txmapRepeatOutput, `${JSON.stringify(txmapRepeatSummary, null, 2)}\n`);
  result.txmapRepeatSummaryPath = txmapRepeatOutput;
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
