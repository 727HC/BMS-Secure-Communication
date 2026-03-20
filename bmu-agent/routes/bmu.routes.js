const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const fabricService = require('../services/fabric.service');
const didService = require('../services/did.service');
const { parseRawPayload } = require('../services/bmu-parser.service');

// P0-3: unsigned BMU 기본 거부 (ALLOW_UNSIGNED_BMU=true로 개발 모드 허용)
const ALLOW_UNSIGNED = process.env.ALLOW_UNSIGNED_BMU === 'true';

// P1-8: DID → passportId cache with TTL (5분)
const CACHE_TTL = 5 * 60 * 1000;
const didPassportCache = new Map();

async function resolvePassportId(did) {
  const cached = didPassportCache.get(did);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.passportId;
  }
  const result = await fabricService.evaluateTransaction('QueryBatteryByDID', did);
  const passport = JSON.parse(result.toString());
  if (passport && passport.passportId) {
    didPassportCache.set(did, { passportId: passport.passportId, ts: Date.now() });
    return passport.passportId;
  }
  return null;
}

// POST /api/bmu/data — Receive BMU data
router.post('/data', async (req, res) => {
  const { rawPayload, signature, did: reqDid } = req.body;
  const did = reqDid || process.env.DEFAULT_BMU_DID;

  if (!rawPayload) {
    return res.status(400).json({ error: 'rawPayload required' });
  }
  if (!did) {
    return res.status(400).json({ error: 'did required' });
  }

  // P0-3: 서명 필수 (개발 모드에서만 우회)
  if (!signature || signature === 'none') {
    if (!ALLOW_UNSIGNED) {
      return res.status(400).json({ error: 'signature required (set ALLOW_UNSIGNED_BMU=true to bypass)' });
    }
  }

  try {
    const parsed = parseRawPayload(rawPayload);

    // Ed25519 서명 검증
    if (signature && signature !== 'none') {
      const verifyTarget = Buffer.from(rawPayload, 'hex');
      const isValid = await didService.verifySignature(did, verifyTarget, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'signature verification failed' });
      }
    }

    const dataHash = crypto.createHash('sha256')
      .update(Buffer.from(rawPayload, 'hex'))
      .digest('hex');

    let passportId;
    try {
      passportId = await resolvePassportId(did);
    } catch (err) {
      console.warn('DID→passport lookup failed:', err.message);
    }

    const recordId = `BMU-${Date.now()}-${parsed.freshnessCounter}`;
    const timestamp = new Date().toISOString();

    // BMU 데이터는 제조사 admin으로 기록 (M2M 통신)
    await fabricService.submitTransaction('RecordBMUData', [
      recordId, passportId || '', did, dataHash,
      signature || 'none',
      String(parsed.freshnessCounter), String(parsed.soc),
      String(parsed.voltage), String(parsed.current),
      String(parsed.temperature), String(parsed.cellCount),
      String(parsed.statusFlags), String(parsed.dischargeCycles),
      timestamp,
    ]);

    console.log(`BMU recorded: ${recordId} FC=${parsed.freshnessCounter} SOC=${parsed.soc}`);
    res.json({
      success: true, recordId,
      passportId: passportId || null,
      parsed: {
        soc: parsed.soc, voltage: parsed.voltage, current: parsed.current,
        temperature: parsed.temperature, cellCount: parsed.cellCount,
        dischargeCycles: parsed.dischargeCycles, statusFlags: parsed.statusFlags,
      },
    });
  } catch (err) {
    console.error('BMU record failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bmu/records/:passportId
router.get('/records/:passportId', async (req, res) => {
  try {
    const pageSize = Math.min(parseInt(req.query.pageSize || '100', 10), 500);
    const bookmark = req.query.bookmark || '';
    const result = await fabricService.evaluateTransaction(
      'QueryBMURecordsByPassport', req.params.passportId, String(pageSize), bookmark
    );
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
