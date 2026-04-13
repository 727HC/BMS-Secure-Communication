const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const fabricService = require('./services/fabric.service');
const fabricConfig = require('./config/fabric');
const { createLogger } = require('./services/logger.service');
const log = createLogger('system');

const { auditMiddleware, getAuditLogs } = require('./middleware/audit');

const app = express();
app.use(express.json());
app.use(auditMiddleware);

const legacyFrontendDir = path.join(__dirname, '..', 'webapp', 'frontend');
const reactFrontendDistDir = path.join(__dirname, '..', 'webapp', 'frontend-react', 'dist');
const reactFrontendIndex = path.join(reactFrontendDistDir, 'index.html');
const hasReactBuild = fs.existsSync(reactFrontendIndex);

app.use('/legacy', express.static(legacyFrontendDir));
if (hasReactBuild) {
  app.use(express.static(reactFrontendDistDir));
}

// API routes
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
    org: fabricConfig.currentOrg.mspId,
  });
});
app.use('/api', apiRouter);

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
  log.error('Unhandled error', { error: err.message, path: req.path });
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({ error: message });
});

// Graceful shutdown
async function shutdown() {
  await fabricService.disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start
const PORT = process.env.PORT || 3001;
fabricService.connectFabric()
  .then(() => {
    app.listen(PORT, () => {
      log.info('Agent started', {
        url: `http://localhost:${PORT}`,
        org: fabricConfig.currentOrg.mspId,
        channel: fabricConfig.channelName,
        contract: fabricConfig.contractName,
      });
    });
  })
  .catch((err) => {
    if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_FABRIC === 'true') {
      log.error('Fabric connection required but failed — aborting', { error: err.message });
      process.exit(1);
    }
    log.warn('Fabric connection failed, starting without Fabric', { error: err.message });
    app.listen(PORT, () => {
      log.info('Agent started (no Fabric)', { url: `http://localhost:${PORT}` });
    });
  });
