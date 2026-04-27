#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const EXPECTED_SEED_HEADER = 'dashboard-real-seed-data';
const EXPECTED_RECORD_COUNT = 100;
const EXPECTED_VALUES = Object.freeze([4, 13, 7, 16, 5, 18, 9, 14, 6, 8]);
const EVIDENCE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '.sisyphus',
  'evidence',
  'dashboard-real-seed-data',
  'task-3-api-buckets.json'
);

function fail(message) {
  console.error(`[verify-dashboard-seed] ${message}`);
  process.exit(1);
}

function assertFetchAvailable() {
  if (typeof fetch !== 'function') {
    fail('global fetch is not available. Use Node.js 18+; do not install node-fetch for this verifier.');
  }
}

function normalizeApiBase(value) {
  return String(value || 'http://127.0.0.1:3001').replace(/\/+$/, '');
}

async function readJsonResponse(response, label) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`${label} returned non-JSON response with status ${response.status}`);
  }
}

async function loginForToken(apiBase) {
  const userId = process.env.BMS_DEV_USER_ID;
  const password = process.env.BMS_DEV_PASSWORD;
  const orgNum = process.env.BMS_DEV_ORG_NUM || '1';

  if (!userId || !password) {
    fail('BMS_DEV_TOKEN is not set and BMS_DEV_USER_ID/BMS_DEV_PASSWORD credentials are incomplete.');
  }

  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password, orgNum }),
  });
  const payload = await readJsonResponse(response, 'POST /api/auth/login');

  if (!response.ok || !payload.token) {
    fail(`login failed with status ${response.status}`);
  }

  return payload.token;
}

async function resolveToken(apiBase) {
  if (process.env.BMS_DEV_TOKEN) {
    return process.env.BMS_DEV_TOKEN;
  }
  return loginForToken(apiBase);
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
}

function validateResponseContract(payload) {
  requireObject(payload, 'GET /api/passports response');

  if (!Array.isArray(payload.records)) {
    fail('GET /api/passports response.records must be an array');
  }
  if (!Object.prototype.hasOwnProperty.call(payload, 'bookmark')) {
    fail('GET /api/passports response.bookmark is required');
  }
  if (typeof payload.count !== 'number' || !Number.isFinite(payload.count)) {
    fail('GET /api/passports response.count must be numeric');
  }
  if (payload.records.length !== EXPECTED_RECORD_COUNT) {
    fail(`expected records.length ${EXPECTED_RECORD_COUNT}, received ${payload.records.length}`);
  }
  if (payload.count !== EXPECTED_RECORD_COUNT) {
    fail(`expected count ${EXPECTED_RECORD_COUNT}, received ${payload.count}`);
  }
}

function bucketCreatedAtByUtcDate(records) {
  return records.reduce((counts, record, index) => {
    if (!record || typeof record.createdAt !== 'string') {
      fail(`record ${index} is missing createdAt string`);
    }
    const date = new Date(record.createdAt);
    if (Number.isNaN(date.getTime())) {
      fail(`record ${index} has invalid createdAt: ${record.createdAt}`);
    }
    const dateKey = date.toISOString().slice(0, 10);
    counts[dateKey] = (counts[dateKey] || 0) + 1;
    return counts;
  }, {});
}

function validateBucketValues(records) {
  const bucketCounts = bucketCreatedAtByUtcDate(records);
  const values = Object.keys(bucketCounts).sort().map((date) => bucketCounts[date]);
  const expected = JSON.stringify(EXPECTED_VALUES);
  const actual = JSON.stringify(values);

  if (actual !== expected) {
    fail(`expected UTC createdAt bucket values ${expected}, received ${actual}`);
  }

  return { bucketCounts, values };
}

function validateSeedHeader(seedHeader) {
  if (process.env.BMS_DEV_EXPECT_SEED_HEADER === 'false') {
    return;
  }
  if (seedHeader !== EXPECTED_SEED_HEADER) {
    fail(`expected X-BMS-Dev-Seed ${EXPECTED_SEED_HEADER}, received ${seedHeader || '<missing>'}`);
  }
}

function writeEvidence(evidence) {
  fs.mkdirSync(path.dirname(EVIDENCE_PATH), { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
}

async function main() {
  assertFetchAvailable();

  const apiBase = normalizeApiBase(process.env.BMS_DEV_API_BASE);
  const token = await resolveToken(apiBase);
  const response = await fetch(`${apiBase}/api/passports?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await readJsonResponse(response, 'GET /api/passports?pageSize=100');

  if (!response.ok) {
    fail(`GET /api/passports?pageSize=100 failed with status ${response.status}`);
  }

  const seedHeader = response.headers.get('x-bms-dev-seed');
  validateSeedHeader(seedHeader);
  validateResponseContract(payload);
  const { bucketCounts, values } = validateBucketValues(payload.records);

  const evidence = {
    pass: true,
    recordCount: payload.records.length,
    values,
    bucketCounts,
    seedHeader,
    apiBase,
  };
  writeEvidence(evidence);
  console.log(`[verify-dashboard-seed] pass: ${payload.records.length} records, buckets ${JSON.stringify(values)}`);
}

main().catch((err) => {
  fail(err && err.message ? err.message : String(err));
});
