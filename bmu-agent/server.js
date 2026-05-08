const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const fabricService = require('./services/fabric.service');
const fabricConfig = require('./config/fabric');
const { createLogger } = require('./services/logger.service');
const log = createLogger('system');

const { auditMiddleware, getAuditLogs } = require('./middleware/audit');

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function securityHeaders(allowedOrigins = getAllowedOrigins()) {
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  };
}

function createApiRouter() {
  const apiRouter = express.Router();
  apiRouter.use('/auth', require('./routes/auth.routes'));
  apiRouter.use('/passports', require('./routes/passport.routes'));
  apiRouter.use('/bmu', require('./routes/bmu.routes'));
  apiRouter.use('/materials', require('./routes/material.routes'));
  apiRouter.use('/maintenance', require('./routes/maintenance.routes'));
  apiRouter.use('/analysis', require('./routes/analysis.routes'));
  apiRouter.use('/recycling', require('./routes/recycling.routes'));
  apiRouter.use('/did', require('./routes/did.routes'));
  apiRouter.use('/vc', require('./routes/vc.routes'));
  apiRouter.use('/realtime', require('./routes/realtime.routes'));
  // Audit log API (ManufacturerMSP, RegulatorMSP only)
  const { authenticateToken: auditAuth } = require('./middleware/auth');
  const { requireMSP: auditRbac } = require('./middleware/rbac');
  const { MSP: auditMSP } = require('./config/constants');
  apiRouter.get('/audit', auditAuth, auditRbac(auditMSP.MANUFACTURER, auditMSP.REGULATOR), (req, res) => {
    res.json(getAuditLogs(req.query));
  });
  apiRouter.get('/status', (req, res) => {
    res.json({
      fabric: fabricService.isConnected() ? 'connected' : 'disconnected',
      channel: fabricConfig.channelName,
      contract: fabricConfig.contractName,
      org: fabricConfig.currentOrg?.mspId || null,
    });
  });
  return apiRouter;
}

function createApp() {
  const app = express();

  app.use(securityHeaders());
  app.use(express.json({ limit: '64kb' }));
  app.use(auditMiddleware);

  const legacyFrontendDir = path.join(__dirname, '..', 'webapp', 'frontend');
  const reactFrontendDistDir = path.join(__dirname, '..', 'webapp', 'frontend-react', 'dist');
  const reactFrontendIndex = path.join(reactFrontendDistDir, 'index.html');
  const hasReactBuild = fs.existsSync(reactFrontendIndex);

  app.use('/legacy', express.static(legacyFrontendDir));
  if (hasReactBuild) {
    app.use(express.static(reactFrontendDistDir));
  }

  app.use('/api', createApiRouter());

  // API 404 — unknown /api/* 경로는 JSON 응답
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // SPA fallback — React at /, legacy Vue at /legacy
  app.use((req, res) => {
    if (req.path.startsWith('/legacy')) {
      return res.sendFile(path.join(legacyFrontendDir, 'index.html'));
    }
    if (hasReactBuild) {
      return res.sendFile(reactFrontendIndex);
    }
    return res.sendFile(path.join(legacyFrontendDir, 'index.html'));
  });

  // Central error handler — JSON parse, multer, 내부 에러 통합 처리
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large' });
    }
    if (err.code === 'UNSUPPORTED_VEHICLE_IMAGE') {
      return res.status(400).json({ error: err.message });
    }
    log.error('Unhandled error', { error: err.message, path: req.path });
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(500).json({ error: message });
  });

  return app;
}

// Graceful shutdown
async function shutdown({ exit = true } = {}) {
  await fabricService.disconnect();
  if (exit) process.exit(0);
}

function registerShutdownHandlers() {
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function startServer({ app = createApp(), port = process.env.PORT || 3001 } = {}) {
  try {
    await fabricService.connectFabric();
    return app.listen(port, () => {
      log.info('Agent started', {
        url: `http://localhost:${port}`,
        org: fabricConfig.currentOrg?.mspId || null,
        channel: fabricConfig.channelName,
        contract: fabricConfig.contractName,
      });
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_FABRIC === 'true') {
      log.error('Fabric connection required but failed — aborting', { error: err.message });
      process.exit(1);
    }
    log.warn('Fabric connection failed, starting without Fabric', { error: err.message });
    return app.listen(port, () => {
      log.info('Agent started (no Fabric)', { url: `http://localhost:${port}` });
    });
  }
}

const app = createApp();

if (require.main === module) {
  registerShutdownHandlers();
  startServer({ app });
}

module.exports = app;
module.exports.createApp = createApp;
module.exports.startServer = startServer;
module.exports.shutdown = shutdown;
module.exports.securityHeaders = securityHeaders;
