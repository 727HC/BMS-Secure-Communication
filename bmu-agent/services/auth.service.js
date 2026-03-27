const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const fabricService = require('./fabric.service');

function generateToken(userId, orgMsp) {
  return jwt.sign(
    { userId, orgMsp },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiry }
  );
}

function verifyToken(token) {
  return jwt.verify(token, authConfig.jwtSecret);
}

async function registerAndEnroll(userId, password, orgNum) {
  const fabricConfig = require('../config/fabric');
  const orgConfig = fabricConfig.orgs[orgNum];
  if (!orgConfig) {
    throw new Error(`Invalid org number: ${orgNum}`);
  }
  const result = await fabricService.registerUser(userId, password, orgConfig);
  const token = generateToken(userId, orgConfig.mspId);
  return { ...result, token };
}

// P0-2: 항상 CA enroll로 비밀번호 검증
async function login(userId, password, orgNum) {
  const fabricConfig = require('../config/fabric');
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
