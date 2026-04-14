/**
 * Audit Log Middleware
 * Records all API actions for compliance monitoring and traceability.
 * Logs are persisted to NDJSON file with rotation.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.resolve(__dirname, '..', '..', 'logs');
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit.log');
const MAX_AUDIT_SIZE = 50 * 1024 * 1024; // 50MB rotation
const MEMORY_BUFFER_SIZE = 1000; // recent logs in memory for fast queries
let auditStream = null;
let currentAuditSize = 0;

// Ensure directory exists
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

// In-memory buffer for recent logs (fast query)
const recentLogs = [];

// Load recent logs from file on startup
try {
  if (fs.existsSync(AUDIT_FILE)) {
    currentAuditSize = fs.statSync(AUDIT_FILE).size;
    const lines = fs.readFileSync(AUDIT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    const tail = lines.slice(-MEMORY_BUFFER_SIZE);
    for (const line of tail) {
      try {
        recentLogs.push(JSON.parse(line));
      } catch (err) {
        console.warn('[audit] malformed audit log skipped:', err.message);
      }
    }
  }
} catch (err) {
  console.warn('[audit] startup read failed:', err.message);
}

function ensureAuditStream() {
  if (!auditStream) {
    auditStream = fs.createWriteStream(AUDIT_FILE, { flags: 'a' });
  }
  return auditStream;
}

function rotateIfNeeded() {
  try {
    if (currentAuditSize > MAX_AUDIT_SIZE) {
      if (auditStream) {
        auditStream.end();
        auditStream = null;
      }
      const rotated = `${AUDIT_FILE}.${Date.now()}.bak`;
      fs.renameSync(AUDIT_FILE, rotated);
      currentAuditSize = 0;
    }
  } catch (err) {
    console.warn('[audit] log rotation failed:', err.message);
  }
}

function persistEntry(entry) {
  try {
    const line = JSON.stringify(entry) + '\n';
    rotateIfNeeded();
    ensureAuditStream().write(line);
    currentAuditSize += Buffer.byteLength(line);
  } catch (err) {
    console.warn('[audit] log write failed:', err.message);
  }
}

function auditMiddleware(req, res, next) {
  // Skip non-API paths
  const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const isApi = req.originalUrl.startsWith('/api/');
  if (!isApi) return next();

  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const entry = {
      id: `AUDIT-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.userId || null,
      orgMsp: req.user?.orgMsp || null,
      action: classifyAction(req.method, req.originalUrl),
      targetId: extractTargetId(req.originalUrl),
      requestBody: isWrite ? sanitizeBody(req.body) : undefined,
      statusCode: res.statusCode,
      success: res.statusCode >= 200 && res.statusCode < 300,
      duration: Date.now() - startTime,
      ip: req.ip || req.connection?.remoteAddress,
    };

    // Memory buffer
    recentLogs.push(entry);
    if (recentLogs.length > MEMORY_BUFFER_SIZE) recentLogs.shift();

    // File persistence
    persistEntry(entry);

    return originalJson(body);
  };

  next();
}

function classifyAction(method, url) {
  if (url.includes('/auth/login')) return 'LOGIN';
  if (url.includes('/auth/register')) return 'REGISTER';
  if (method === 'POST' && /\/passports\/?(\?|$)/.test(url)) return 'CREATE_PASSPORT';
  if (url.includes('/bind')) return 'BIND_VEHICLE';
  if (url.includes('/vehicle-image')) return 'UPLOAD_IMAGE';
  if (url.includes('/bmu/data')) return 'RECORD_BMU';
  if (url.includes('/invalidate')) return 'INVALIDATE_BMU';
  if (url.includes('/correct')) return 'CORRECT_DATA';
  if (url.includes('/materials') && method === 'POST') return 'REGISTER_MATERIAL';
  if (url.includes('/maintenance') && url.includes('/request')) return 'REQUEST_MAINTENANCE';
  if (url.includes('/maintenance') && url.includes('/log')) return 'LOG_MAINTENANCE';
  if (url.includes('/maintenance') && url.includes('/accident')) return 'LOG_ACCIDENT';
  if (url.includes('/analysis') && url.includes('/request')) return 'REQUEST_ANALYSIS';
  if (url.includes('/analysis') && url.includes('/result')) return 'SUBMIT_ANALYSIS';
  if (url.includes('/recycling') && url.includes('/availability')) return 'SET_RECYCLE';
  if (url.includes('/recycling') && url.includes('/extract')) return 'EXTRACT_MATERIALS';
  if (url.includes('/recycling') && url.includes('/dispose')) return 'DISPOSE_BATTERY';
  if (url.includes('/vc/issue')) return 'ISSUE_VC';
  if (url.includes('/vc/revoke')) return 'REVOKE_VC';
  if (url.includes('/vc/verify')) return 'VERIFY_VC';
  if (method === 'GET') return 'QUERY';
  return 'OTHER';
}

function extractTargetId(url) {
  const patterns = [
    /\/passports\/([^\/\?]+)/,
    /\/maintenance\/([^\/\?]+)/,
    /\/analysis\/([^\/\?]+)/,
    /\/recycling\/([^\/\?]+)/,
    /\/materials\/([^\/\?]+)/,
    /\/vc\/([^\/\?]+)/,
    /\/bmu\/records\/([^\/\?]+)/,
    /\/bmu\/invalidate\/([^\/\?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function sanitizeBody(body) {
  if (!body) return undefined;
  const clean = { ...body };
  delete clean.password;
  delete clean.token;
  delete clean.secret;
  delete clean.signature;
  return clean;
}

function getAuditLogs(query = {}) {
  let logs = [...recentLogs];

  if (query.action) logs = logs.filter(l => l.action === query.action);
  if (query.userId) logs = logs.filter(l => l.userId === query.userId);
  if (query.orgMsp) logs = logs.filter(l => l.orgMsp === query.orgMsp);
  if (query.success === 'true') logs = logs.filter(l => l.success);
  if (query.success === 'false') logs = logs.filter(l => !l.success);
  if (query.writeOnly === 'true') logs = logs.filter(l => l.action !== 'QUERY');

  // Most recent first
  logs.reverse();

  const page = parseInt(query.page || '1', 10);
  const limit = Math.min(parseInt(query.limit || '50', 10), 200);
  const start = (page - 1) * limit;

  return {
    records: logs.slice(start, start + limit),
    total: logs.length,
    page,
    limit,
  };
}

module.exports = { auditMiddleware, getAuditLogs };
