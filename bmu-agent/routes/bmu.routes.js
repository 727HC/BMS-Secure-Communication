const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const fabricService = require('../services/fabric.service');
const didService = require('../services/did.service');
const { parseRawPayload } = require('../services/bmu-parser.service');

// DID → passportId cache
const didPassportCache = new Map();

async function resolvePassportId(did) {
  if (didPassportCache.has(did)) {
    return didPassportCache.get(did);
  }
  const result = await fabricService.evaluateTransaction('QueryBatteryByDID', did);
  const passport = JSON.parse(result.toString());
  if (passport && passport.passportId) {
    didPassportCache.set(did, passport.passportId);
    return passport.passportId;
  }
  return null;
}

// POST /api/bmu/data — Receive BMU data from serial_to_agent.py
router.post('/data', async (req, res) => {
  const { rawPayload, signature, did: reqDid } = req.body;
  const did = reqDid || process.env.DEFAULT_BMU_DID;

  if (!rawPayload) {
    return res.status(400).json({ error: 'rawPayload required' });
  }
  if (!did) {
    return res.status(400).json({ error: 'did required (set DEFAULT_BMU_DID or send in request)' });
  }

  try {
    // 1. Parse rawPayload (48 bytes hex)
    const parsed = parseRawPayload(rawPayload);

    // 2. Ed25519 signature verification
    if (signature && signature !== 'none') {
      const verifyTarget = Buffer.from(rawPayload, 'hex');
      const isValid = await didService.verifySignature(did, verifyTarget, signature);
      if (!isValid) {
        return res.status(401).json({ error: 'signature verification failed' });
      }
    }

    // 3. Compute data hash
    const dataHash = crypto.createHash('sha256')
      .update(Buffer.from(rawPayload, 'hex'))
      .digest('hex');

    // 4. Resolve DID → passportId
    let passportId;
    try {
      passportId = await resolvePassportId(did);
    } catch (err) {
      // Passport not yet registered — store with empty passportId
      console.warn('DID→passport lookup failed:', err.message);
    }

    // 5. Record to Fabric
    const recordId = `BMU-${Date.now()}-${parsed.freshnessCounter}`;
    const timestamp = new Date().toISOString();

    await fabricService.submitTransaction(
      'RecordBMUData',
      recordId,
      passportId || '',
      did,
      dataHash,
      signature || 'none',
      String(parsed.freshnessCounter),
      String(parsed.soc),
      String(parsed.voltage),
      String(parsed.current),
      String(parsed.temperature),
      String(parsed.cellCount),
      String(parsed.statusFlags),
      String(parsed.dischargeCycles),
      timestamp
    );

    console.log(`BMU recorded: ${recordId} FC=${parsed.freshnessCounter} SOC=${parsed.soc} V=${parsed.voltage}`);
    res.json({
      success: true,
      recordId,
      passportId: passportId || null,
      parsed: {
        soc: parsed.soc,
        voltage: parsed.voltage,
        current: parsed.current,
        temperature: parsed.temperature,
        cellCount: parsed.cellCount,
        dischargeCycles: parsed.dischargeCycles,
        statusFlags: parsed.statusFlags,
      },
    });
  } catch (err) {
    console.error('BMU record failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bmu/records/:passportId — Get BMU records for a passport
router.get('/records/:passportId', async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize || '100', 10);
    const bookmark = req.query.bookmark || '';
    const result = await fabricService.evaluateTransaction(
      'QueryBMURecordsByPassport',
      req.params.passportId,
      String(pageSize),
      bookmark
    );
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
