const express = require('express');
const router = express.Router();
const didService = require('../services/did.service');
const { authenticateToken } = require('../middleware/auth');
const { requireMSP } = require('../middleware/rbac');
const { MSP } = require('../config/constants');
const { createLogger } = require('../services/logger.service');
const { validateId, validateText, firstError } = require('../utils/request-validation');

const log = createLogger('did');

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

function validateDid(value, fieldName = 'did') {
  return validateId(value, fieldName, { max: 256, pattern: /^[A-Za-z0-9._:-]+$/ });
}

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
  const bodyError = firstError(
    validateDid(did),
    validateText(verkey, 'verkey', { min: 1, max: 256 }),
    validateText(role, 'role', { max: 64, required: false })
  );
  if (bodyError) return validationError(res, bodyError);

  try {
    const result = await didService.registerDID(did, verkey, role);
    res.json({ success: true, ledgerResult: result });
  } catch (err) {
    log.error('DID register failed', {
      action: 'registerDID',
      did,
      error: err.message,
      responseData: err.response?.data,
    });

    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const detail = typeof err.response?.data === 'string'
      ? err.response.data
      : err.message;
    res.status(500).json({ error: detail });
  }
});

// GET /api/did/verkey/:did — Get public key for DID
router.get('/verkey/:did', authenticateToken, async (req, res) => {
  try {
    const didError = validateDid(req.params.did);
    if (didError) return validationError(res, didError);
    const verkey = await didService.getVerkey(req.params.did);
    res.json({ did: req.params.did, verkey, encoding: 'base58' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get verkey' });
  }
});

// POST /api/did/verify — Verify signature
router.post('/verify', authenticateToken, async (req, res) => {
  const { did, msg, signature } = req.body;
  const bodyError = firstError(
    validateDid(did),
    validateText(msg, 'msg', { min: 1, max: 4096 }),
    validateText(signature, 'signature', { min: 1, max: 512 })
  );
  if (bodyError) return validationError(res, bodyError);

  try {
    const valid = await didService.verifySignature(did, msg, signature);
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
