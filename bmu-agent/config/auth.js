// P1-5: dev 모드가 아니면 JWT_SECRET 필수
const isDev = process.env.NODE_ENV !== 'production';

if (!isDev && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production. Set NODE_ENV=production and JWT_SECRET env var.');
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET || (isDev ? 'battery-passport-dev-secret' : undefined),
  jwtExpiry: process.env.JWT_EXPIRY || '24h',
  acaPyUrl: process.env.ACA_PY_URL || 'http://localhost:8031',
};
