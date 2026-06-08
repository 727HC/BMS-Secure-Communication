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
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const { connectGateway, startBlockListener } = require('./services/fabric-listener');

const app = express();
app.disable('x-powered-by');
app.set('etag', false);
app.set('query parser', 'simple'); // CA-1: qs 중첩객체 파싱 비활성 (NoSQL 연산자 주입 차단)
// CA-6: 리버스 프록시 뒤일 때만 TRUST_PROXY로 활성 (rate-limit이 실제 클라 IP를 키로 쓰도록)
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY);
app.use(express.json({ limit: '64kb' })); // M-5: body size 명시
app.use(helmet());                         // H-1: 보안 헤더

// M-2: CORS — ALLOWED_ORIGINS 환경변수로 허용 오리진 제한, 미설정 시 모두 차단
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// H-2: rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests' },
}));

const PORT = parseInt(process.env.PORT || '3002', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'battery_passport';
const API_KEY = process.env.CLOUD_AGENT_API_KEY || '';
const MONGO_MAX_POOL_SIZE = parseInt(process.env.MONGO_MAX_POOL_SIZE || '500', 10);
const MONGO_MIN_POOL_SIZE = parseInt(process.env.MONGO_MIN_POOL_SIZE || '20', 10);
const LISTENER_ENABLED = process.env.CLOUD_AGENT_LISTENER_ENABLED !== 'false';
const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'passportchannel';
const READ_MODEL_PROVENANCE = process.env.CLOUD_READ_MODEL_PROVENANCE || 'channel-bound';
const PASSPORT_DETAIL_CACHE_TTL_MS = parseInt(process.env.PASSPORT_DETAIL_CACHE_TTL_MS || '1000', 10);
const PASSPORT_DETAIL_CACHE_MAX = parseInt(process.env.PASSPORT_DETAIL_CACHE_MAX || '10000', 10); // CA-3: 캐시 엔트리 상한
const passportDetailCache = new Map();
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';

// H-8: production에서 MongoDB 인증 없는 URI 거부
if (process.env.NODE_ENV === 'production' && !MONGODB_URI.includes('@')) {
  console.error('[cloud-agent] FATAL: MongoDB URI must include credentials in production');
  process.exit(1);
}
if (!MONGODB_URI.includes('@')) {
  console.warn('[cloud-agent] WARNING: MongoDB URI has no authentication (dev mode)');
}

// C-1: API_KEY 미설정 시 dev에서만 허용, production에서는 기동 거부
if (!API_KEY && process.env.NODE_ENV === 'production') {
  console.error('[cloud-agent] FATAL: CLOUD_AGENT_API_KEY must be set in production');
  process.exit(1);
}
if (!API_KEY) {
  console.warn('[cloud-agent] WARNING: CLOUD_AGENT_API_KEY not set — API auth disabled (dev mode)');
}

// CA-2: 공개 인터페이스 바인딩인데 API 키가 없으면 무인증 노출 → 기동 거부 (NODE_ENV 무관, fail-closed)
const isPublicBind = BIND_HOST !== '127.0.0.1' && BIND_HOST !== 'localhost';
if (isPublicBind && !API_KEY) {
  console.error(`[cloud-agent] FATAL: refusing public bind (${BIND_HOST}) without CLOUD_AGENT_API_KEY`);
  process.exit(1);
}

let db = null;
let mongoClient = null;
let fabricGateway = null; // CA-4: graceful shutdown에서 disconnect 위해 모듈 스코프

// H-6: timing-safe API key 비교 (timing attack 방지)
function safeApiKeyMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// API 인증 미들웨어
function authMiddleware(req, res, next) {
  if (req.path === '/health') return next();
  if (API_KEY) {
    const token = req.headers['x-api-key'];
    if (!safeApiKeyMatch(token, API_KEY)) {
      return res.status(401).json({ error: 'unauthorized: invalid or missing API key' });
    }
  }
  next();
}
app.use(authMiddleware);

// H-1: MongoDB $regex injection 방지
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// CA-1: 쿼리 파라미터를 스칼라 문자열로만 허용 — 배열/객체면 null 반환(주입 시도 → 호출부에서 400)
function asQueryString(v) {
  if (v === undefined) return undefined;
  return typeof v === 'string' ? v : null;
}

// CA-11: 정수 쿼리 파라미터 안전 파싱 + 범위 클램프 (배열/비정상 입력 방어)
function parseIntParam(v, def, min, max) {
  const n = parseInt(typeof v === 'string' ? v : '', 10);
  const base = Number.isFinite(n) ? n : def;
  return Math.min(Math.max(base, min), max);
}

// ============================================================
// REST API — 고속 조회 (MongoDB direct)
// ============================================================

// M-1: /search를 /:id보다 먼저 배치 (라우트 섀도잉 방지)
// GET /api/passports/search — 여권 검색 (VIN, DID, model 등)
app.get('/api/passports/search', async (req, res) => {
  try {
    // CA-1: 모든 검색 파라미터를 문자열로 강제 — 배열/객체면 400 (NoSQL 연산자 주입 차단)
    const vin = asQueryString(req.query.vin);
    const did = asQueryString(req.query.did);
    const model = asQueryString(req.query.model);
    const manufacturer = asQueryString(req.query.manufacturer);
    const status = asQueryString(req.query.status);
    if ([vin, did, model, manufacturer, status].includes(null)) {
      return res.status(400).json({ error: 'invalid query parameter' });
    }

    const filter = { docType: 'batteryPassport' };
    if (vin) filter.vin = vin;
    if (did) filter.did = did;
    if (model) filter.model = { $regex: escapeRegex(model), $options: 'i' };
    if (manufacturer) filter.manufacturerName = { $regex: escapeRegex(manufacturer), $options: 'i' };
    if (status) filter.status = status;

    const pageSize = parseIntParam(req.query.pageSize, 100, 1, 500);
    const records = await db.collection('passports')
      .find(filter)
      .sort({ updatedAt: -1 })
      .limit(pageSize)
      .toArray();

    res.json({ records, count: records.length });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// GET /api/passports — 여권 목록
app.get('/api/passports', async (req, res) => {
  try {
    const pageSize = parseIntParam(req.query.pageSize, 100, 1, 500);
    const page = parseIntParam(req.query.page, 1, 1, 1000000);
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
    res.status(500).json({ error: 'internal server error' });
  }
});

// GET /api/passports/:id — 여권 상세
app.get('/api/passports/:id', async (req, res) => {
  try {
    const cacheKey = req.params.id;
    const now = Date.now();
    const cached = passportDetailCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.status(cached.status).type('application/json').send(cached.body);
      return;
    }

    const passport = await db.collection('passports')
      .findOne({ passportId: cacheKey });
    if (!passport) {
      return res.status(404).json({ error: 'passport not found' });
    }

    const body = JSON.stringify(passport);
    if (PASSPORT_DETAIL_CACHE_TTL_MS > 0) {
      // CA-3: 엔트리 상한 초과 시 가장 오래된 항목 방출 (메모리 무한 증가 방지)
      if (passportDetailCache.size >= PASSPORT_DETAIL_CACHE_MAX) {
        const oldest = passportDetailCache.keys().next().value;
        if (oldest !== undefined) passportDetailCache.delete(oldest);
      }
      passportDetailCache.set(cacheKey, {
        status: 200,
        body,
        expiresAt: now + PASSPORT_DETAIL_CACHE_TTL_MS,
      });
    }
    res.status(200).type('application/json').send(body);
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
  }
});

// (search 라우트는 /:id 위에 배치됨 — M-1 섀도잉 수정)

// GET /api/bmu/:idOrDid — BMU 데이터 조회 (passportId 또는 DID 매칭)
app.get('/api/bmu/:idOrDid', async (req, res) => {
  try {
    const pageSize = parseIntParam(req.query.pageSize, 50, 1, 500);
    const idOrDid = req.params.idOrDid;
    const records = await db.collection('bmuRecords')
      .find({ status: 'VALID', $or: [{ passportId: idOrDid }, { did: idOrDid }] })
      .sort({ fc: -1 })
      .limit(pageSize)
      .toArray();

    res.json({ records, count: records.length });
  } catch (err) {
    res.status(500).json({ error: 'internal server error' });
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
    res.status(500).json({ error: 'internal server error' });
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
    res.status(500).json({ error: 'internal server error' });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: db ? 'connected' : 'disconnected',
    fabricChannel: FABRIC_CHANNEL,
    listenerEnabled: LISTENER_ENABLED,
    readModelProvenance: READ_MODEL_PROVENANCE,
  });
});

// CA-5: 종단 에러 핸들러 — 잘못된 JSON 본문/내부 에러에서 스택 노출 차단
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid JSON body' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload too large' });
  }
  console.error('[cloud-agent] request error:', err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'internal server error' });
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
  mongoClient = new MongoClient(MONGODB_URI, {
    maxPoolSize: MONGO_MAX_POOL_SIZE,
    minPoolSize: MONGO_MIN_POOL_SIZE,
  });
  await mongoClient.connect();
  db = mongoClient.db(MONGODB_DB);
  console.log(`[cloud-agent] MongoDB connected: ${MONGODB_DB}`);

  // 2. 인덱스 생성
  await createIndexes();

  // 3. Fabric Block Event Listener 시작
  if (LISTENER_ENABLED) {
    try {
      fabricGateway = await connectGateway();
      await startBlockListener(fabricGateway, db);
      console.log('[cloud-agent] Fabric block listener started');
    } catch (err) {
      console.error('[cloud-agent] Fabric listener failed (will retry):', err.message);
      // 리스너 실패해도 API는 동작 — 기존 데이터 조회 가능
    }
  } else {
    console.log('[cloud-agent] Fabric block listener disabled by CLOUD_AGENT_LISTENER_ENABLED=false');
  }

  // 4. Express 서버 시작 — 기본 127.0.0.1 바인딩 (공개 시 BIND_HOST=0.0.0.0 + API 키 필수, CA-2)
  app.listen(PORT, BIND_HOST, () => {
    console.log(`[cloud-agent] Cloud Agent started: http://${BIND_HOST}:${PORT}`);
    console.log('[cloud-agent] Architecture: Fabric → Block Event → MongoDB → REST API');
  });
}

main().catch(err => {
  // M-2: production에서 스택 노출 차단
  if (process.env.NODE_ENV === 'production') {
    console.error('[cloud-agent] Fatal:', err.message);
  } else {
    console.error('[cloud-agent] Fatal:', err);
  }
  process.exit(1);
});

// H-3 / CA-4: graceful shutdown — Fabric gateway + MongoDB 모두 정리
function shutdown(signal) {
  console.log(`[cloud-agent] ${signal} received, shutting down...`);
  try {
    if (fabricGateway) fabricGateway.disconnect();
  } catch (e) {
    // gateway disconnect 실패는 무시하고 계속 종료
  }
  if (mongoClient) {
    mongoClient.close().then(() => {
      console.log('[cloud-agent] MongoDB disconnected');
      process.exit(0);
    }).catch(() => process.exit(1));
  } else {
    process.exit(0);
  }
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// CA-8: 프로세스 레벨 안전망 — 미처리 거부/예외 로깅
process.on('unhandledRejection', (reason) => {
  console.error('[cloud-agent] unhandledRejection:', (reason && reason.message) || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[cloud-agent] uncaughtException:', err && err.message);
  process.exit(1);
});
