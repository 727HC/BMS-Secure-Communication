const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticateToken } = require('../middleware/auth');
const { MSP } = require('../config/constants');
const { createLogger } = require('../services/logger.service');
const {
  validateId,
  validateText,
  validateInteger,
  firstError,
} = require('../utils/request-validation');
const log = createLogger('auth');

const isOpenReg = process.env.ALLOW_OPEN_REGISTRATION === 'true';
const USER_ID_OPTIONS = { max: 64, pattern: /^[A-Za-z0-9._-]+$/ };

function validateAuthBody({ userId, password, orgNum }) {
  return firstError(
    validateId(userId, 'userId', USER_ID_OPTIONS),
    validateText(password, 'password', { min: 1, max: 256 }),
    validateInteger(orgNum, 'orgNum', { min: 1, max: 4 })
  );
}

function validationError(res, error) {
  return res.status(400).json({ error, category: 'VAL' });
}

// POST /api/auth/register (production: 인증 필요, dev: ALLOW_OPEN_REGISTRATION=true로 개방)
router.post('/register', ...(isOpenReg ? [] : [authenticateToken]), async (req, res) => {
  const { userId, password, orgNum } = req.body;

  const bodyError = validateAuthBody({ userId, password, orgNum });
  if (bodyError) return validationError(res, bodyError);

  try {
    const targetOrgNum = Number(String(orgNum).trim());
    const caller = req.user || null;

    if (!isOpenReg) {
      const callerOrgMsp = caller && caller.orgMsp;
      const targetOrgConfig = require('../config/fabric').orgs[targetOrgNum];

      if (!callerOrgMsp) {
        return res.status(401).json({ error: 'authenticated caller required for registration' });
      }
      if (!targetOrgConfig) {
        return res.status(400).json({ error: `Invalid org number: ${targetOrgNum}` });
      }
      const canRegister = callerOrgMsp === MSP.REGULATOR || callerOrgMsp === targetOrgConfig.mspId;
      if (!canRegister) {
        return res.status(403).json({ error: `caller ${callerOrgMsp} cannot register users for ${targetOrgConfig.mspId}` });
      }
    }

    const result = await authService.registerAndEnroll(userId, password, targetOrgNum, caller);
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('Registration failed', { action: 'register', error: err.message });
    if (/forbidden|not allowed/i.test(err.message)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (/Invalid org number/i.test(err.message)) {
      return res.status(400).json({ error: 'Invalid organization number' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { userId, password, orgNum } = req.body;

  const bodyError = validateAuthBody({ userId, password, orgNum });
  if (bodyError) return validationError(res, bodyError);

  try {
    const result = await authService.login(userId, password, Number(String(orgNum).trim()));
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('Login failed', { action: 'login', error: err.message });
    res.status(401).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
