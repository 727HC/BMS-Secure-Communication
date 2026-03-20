const express = require('express');
const path = require('path');
const fabricService = require('./services/fabric.service');
const fabricConfig = require('./config/fabric');

const app = express();
app.use(express.json());

// Static files — webapp frontend
app.use(express.static(path.join(__dirname, '..', 'webapp', 'frontend')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/passports', require('./routes/passport.routes'));
app.use('/api/bmu', require('./routes/bmu.routes'));
app.use('/api/materials', require('./routes/material.routes'));
app.use('/api/maintenance', require('./routes/maintenance.routes'));
app.use('/api/analysis', require('./routes/analysis.routes'));
app.use('/api/recycling', require('./routes/recycling.routes'));
app.use('/api/did', require('./routes/did.routes'));

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    fabric: fabricService.isConnected() ? 'connected' : 'disconnected',
    channel: fabricConfig.channelName,
    contract: fabricConfig.contractName,
    org: fabricConfig.currentOrg.mspId,
  });
});

// SPA fallback — serve index.html for non-API routes
app.get('*', (req, res) => {
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
