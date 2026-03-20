const express = require('express');
const path = require('path');
const fabricService = require('./services/fabric.service');
const fabricConfig = require('./config/fabric');

const app = express();
app.use(express.json());

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
      console.log(`Battery Passport Agent running at http://localhost:${PORT}`);
      console.log(`  Org: ${fabricConfig.currentOrg.mspId}`);
      console.log(`  Channel: ${fabricConfig.channelName}`);
      console.log(`  Contract: ${fabricConfig.contractName}`);
    });
  })
  .catch((err) => {
    console.error('Fabric connection failed:', err.message);
    console.log('Starting without Fabric (DID/auth API only)');
    app.listen(PORT, () => {
      console.log(`Battery Passport Agent running at http://localhost:${PORT} (no Fabric)`);
    });
  });
