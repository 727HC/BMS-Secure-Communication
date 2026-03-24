/**
 * Audit Log Middleware
 * Records all API actions for compliance monitoring and traceability.
 */

const auditLogs = [];
const MAX_LOGS = 10000;

function auditMiddleware(req, res, next) {
  // Skip GET requests and non-API paths for noise reduction
  const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  const isApi = req.originalUrl.startsWith('/api/');
  if (!isApi) return next();

  const startTime = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    const entry = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
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

    auditLogs.unshift(entry);
    if (auditLogs.length > MAX_LOGS) auditLogs.length = MAX_LOGS;

    return originalJson(body);
  };

  next();
}

function classifyAction(method, url) {
  if (url.includes('/auth/login')) return 'LOGIN';
  if (url.includes('/auth/register')) return 'REGISTER';
  if (url.includes('/passports') && method === 'POST' && !url.includes('/')) return 'CREATE_PASSPORT';
  if (url.includes('/bind')) return 'BIND_VEHICLE';
  if (url.includes('/vehicle-image')) return 'UPLOAD_IMAGE';
  if (url.includes('/bmu/data')) return 'RECORD_BMU';
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
  // Extract passport/material/credential ID from URL
  const patterns = [
    /\/passports\/([^\/\?]+)/,
    /\/maintenance\/([^\/\?]+)/,
    /\/analysis\/([^\/\?]+)/,
    /\/recycling\/([^\/\?]+)/,
    /\/materials\/([^\/\?]+)/,
    /\/vc\/([^\/\?]+)/,
    /\/bmu\/records\/([^\/\?]+)/,
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
  // Remove sensitive fields
  delete clean.password;
  delete clean.token;
  delete clean.secret;
  return clean;
}

function getAuditLogs(query = {}) {
  let logs = [...auditLogs];

  if (query.action) logs = logs.filter(l => l.action === query.action);
  if (query.userId) logs = logs.filter(l => l.userId === query.userId);
  if (query.orgMsp) logs = logs.filter(l => l.orgMsp === query.orgMsp);
  if (query.success === 'true') logs = logs.filter(l => l.success);
  if (query.success === 'false') logs = logs.filter(l => !l.success);
  if (query.writeOnly === 'true') logs = logs.filter(l => l.action !== 'QUERY');

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
