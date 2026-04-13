const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticateToken } = require('../middleware/auth');
const { MSP } = require('../config/constants');
const { createLogger } = require('../services/logger.service');
const log = createLogger('auth');

const isOpenReg = process.env.ALLOW_OPEN_REGISTRATION === 'true';

// POST /api/auth/register (production: 인증 필요, dev: ALLOW_OPEN_REGISTRATION=true로 개방)
router.post('/register', ...(isOpenReg ? [] : [authenticateToken]), async (req, res) => {
  const { userId, password, orgNum } = req.body;

  if (!userId || !password || !orgNum) {
    return res.status(400).json({ error: 'userId, password, orgNum required' });
  }

  try {
    const targetOrgNum = parseInt(orgNum, 10);
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

  if (!userId || !password || !orgNum) {
    return res.status(400).json({ error: 'userId, password, orgNum required' });
  }

  try {
    const result = await authService.login(userId, password, parseInt(orgNum, 10));
    res.json({ success: true, ...result });
  } catch (err) {
    log.error('Login failed', { action: 'login', error: err.message });
    res.status(401).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
