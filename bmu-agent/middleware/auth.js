const authService = require('../services/auth.service');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded; // { userId, orgMsp }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth: sets req.user if token present, continues otherwise
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = authService.verifyToken(token);
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = { authenticateToken, optionalAuth };
