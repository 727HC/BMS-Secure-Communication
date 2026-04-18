function createRateLimiter({ windowMs, max, keyFn }) {
  const buckets = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  }, Math.max(windowMs, 60_000)).unref();

  return function rateLimit(req, res, next) {
    const key = keyFn ? keyFn(req) : `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ error: 'rate limit exceeded' });
    }
    next();
  };
}

module.exports = { createRateLimiter };
