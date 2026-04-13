const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const fabricService = require('./fabric.service');
const fabricConfig = require('../config/fabric');
const { MSP } = require('../config/constants');

function generateToken(userId, orgMsp) {
  return jwt.sign(
    { userId, orgMsp },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiry, algorithm: 'HS256' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, authConfig.jwtSecret, { algorithms: ['HS256'] });
}

async function registerAndEnroll(userId, password, orgNum, caller) {
  const orgConfig = fabricConfig.orgs[orgNum];
  if (!orgConfig) {
    throw new Error(`Invalid org number: ${orgNum}`);
  }

  const isOpenReg = process.env.ALLOW_OPEN_REGISTRATION === 'true';
  if (!isOpenReg) {
    if (!caller || !caller.orgMsp) {
      throw new Error('forbidden: authenticated caller required for registration');
    }

    const callerOrgMsp = caller.orgMsp;
    const canRegister = callerOrgMsp === MSP.REGULATOR || callerOrgMsp === orgConfig.mspId;
    if (!canRegister) {
      throw new Error(`forbidden: ${callerOrgMsp} is not allowed to register users for ${orgConfig.mspId}`);
    }
  }

  const result = await fabricService.registerUser(userId, password, orgConfig);
  const token = generateToken(userId, orgConfig.mspId);
  return { ...result, token };
}

// P0-2: 항상 CA enroll로 비밀번호 검증
async function login(userId, password, orgNum) {
  const orgConfig = fabricConfig.orgs[orgNum];
  if (!orgConfig) {
    throw new Error(`Invalid org number: ${orgNum}`);
  }

  const result = await fabricService.loginUser(userId, password, orgConfig);
  const token = generateToken(userId, orgConfig.mspId);
  return { token, mspId: result.mspId, userId };
}

module.exports = {
  generateToken,
  verifyToken,
  registerAndEnroll,
  login,
};
