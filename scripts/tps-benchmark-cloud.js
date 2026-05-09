#!/usr/bin/env node
/**
 * TPS Benchmark — Cloud Agent (MongoDB) 읽기 + Fabric 쓰기 측정
 */

const http = require('http');
const { performance } = require('perf_hooks');

const CLOUD_BASE = 'http://localhost:3002';
const FABRIC_BASE = 'http://localhost:3001';
const CLOUD_READ_TARGET_TPS = parseInt(process.env.BENCH_CLOUD_READ_TARGET_TPS || '2000', 10);
const READ_CONCURRENCY = 200;
const READ_TOTAL = 5000;
const WRITE_CONCURRENCY = 20;
const WRITE_TOTAL = 200;
const INCLUDE_FABRIC_BASELINE = process.env.BENCH_INCLUDE_FABRIC_BASELINE === 'true';
const cloudHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: READ_CONCURRENCY,
  maxFreeSockets: READ_CONCURRENCY,
});
const fabricHttpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: Math.max(READ_CONCURRENCY, WRITE_CONCURRENCY),
  maxFreeSockets: Math.max(50, WRITE_CONCURRENCY),
});

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: options.agent,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function login() {
  const userId = process.env.BENCH_USER;
  const password = process.env.BENCH_PASSWORD;
  const orgNum = parseInt(process.env.BENCH_ORG || '1', 10);
  if (!userId || !password) {
    throw new Error('BENCH_USER and BENCH_PASSWORD env vars must be set');
  }
  const res = await request(`${FABRIC_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password, orgNum }),
  });
  return JSON.parse(res.data).token;
}

async function benchCloudRead() {
  console.log(`\n=== CLOUD READ BENCHMARK (MongoDB, target: ${CLOUD_READ_TARGET_TPS}+ TPS) ===`);
  console.log(`Endpoint: GET ${CLOUD_BASE}/api/passports/PASSPORT-BMU-DEVICE`);
  console.log(`Total: ${READ_TOTAL}, Concurrency: ${READ_CONCURRENCY}\n`);

  let issued = 0;
  let completed = 0;
  let errors = 0;
  const start = performance.now();

  async function worker() {
    while (true) {
      const seq = issued++;
      if (seq >= READ_TOTAL) break;
      try {
        const res = await request(`${CLOUD_BASE}/api/passports/PASSPORT-BMU-DEVICE`, {
          agent: cloudHttpAgent,
        });
        if (res.status === 200) completed++;
        else errors++;
      } catch { errors++; }
    }
  }

  await Promise.all(Array.from({ length: READ_CONCURRENCY }, () => worker()));
  const elapsed = (performance.now() - start) / 1000;
  const tps = completed / elapsed;

  console.log(`✓ Completed: ${completed}, Errors: ${errors}`);
  console.log(`✓ Elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`✓ CLOUD READ TPS: ${tps.toFixed(1)}`);
  console.log(`✓ Target: ${CLOUD_READ_TARGET_TPS} TPS → ${tps >= CLOUD_READ_TARGET_TPS ? 'PASS ✓' : 'FAIL ✗'}`);
  return tps;
}

async function benchFabricRead() {
  const token = await login();
  console.log(`\n=== FABRIC READ BENCHMARK (CouchDB, baseline) ===`);
  console.log(`Endpoint: GET ${FABRIC_BASE}/api/passports/PASSPORT-BMU-DEVICE`);
  console.log(`Total: 2000, Concurrency: 50\n`);

  let issued = 0;
  let completed = 0;
  let errors = 0;
  const start = performance.now();

  async function worker() {
    while (true) {
      const seq = issued++;
      if (seq >= 2000) break;
      try {
        const res = await request(`${FABRIC_BASE}/api/passports/PASSPORT-BMU-DEVICE`, {
          headers: { Authorization: `Bearer ${token}` },
          agent: fabricHttpAgent,
        });
        if (res.status === 200) completed++;
        else errors++;
      } catch { errors++; }
    }
  }

  await Promise.all(Array.from({ length: 50 }, () => worker()));
  const elapsed = (performance.now() - start) / 1000;
  const tps = completed / elapsed;

  console.log(`✓ Completed: ${completed}, Errors: ${errors}`);
  console.log(`✓ Elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`✓ FABRIC READ TPS: ${tps.toFixed(1)}`);
  return tps;
}

async function benchFabricWrite() {
  const token = await login();
  console.log(`\n=== FABRIC WRITE BENCHMARK (target: 150+ TPS) ===`);
  console.log(`Endpoint: POST ${FABRIC_BASE}/api/passports`);
  console.log(`Total: ${WRITE_TOTAL}, Concurrency: ${WRITE_CONCURRENCY}\n`);

  let issued = 0;
  let completed = 0;
  let errors = 0;
  let mvcc = 0;
  const start = performance.now();

  async function worker(id) {
    while (true) {
      const seq = issued++;
      if (seq >= WRITE_TOTAL) break;
      try {
        const res = await request(`${FABRIC_BASE}/api/passports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          agent: fabricHttpAgent,
          body: JSON.stringify({
            passportId: `TPS-${Date.now()}-${id}-${seq}`,
            batteryId: `BAT-TPS-${seq}`,
            did: `did:tps:${seq}`,
            serialNumber: `SN-TPS-${seq}`,
            model: 'TPS-Test',
            manufacturerName: 'TPSCorp',
            cellType: 'LFP',
            chemistry: 'LiFePO4',
            cellCount: 96,
            weight: 450,
          }),
        });
        if (res.status === 200) completed++;
        else {
          errors++;
          if (res.data.includes('MVCC')) mvcc++;
        }
      } catch { errors++; }
    }
  }

  await Promise.all(Array.from({ length: WRITE_CONCURRENCY }, (_, i) => worker(i)));
  const elapsed = (performance.now() - start) / 1000;
  const tps = completed / elapsed;

  console.log(`✓ Completed: ${completed}, Errors: ${errors} (MVCC: ${mvcc})`);
  console.log(`✓ Elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`✓ WRITE TPS: ${tps.toFixed(1)}`);
  console.log(`✓ Target: 150 TPS → ${tps >= 150 ? 'PASS ✓' : 'FAIL ✗'}`);
  return tps;
}

async function main() {
  console.log('=== TPS Benchmark (Cloud + Fabric) ===\n');

  const cloudRead = await benchCloudRead();
  let fabricRead = null;
  let fabricWrite = null;
  if (INCLUDE_FABRIC_BASELINE) {
    fabricRead = await benchFabricRead();
    fabricWrite = await benchFabricWrite();
  } else {
    console.log('\n=== FABRIC BASELINE SKIPPED ===');
    console.log('Set BENCH_INCLUDE_FABRIC_BASELINE=true to run Fabric API read/write baselines.');
  }

  console.log('\n========== SUMMARY ==========');
  console.log(`CLOUD READ (MongoDB):  ${cloudRead.toFixed(1)} TPS (target: ${CLOUD_READ_TARGET_TPS})`);
  if (fabricRead !== null) console.log(`FABRIC READ (CouchDB): ${fabricRead.toFixed(1)} TPS (baseline)`);
  if (fabricWrite !== null) console.log(`FABRIC WRITE:          ${fabricWrite.toFixed(1)} TPS (target: 150)`);
  console.log('=============================');
}

main().catch(console.error);
