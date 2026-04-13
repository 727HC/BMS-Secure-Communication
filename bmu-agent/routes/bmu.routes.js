const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const fabricService = require('../services/fabric.service');
const didService = require('../services/did.service');
const { parseRawPayload } = require('../services/bmu-parser.service');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, DID_CACHE_TTL_MS, MSP } = require('../config/constants');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const { createLogger } = require('../services/logger.service');
const log = createLogger('bmu');

// P0-3: unsigned BMU 완전 거부 (임베디드 확인: BMU는 100% 서명 포함)

// Rate limit for /api/bmu/data — sliding window per IP
const BMU_RATE_LIMIT = parseInt(process.env.BMU_RATE_LIMIT || '200', 10); // max requests per window
const BMU_RATE_WINDOW_MS = parseInt(process.env.BMU_RATE_WINDOW_MS || '60000', 10); // 1 min
const rateBuckets = new Map();
// Purge expired rate-limit buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start > BMU_RATE_WINDOW_MS) rateBuckets.delete(key);
  }
}, 5 * 60 * 1000).unref();

function bmuRateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.start > BMU_RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count++;
  if (bucket.count > BMU_RATE_LIMIT) {
    return res.status(429).json({ error: 'rate limit exceeded' });
  }
  next();
}

// P1-8: DID → passportId cache with TTL + Promise deduplication
const CACHE_TTL = DID_CACHE_TTL_MS;
const DID_CACHE_MAX = parseInt(process.env.DID_CACHE_MAX || '500', 10);
const didPassportCache = new Map();
const didPassportPending = new Map();

// Evict expired + oldest entries when cache exceeds max size
function evictCache() {
  const now = Date.now();
  for (const [key, val] of didPassportCache) {
    if (now - val.ts >= CACHE_TTL) didPassportCache.delete(key);
  }
  if (didPassportCache.size > DID_CACHE_MAX) {
    const excess = didPassportCache.size - DID_CACHE_MAX;
    const keys = didPassportCache.keys();
    for (let i = 0; i < excess; i++) didPassportCache.delete(keys.next().value);
  }
}

async function resolvePassportId(did) {
  const cached = didPassportCache.get(did);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.passportId;
  }

  if (didPassportPending.has(did)) {
    return didPassportPending.get(did);
  }

  const promise = (async () => {
    try {
      const result = await fabricService.evaluateTransaction('QueryBatteryByDID', [did]);
      const passport = JSON.parse(result.toString());
      if (passport && passport.passportId) {
        evictCache();
        didPassportCache.set(did, { passportId: passport.passportId, ts: Date.now() });
        return passport.passportId;
      }
      return null;
    } finally {
      didPassportPending.delete(did);
    }
  })();

  didPassportPending.set(did, promise);
  return promise;
}

// POST /api/bmu/data — Receive BMU data
router.post('/data', authenticateToken, requireMSP(MSP.MANUFACTURER), bmuRateLimit, async (req, res) => {
  const { rawPayload, signature, did: reqDid } = req.body;
  const did = reqDid;

  if (!rawPayload) {
    return res.status(400).json({ error: 'rawPayload required' });
  }
  if (!did) {
    return res.status(400).json({ error: 'did required' });
  }

  // P0-3: 서명 필수 (BMU는 항상 Ed25519 서명 포함)
  if (!signature || signature === 'none') {
    return res.status(400).json({ error: 'signature required' });
  }

  try {
    const parsed = parseRawPayload(rawPayload);

    // Ed25519 서명 검증 (P0-3: 위에서 signature 필수 검증 완료)
    const verifyTarget = Buffer.from(rawPayload, 'hex');
    const isValid = await didService.verifySignature(did, verifyTarget, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'signature verification failed' });
    }

    const dataHash = crypto.createHash('sha256')
      .update(Buffer.from(rawPayload, 'hex'))
      .digest('hex');

    let passportId;
    try {
      passportId = await resolvePassportId(did);
    } catch (err) {
      log.warn('DID->passport lookup failed', { did, error: err.message });
      return res.status(502).json({ error: `failed to resolve passport for DID ${did}` });
    }

    if (!passportId) {
      return res.status(404).json({ error: `no passport found for DID ${did}` });
    }

    const recordId = `BMU-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    // BMU 데이터는 제조사 admin으로 기록 (M2M 통신)
    await fabricService.submitTransaction('RecordBMUData', [
      recordId, passportId, did, dataHash,
      signature || 'none',
      String(parsed.freshnessCounter), String(parsed.soc),
      String(parsed.voltage), String(parsed.current),
      String(parsed.temperature), String(parsed.cellCount),
      String(parsed.statusFlags), String(parsed.dischargeCycles),
      timestamp,
    ]);

    log.info('BMU recorded', {
      action: 'RecordBMUData', recordId, passportId,
      did, fc: parsed.freshnessCounter, soc: parsed.soc,
      voltage: parsed.voltage, temperature: parsed.temperature,
      statusFlags: parsed.statusFlags, dischargeCycles: parsed.dischargeCycles,
      data: { soc: parsed.soc, voltage: parsed.voltage, current: parsed.current, temperature: parsed.temperature },
    });
    res.json({
      success: true, recordId,
      passportId,
      parsed: {
        soc: parsed.soc, voltage: parsed.voltage, current: parsed.current,
        temperature: parsed.temperature, cellCount: parsed.cellCount,
        dischargeCycles: parsed.dischargeCycles, statusFlags: parsed.statusFlags,
      },
    });
  } catch (err) {
    log.error('BMU record failed', { action: 'RecordBMUData', did, error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/bmu/records/:passportId
router.get('/records/:passportId', authenticateToken, async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || String(DEFAULT_PAGE_SIZE), 10), MAX_PAGE_SIZE);
    const bookmark = req.query.bookmark || '';
    const result = await fabricService.evaluateTransaction(
      'QueryBMURecordsByPassport', [req.params.passportId, String(pageSize), bookmark], req.user
    );
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/bmu/invalidate/:recordId — Invalidate a BMU record
router.post('/invalidate/:recordId', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ error: 'reason required' });
  }
  try {
    await fabricService.submitTransaction('InvalidateBMURecord', [
      req.params.recordId, reason,
    ], req.user);
    log.info('BMU record invalidated', { action: 'InvalidateBMURecord', recordId: req.params.recordId, reason, user: req.user?.userId });
    res.json({ success: true, recordId: req.params.recordId, status: 'INVALIDATED' });
  } catch (err) {
    log.error('BMU invalidation failed', { action: 'InvalidateBMURecord', recordId: req.params.recordId, error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
