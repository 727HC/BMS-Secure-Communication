require('dotenv').config();
const express = require('express');
const path = require('path');
const fabricService = require('./services/fabric.service');
const fabricConfig = require('./config/fabric');
const { createLogger } = require('./services/logger.service');
const log = createLogger('system');

const { auditMiddleware, getAuditLogs } = require('./middleware/audit');

const app = express();
app.use(express.json());
app.use(auditMiddleware);

// Static files — webapp frontend
app.use(express.static(path.join(__dirname, '..', 'webapp', 'frontend')));

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
// Audit log API
apiRouter.get('/audit', (req, res) => {
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

// SPA fallback — serve index.html for non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'webapp', 'frontend', 'index.html'));
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
    log.warn('Fabric connection failed, starting without Fabric', { error: err.message });
    app.listen(PORT, () => {
      log.info('Agent started (no Fabric)', { url: `http://localhost:${PORT}` });
    });
  });
