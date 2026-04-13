#!/usr/bin/env node
/**
 * Cloud Agent — 논문 VI장 Cloud Agent 구현
 *
 * 역할:
 * 1. Fabric Block Event 수신 → MongoDB에 원본 데이터 동기화
 * 2. REST API로 고속 조회 제공 (오프체인 read model)
 *
 * 아키텍처:
 * Fabric 원장 (신뢰 저장소) → Block Event → MongoDB (고속 읽기)
 *                                                ↑
 *                                           REST API 읽기
 */

require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const { connectGateway, startBlockListener } = require('./services/fabric-listener');

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3002', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'battery_passport';

let db = null;

// ============================================================
// REST API — 고속 조회 (MongoDB direct)
// ============================================================

// GET /api/passports — 여권 목록
app.get('/api/passports', async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || '100', 10), 500);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * pageSize;

    const collection = db.collection('passports');
    const [records, total] = await Promise.all([
      collection.find({ docType: 'batteryPassport' })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      collection.countDocuments({ docType: 'batteryPassport' }),
    ]);

    res.json({ records, total, page, pageSize });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/passports/:id — 여권 상세
app.get('/api/passports/:id', async (req, res) => {
  try {
    const passport = await db.collection('passports')
      .findOne({ passportId: req.params.id });
    if (!passport) {
      return res.status(404).json({ error: 'passport not found' });
    }
    res.json(passport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/passports/search — 여권 검색 (VIN, DID, model 등)
app.get('/api/passports/search', async (req, res) => {
  try {
    const { vin, did, model, manufacturer, status } = req.query;
    const filter = { docType: 'batteryPassport' };
    if (vin) filter.vin = vin;
    if (did) filter.did = did;
    if (model) filter.model = { $regex: model, $options: 'i' };
    if (manufacturer) filter.manufacturerName = { $regex: manufacturer, $options: 'i' };
    if (status) filter.status = status;

    const pageSize = Math.min(parseInt(req.query.pageSize || '100', 10), 500);
    const records = await db.collection('passports')
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(pageSize)
      .toArray();

    res.json({ records, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bmu/:passportId — BMU 데이터 조회
app.get('/api/bmu/:passportId', async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || '50', 10), 500);
    const records = await db.collection('bmuRecords')
      .find({ passportId: req.params.passportId, status: 'VALID' })
      .sort({ fc: -1 })
      .limit(pageSize)
      .toArray();

    res.json({ records, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/credentials/:passportId — VC 조회
app.get('/api/credentials/:passportId', async (req, res) => {
  try {
    const records = await db.collection('credentials')
      .find({ passportId: req.params.passportId })
      .sort({ issuedAt: -1 })
      .toArray();

    res.json({ records, count: records.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats — 통계 (대시보드용)
app.get('/api/stats', async (req, res) => {
  try {
    const [totalPassports, totalBmu, totalCredentials, statusCounts] = await Promise.all([
      db.collection('passports').countDocuments({ docType: 'batteryPassport' }),
      db.collection('bmuRecords').countDocuments({ status: 'VALID' }),
      db.collection('credentials').countDocuments(),
      db.collection('passports').aggregate([
        { $match: { docType: 'batteryPassport' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    res.json({
      totalPassports,
      totalBmu,
      totalCredentials,
      statusCounts: Object.fromEntries(statusCounts.map(s => [s._id, s.count])),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: db ? 'connected' : 'disconnected' });
});

// ============================================================
// Startup
// ============================================================

async function createIndexes() {
  // Passports
  const passports = db.collection('passports');
  await passports.createIndex({ passportId: 1 }, { unique: true });
  await passports.createIndex({ docType: 1, status: 1 });
  await passports.createIndex({ did: 1 });
  await passports.createIndex({ vin: 1 });
  await passports.createIndex({ updatedAt: -1 });
  await passports.createIndex({ manufacturerName: 1, model: 1 });

  // BMU Records
  const bmu = db.collection('bmuRecords');
  await bmu.createIndex({ recordId: 1 }, { unique: true });
  await bmu.createIndex({ passportId: 1, fc: -1 });
  await bmu.createIndex({ did: 1, fc: -1 });

  // Credentials
  const creds = db.collection('credentials');
  await creds.createIndex({ credentialId: 1 }, { unique: true });
  await creds.createIndex({ passportId: 1 });
  await creds.createIndex({ issuerMsp: 1, credType: 1 });

  console.log('[cloud-agent] MongoDB indexes created');
}

async function main() {
  // 1. MongoDB 연결
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB);
  console.log(`[cloud-agent] MongoDB connected: ${MONGODB_DB}`);

  // 2. 인덱스 생성
  await createIndexes();

  // 3. Fabric Block Event Listener 시작
  try {
    const gateway = await connectGateway();
    await startBlockListener(gateway, db);
    console.log('[cloud-agent] Fabric block listener started');
  } catch (err) {
    console.error('[cloud-agent] Fabric listener failed (will retry):', err.message);
    // 리스너 실패해도 API는 동작 — 기존 데이터 조회 가능
  }

  // 4. Express 서버 시작
  app.listen(PORT, () => {
    console.log(`[cloud-agent] Cloud Agent started: http://localhost:${PORT}`);
    console.log('[cloud-agent] Architecture: Fabric → Block Event → MongoDB → REST API');
  });
}

main().catch(err => {
  console.error('[cloud-agent] Fatal:', err);
  process.exit(1);
});
