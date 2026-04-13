if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required. Set JWT_SECRET env var before starting the agent.');
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  acaPyUrl: process.env.ACA_PY_URL || 'http://localhost:8031',
};
