const express = require('express');
const router = express.Router();
const didService = require('../services/did.service');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const { MSP } = require('../config/constants');

// POST /api/did/register — Register DID on Indy ledger (JWT+RBAC or admin API key)
// x-api-key fallback is dev-only; production requires JWT+RBAC
router.post('/register', (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey && req.headers['x-api-key'] === adminKey && process.env.NODE_ENV !== 'production') {
    return next();
  }
  // Require JWT + MSP authorization
  authenticateToken(req, res, (err) => {
    if (err) return;
    requireMSP(MSP.MANUFACTURER, MSP.REGULATOR)(req, res, next);
  });
}, async (req, res) => {

  const { did, verkey, role } = req.body;
  if (!did || !verkey) {
    return res.status(400).json({ error: 'did, verkey required' });
  }

  try {
    const result = await didService.registerDID(did, verkey, role);
    res.json({ success: true, ledgerResult: result });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// GET /api/did/verkey/:did — Get public key for DID
router.get('/verkey/:did', authenticateToken, async (req, res) => {
  try {
    const verkey = await didService.getVerkey(req.params.did);
    res.json({ did: req.params.did, verkey, encoding: 'base58' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get verkey' });
  }
});

// POST /api/did/verify — Verify signature
router.post('/verify', authenticateToken, async (req, res) => {
  const { did, msg, signature } = req.body;
  if (!did || !msg || !signature) {
    return res.status(400).json({ error: 'did, msg, signature required' });
  }

  try {
    const valid = await didService.verifySignature(did, msg, signature);
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
