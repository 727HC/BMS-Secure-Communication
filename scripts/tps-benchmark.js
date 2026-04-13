#!/usr/bin/env node
/**
 * TPS Benchmark — Fabric 읽기/쓰기 성능 측정
 * 사용법: cd bmu-agent && node ../scripts/tps-benchmark.js
 */

const axios = require('axios');

const BASE = 'http://localhost:3001';
const READ_CONCURRENCY = 50;   // 동시 읽기 요청 수
const WRITE_CONCURRENCY = 20;  // 동시 쓰기 요청 수
const READ_TOTAL = 2000;       // 총 읽기 요청 수
const WRITE_TOTAL = 200;       // 총 쓰기 요청 수

let token = null;

async function login() {
  const res = await axios.post(`${BASE}/api/auth/login`, {
    userId: 'admin', password: 'REMOVED_SECRET_ROTATED_2026_04_18', orgNum: 1,
  });
  token = res.data.token;
  console.log('Logged in as admin (ManufacturerMSP)');
}

function headers() {
  return { Authorization: `Bearer ${token}` };
}

// --- Read Benchmark ---
async function benchRead() {
  // 먼저 여권 목록에서 ID 하나 가져오기
  const listRes = await axios.get(`${BASE}/api/passports?pageSize=1`, { headers: headers() });
  const passports = listRes.data.records || listRes.data;
  if (!passports || passports.length === 0) {
    console.log('⚠ No passports found. Create some first.');
    return;
  }
  const passportId = passports[0].passportId;
  console.log(`\n=== READ BENCHMARK (target: 2000 TPS) ===`);
  console.log(`Endpoint: GET /api/passports/${passportId}`);
  console.log(`Total: ${READ_TOTAL}, Concurrency: ${READ_CONCURRENCY}\n`);

  let completed = 0;
  let errors = 0;
  const start = Date.now();

  // Worker pool
  async function worker() {
    while (completed + errors < READ_TOTAL) {
      try {
        await axios.get(`${BASE}/api/passports/${passportId}`, { headers: headers() });
        completed++;
      } catch {
        errors++;
      }
    }
  }

  const workers = Array.from({ length: READ_CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const elapsed = (Date.now() - start) / 1000;
  const tps = completed / elapsed;
  console.log(`✓ Completed: ${completed}, Errors: ${errors}`);
  console.log(`✓ Elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`✓ READ TPS: ${tps.toFixed(1)}`);
  console.log(`✓ Target: 2000 TPS → ${tps >= 2000 ? 'PASS ✓' : 'FAIL ✗'}`);
  return tps;
}

// --- Write Benchmark ---
async function benchWrite() {
  console.log(`\n=== WRITE BENCHMARK (target: 200 TPS) ===`);
  console.log(`Endpoint: POST /api/passports (CreateBatteryPassport)`);
  console.log(`Total: ${WRITE_TOTAL}, Concurrency: ${WRITE_CONCURRENCY}\n`);

  let completed = 0;
  let errors = 0;
  let mvccConflicts = 0;
  const start = Date.now();

  async function worker(id) {
    while (completed + errors < WRITE_TOTAL) {
      const seq = completed + errors;
      try {
        await axios.post(`${BASE}/api/passports`, {
          passportId: `BENCH-W-${Date.now()}-${id}-${seq}`,
          batteryId: `BAT-BENCH-${seq}`,
          did: `did:bench:${seq}`,
          serialNumber: `SN-BENCH-${seq}`,
          model: 'Benchmark',
          manufacturerName: 'BenchCorp',
          manufactureCountry: 'KR',
          cellType: 'LFP',
          chemistry: 'LiFePO4',
          cellCount: 96,
          weight: 450,
          totalEnergy: 60,
          ratedCapacity: 150,
        }, { headers: headers() });
        completed++;
      } catch (err) {
        errors++;
        if (err.response?.data?.error?.includes('MVCC')) mvccConflicts++;
      }
    }
  }

  const workers = Array.from({ length: WRITE_CONCURRENCY }, (_, i) => worker(i));
  await Promise.all(workers);

  const elapsed = (Date.now() - start) / 1000;
  const tps = completed / elapsed;
  console.log(`✓ Completed: ${completed}, Errors: ${errors} (MVCC: ${mvccConflicts})`);
  console.log(`✓ Elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`✓ WRITE TPS: ${tps.toFixed(1)}`);
  console.log(`✓ Target: 200 TPS → ${tps >= 200 ? 'PASS ✓' : 'FAIL ✗'}`);
  return tps;
}

// --- Main ---
async function main() {
  console.log('=== TPS Benchmark ===');
  console.log(`Server: ${BASE}\n`);

  try {
    await login();
  } catch (err) {
    console.error('Login failed:', err.message);
    process.exit(1);
  }

  const readTps = await benchRead();
  const writeTps = await benchWrite();

  console.log('\n=== SUMMARY ===');
  console.log(`READ:  ${readTps?.toFixed(1) || 'N/A'} TPS (target: 2000)`);
  console.log(`WRITE: ${writeTps?.toFixed(1) || 'N/A'} TPS (target: 200)`);
}

main().catch(console.error);
