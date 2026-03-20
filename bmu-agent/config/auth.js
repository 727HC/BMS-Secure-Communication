module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'battery-passport-dev-secret',
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  acaPyUrl: process.env.ACA_PY_URL || 'http://localhost:8031',
};
