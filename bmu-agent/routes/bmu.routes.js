const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const fabricService = require('../services/fabric.service');
const didService = require('../services/did.service');
const { parseRawPayload } = require('../services/bmu-parser.service');
const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, DID_CACHE_TTL_MS, MSP } = require('../config/constants');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const { createRateLimiter } = require('../middleware/rate-limit');
const { createLogger } = require('../services/logger.service');
const { sendChaincodeError } = require('../middleware/chaincode-error');
const {
  validateId,
  validateText,
  validatePageSize,
  validateBookmark,
  firstError,
} = require('../utils/request-validation');
const {
  SEED_FLAG,
  isDashboardPassportSeedEnabled,
} = require('../services/devPassportSeed.service');
const { recordRuntimeBmuSnapshot } = require('../services/runtimeBmuSnapshot.service');
const log = createLogger('bmu');

// P0-3: unsigned BMU 완전 거부 (임베디드 확인: BMU는 100% 서명 포함)

// Rate limit for /api/bmu/data — sliding window per IP
const BMU_RATE_LIMIT = parseInt(process.env.BMU_RATE_LIMIT || '200', 10); // max requests per window
const BMU_RATE_WINDOW_MS = parseInt(process.env.BMU_RATE_WINDOW_MS || '60000', 10); // 1 min
const bmuRateLimit = createRateLimiter({
  windowMs: BMU_RATE_WINDOW_MS,
  max: BMU_RATE_LIMIT,
  keyFn: (req) => req.ip || 'unknown',
});

// Reset-FC: 운영자 명시 호출만, 사용자당 5건/시간
const RESET_FC_RATE_LIMIT = parseInt(process.env.RESET_FC_RATE_LIMIT || '5', 10);
const RESET_FC_WINDOW_MS = parseInt(process.env.RESET_FC_WINDOW_MS || '3600000', 10);
const resetFcRateLimit = createRateLimiter({
  windowMs: RESET_FC_WINDOW_MS,
  max: RESET_FC_RATE_LIMIT,
  keyFn: (req) => req.user?.userId || req.ip || 'unknown',
});

// P1-8: DID → passportId cache with TTL + Promise deduplication
const CACHE_TTL = DID_CACHE_TTL_MS;
const DID_CACHE_MAX = parseInt(process.env.DID_CACHE_MAX || '500', 10);
const didPassportCache = new Map();
const didPassportPending = new Map();

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

function isBmuBindingRequired() {
  return /^(1|true|yes|on)$/i.test(String(process.env.BMU_BINDING_REQUIRED || ''));
}

function deriveBmsBindingCode32(canonicalId) {
  return crypto.createHash('sha256').update(canonicalId).digest().readUInt32LE(0);
}

function normalizePassportBinding(passport) {
  const bmsManagementId = typeof passport?.bmsManagementId === 'string' ? passport.bmsManagementId.trim() : '';
  const storedCode = Number(passport?.bmsBindingCode32 || 0);
  if (!bmsManagementId) {
    return {
      bound: false,
      bmsManagementId: '',
      expectedCode32: 0,
      storedCode32: storedCode,
    };
  }
  return {
    bound: true,
    bmsManagementId,
    expectedCode32: deriveBmsBindingCode32(bmsManagementId),
    storedCode32: storedCode,
  };
}

function evaluateBmsIdentifierMatch(passport, parsed) {
  const binding = normalizePassportBinding(passport);
  if (!binding.bound) {
    return {
      ...binding,
      matched: null,
      reason: 'BMS management identifier not bound',
    };
  }
  const storedMatches = binding.storedCode32 === 0 || binding.storedCode32 === binding.expectedCode32;
  const payloadMatches = parsed.bmsBindingCode32 === binding.expectedCode32;
  return {
    ...binding,
    matched: storedMatches && payloadMatches,
    reason: storedMatches && payloadMatches ? 'matched' : 'BMS binding code mismatch',
  };
}

function readPagination(req) {
  const pageSize = validatePageSize(req.query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (pageSize.error) return { error: pageSize.error };
  const bookmark = validateBookmark(req.query.bookmark);
  if (bookmark.error) return { error: bookmark.error };
  return { pageSize: pageSize.value, bookmark: bookmark.value };
}

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

async function resolvePassportForDid(did, options = {}) {
  const cached = didPassportCache.get(did);
  if (!options.forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.passport;
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
        didPassportCache.set(did, { passport, ts: Date.now() });
        return passport;
      }
      return null;
    } finally {
      didPassportPending.delete(did);
    }
  })();

  didPassportPending.set(did, promise);
  return promise;
}

function clearDidPassportCache(options = {}) {
  const { did, passportId } = typeof options === 'string' ? { did: options } : options;
  let cleared = 0;

  if (did) {
    if (didPassportCache.delete(did)) cleared += 1;
    didPassportPending.delete(did);
    return cleared;
  }

  if (passportId) {
    for (const [cachedDid, entry] of didPassportCache) {
      if (entry?.passport?.passportId === passportId) {
        didPassportCache.delete(cachedDid);
        didPassportPending.delete(cachedDid);
        cleared += 1;
      }
    }
    return cleared;
  }

  cleared = didPassportCache.size;
  didPassportCache.clear();
  didPassportPending.clear();
  return cleared;
}

// POST /api/bmu/data — Receive BMU data
router.post('/data', authenticateToken, requireMSP(MSP.MANUFACTURER), bmuRateLimit, async (req, res) => {
  const { rawPayload, signature, did: reqDid } = req.body;
  const did = reqDid;
  if (process.env.BMU_INGEST_DEBUG === 'true') {
    console.log('[BMU-INGEST]', JSON.stringify({
      t: new Date().toISOString(),
      ip: req.ip,
      rp: req.socket?.remotePort,
      ua: req.get('user-agent') || '-',
      fc: req.body?.fc,
      bind: typeof rawPayload === 'string' && rawPayload.length >= 96 ? rawPayload.slice(88, 96) : null,
      rawLen: typeof rawPayload === 'string' ? rawPayload.length : null,
      sigLen: typeof signature === 'string' ? signature.length : null,
      rawHead: typeof rawPayload === 'string' ? rawPayload.slice(0, 24) : null,
      isHex: typeof rawPayload === 'string' ? /^[0-9a-fA-F]+$/.test(rawPayload) : null,
    }));
  }

  const bodyError = firstError(
    validateText(rawPayload, 'rawPayload', { min: 1, max: 512 }),
    validateId(did, 'did', { max: 256, pattern: /^[A-Za-z0-9._:-]+$/ })
  );
  if (bodyError) return validationError(res, bodyError);

  // P0-3: 서명 필수 (BMU는 항상 Ed25519 서명 포함)
  if (!signature || signature === 'none') {
    return validationError(res, 'signature required');
  }
  // 형식 검증: signR(64hex) + signS(64hex) = 128 lowercase hex chars
  if (typeof signature !== 'string' || signature.length !== 128 || !/^[0-9a-f]+$/.test(signature)) {
    return validationError(res, 'signature must be 128 lowercase hex chars (signR||signS)');
  }

  try {
    const parsed = parseRawPayload(rawPayload);
    if (isBmuBindingRequired() && parsed.bmsBindingCode32 === 0) {
      return validationError(res, 'bmsBindingCode32 required');
    }

    // Ed25519 서명 검증 (P0-3: 위에서 signature 필수 검증 완료)
    const verifyTarget = Buffer.from(rawPayload, 'hex');
    const isValid = await didService.verifySignature(did, verifyTarget, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'signature verification failed' });
    }

    const dataHash = crypto.createHash('sha256')
      .update(Buffer.from(rawPayload, 'hex'))
      .digest('hex');

    let passport;
    try {
      passport = await resolvePassportForDid(did);
    } catch (err) {
      log.warn('DID->passport lookup failed', { did, error: err.message });
      return res.status(502).json({ error: `failed to resolve passport for DID ${did}` });
    }

    if (!passport?.passportId) {
      return res.status(404).json({ error: `no passport found for DID ${did}` });
    }
    const passportId = passport.passportId;
    if (!passport.bmsManagementId && parsed.bmsBindingCode32 !== 0) {
      passport = await resolvePassportForDid(did, { forceRefresh: true }) || passport;
    }
    const bmsIdentifier = evaluateBmsIdentifierMatch(passport, parsed);
    if (isBmuBindingRequired() && !bmsIdentifier.bound) {
      return validationError(res, 'BMS management identifier required');
    }
    if (bmsIdentifier.bound && !bmsIdentifier.matched) {
      return validationError(
        res,
        `BMS binding code mismatch: payload bmsBindingCode32 ${parsed.bmsBindingCode32} does not match expected ${bmsIdentifier.expectedCode32}`
      );
    }

    const recordId = `BMU-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();
    const baseArgs = [
      recordId, passportId, did, dataHash,
      signature,
      String(parsed.freshnessCounter), String(parsed.soc),
      String(parsed.voltage), String(parsed.current),
      String(parsed.temperature), String(parsed.cellCount),
      String(parsed.statusFlags), String(parsed.dischargeCycles),
      timestamp,
    ];
    const txName = bmsIdentifier.bound ? 'RecordBMUDataWithPayload' : 'RecordBMUData';
    const txArgs = bmsIdentifier.bound ? [...baseArgs, rawPayload] : baseArgs;

    // BMU 데이터는 제조사 admin으로 기록 (M2M 통신)
    await fabricService.submitTransaction(txName, txArgs);
    recordRuntimeBmuSnapshot({
      recordId,
      passportId,
      did,
      dataHash,
      soc: parsed.soc,
      voltage: parsed.voltage,
      current: parsed.current,
      temperature: parsed.temperature,
      cellCount: parsed.cellCount,
      statusFlags: parsed.statusFlags,
      dischargeCycles: parsed.dischargeCycles,
      timestamp,
      bmsBindingCode32: parsed.bmsBindingCode32,
      bmsBindingCodeHex: parsed.bmsBindingCodeHex,
    });

    log.info('BMU recorded', {
      action: txName, recordId, passportId,
      did, fc: parsed.freshnessCounter, soc: parsed.soc,
      bmsBindingCode32: parsed.bmsBindingCode32,
      bmsBindingCodeHex: parsed.bmsBindingCodeHex,
      bmsIdentifierMatched: bmsIdentifier.matched,
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
        bmsBindingCode32: parsed.bmsBindingCode32,
        bmsBindingCodeHex: parsed.bmsBindingCodeHex,
      },
      bindingSignals: {
        didMatched: true,
        bmsIdentifierMatched: bmsIdentifier.matched,
        expectedBmsBindingCode32: bmsIdentifier.expectedCode32 || undefined,
        storedBmsBindingCode32: bmsIdentifier.storedCode32 || undefined,
      },
    });
  } catch (err) {
    log.error('BMU record failed', { action: 'RecordBMUData', did, error: err.message });
    if (/^rawPayload /.test(err.message)) {
      return validationError(res, err.message);
    }
    sendChaincodeError(res, err);
  }
});

// GET /api/bmu/records/:passportId
router.get('/records/:passportId', authenticateToken, async (req, res) => {
  try {
    const idError = validateId(req.params.passportId, 'passportId');
    if (idError) return validationError(res, idError);
    const pagination = readPagination(req);
    if (pagination.error) return validationError(res, pagination.error);
    const { pageSize, bookmark } = pagination;
    if (isDashboardPassportSeedEnabled() && /^DEV-DASH-P-/.test(req.params.passportId)) {
      res.set('X-BMS-Dev-Seed', SEED_FLAG);
      return res.json({ records: [], bookmark: '', count: 0 });
    }

    const result = await fabricService.evaluateTransaction(
      'QueryBMURecordsByPassport', [req.params.passportId, String(pageSize), bookmark], req.user
    );
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    sendChaincodeError(res, err);
  }
});

// POST /api/bmu/invalidate/:recordId — Invalidate a BMU record
router.post('/invalidate/:recordId', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), async (req, res) => {
  const { reason } = req.body;
  const bodyError = firstError(
    validateId(req.params.recordId, 'recordId'),
    validateText(reason, 'reason', { min: 1, max: 512 })
  );
  if (bodyError) return validationError(res, bodyError);
  try {
    await fabricService.submitTransaction('InvalidateBMURecord', [
      req.params.recordId, reason,
    ], req.user);
    log.info('BMU record invalidated', { action: 'InvalidateBMURecord', recordId: req.params.recordId, reason, user: req.user?.userId });
    res.json({ success: true, recordId: req.params.recordId, status: 'INVALIDATED' });
  } catch (err) {
    log.error('BMU invalidation failed', { action: 'InvalidateBMURecord', recordId: req.params.recordId, error: err.message });
    sendChaincodeError(res, err);
  }
});

// POST /api/bmu/reset-fc — FC 재동기화 (장비 재부팅/교체/DID 재프로비저닝). 운영자 명시 호출만.
router.post('/reset-fc', authenticateToken, requireMSP(MSP.MANUFACTURER, MSP.REGULATOR), resetFcRateLimit, async (req, res) => {
  const { did, reason, confirm, expected_next_fc: expectedNextFc } = req.body;
  const bodyError = firstError(
    validateId(did, 'did', { max: 256, pattern: /^[A-Za-z0-9._:-]+$/ }),
    validateText(reason, 'reason', { min: 50, max: 1024 })
  );
  if (bodyError) return validationError(res, bodyError);
  if (confirm !== true) {
    return validationError(res, 'confirm must be true to acknowledge destructive operation');
  }
  if (expectedNextFc !== undefined) {
    if (!Number.isInteger(expectedNextFc) || expectedNextFc < 0) {
      return validationError(res, 'expected_next_fc must be a non-negative integer');
    }
  }

  // RESET_FC_REQUIRE_DUAL_APPROVAL=true 일 때만 2-eye 강제. 현 단계는 false(1-eye + 50자+ reason).
  // 2-eye 워크플로우는 별도 approval 토큰 발급 endpoint 신설 시 enable.
  if (process.env.RESET_FC_REQUIRE_DUAL_APPROVAL === 'true') {
    return res.status(501).json({ error: 'dual approval workflow not implemented', category: 'CONFIG' });
  }

  try {
    await fabricService.submitTransaction('ResetFCForDID', [did, reason], req.user);
    clearDidPassportCache({ did });
    log.info('FC reset performed', {
      action: 'ResetFCForDID',
      did,
      reason,
      expectedNextFc: expectedNextFc ?? null,
      user: req.user?.userId,
      orgMsp: req.user?.orgMsp,
    });
    res.json({ success: true, did, status: 'FC_RESET' });
  } catch (err) {
    log.error('FC reset failed', { action: 'ResetFCForDID', did, error: err.message });
    sendChaincodeError(res, err);
  }
});

router.clearDidPassportCache = clearDidPassportCache;

module.exports = router;
