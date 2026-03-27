// RBAC middleware: restricts access based on MSP ID from JWT
// Usage: router.post('/path', requireMSP('ManufacturerMSP'), handler)

function requireMSP(...allowedMSPs) {
  return (req, res, next) => {
    if (!req.user || !req.user.orgMsp) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedMSPs.includes(req.user.orgMsp)) {
      return res.status(403).json({
        error: `Access denied: ${req.user.orgMsp} not authorized`,
        required: allowedMSPs,
      });
    }
    next();
  };
}

module.exports = { requireMSP };
