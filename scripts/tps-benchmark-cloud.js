#!/usr/bin/env node
/**
 * TPS Benchmark — Cloud Agent (MongoDB) 읽기 + Fabric 쓰기 측정
 */

const http = require('http');

const CLOUD_BASE = 'http://localhost:3002';
const FABRIC_BASE = 'http://localhost:3001';
const READ_CONCURRENCY = 200;
const READ_TOTAL = 5000;
const WRITE_CONCURRENCY = 20;
const WRITE_TOTAL = 200;

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
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
  const res = await request(`${FABRIC_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'admin', password: 'REMOVED_SECRET_ROTATED_2026_04_18', orgNum: 1 }),
  });
  return JSON.parse(res.data).token;
}

async function benchCloudRead() {
  console.log(`\n=== CLOUD READ BENCHMARK (MongoDB, target: 1500+ TPS) ===`);
  console.log(`Endpoint: GET ${CLOUD_BASE}/api/passports/PASSPORT-BMU-DEVICE`);
  console.log(`Total: ${READ_TOTAL}, Concurrency: ${READ_CONCURRENCY}\n`);

  let completed = 0;
  let errors = 0;
  const start = Date.now();

  async function worker() {
    while (completed + errors < READ_TOTAL) {
      try {
        const res = await request(`${CLOUD_BASE}/api/passports/PASSPORT-BMU-DEVICE`);
        if (res.status === 200) completed++;
        else errors++;
      } catch { errors++; }
    }
  }

  await Promise.all(Array.from({ length: READ_CONCURRENCY }, () => worker()));
  const elapsed = (Date.now() - start) / 1000;
  const tps = completed / elapsed;

  console.log(`✓ Completed: ${completed}, Errors: ${errors}`);
  console.log(`✓ Elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`✓ CLOUD READ TPS: ${tps.toFixed(1)}`);
  console.log(`✓ Target: 1500 TPS → ${tps >= 1500 ? 'PASS ✓' : 'FAIL ✗'}`);
  return tps;
}

async function benchFabricRead() {
  const token = await login();
  console.log(`\n=== FABRIC READ BENCHMARK (CouchDB, baseline) ===`);
  console.log(`Endpoint: GET ${FABRIC_BASE}/api/passports/PASSPORT-BMU-DEVICE`);
  console.log(`Total: 2000, Concurrency: 50\n`);

  let completed = 0;
  let errors = 0;
  const start = Date.now();

  async function worker() {
    while (completed + errors < 2000) {
      try {
        const res = await request(`${FABRIC_BASE}/api/passports/PASSPORT-BMU-DEVICE`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 200) completed++;
        else errors++;
      } catch { errors++; }
    }
  }

  await Promise.all(Array.from({ length: 50 }, () => worker()));
  const elapsed = (Date.now() - start) / 1000;
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

  let completed = 0;
  let errors = 0;
  let mvcc = 0;
  const start = Date.now();

  async function worker(id) {
    while (completed + errors < WRITE_TOTAL) {
      const seq = completed + errors;
      try {
        const res = await request(`${FABRIC_BASE}/api/passports`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
  const elapsed = (Date.now() - start) / 1000;
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
  const fabricRead = await benchFabricRead();
  const fabricWrite = await benchFabricWrite();

  console.log('\n========== SUMMARY ==========');
  console.log(`CLOUD READ (MongoDB):  ${cloudRead.toFixed(1)} TPS (target: 1500)`);
  console.log(`FABRIC READ (CouchDB): ${fabricRead.toFixed(1)} TPS (baseline)`);
  console.log(`FABRIC WRITE:          ${fabricWrite.toFixed(1)} TPS (target: 150)`);
  console.log('=============================');
}

main().catch(console.error);
