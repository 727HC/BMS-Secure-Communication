const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.FABRIC_ADMIN_SECRET ||= 'test-admin-secret';
process.env.FABRIC_ORG1_MSP ||= 'ManufacturerMSP';
process.env.FABRIC_ORG1_DOMAIN ||= 'manufacturer.example.com';
process.env.FABRIC_ORG1_CA_NAME ||= 'ca-manufacturer';
process.env.CLOUD_AGENT_API_KEY ||= 'test-cloud-agent-key';

const sigintListenersBeforeImport = process.listenerCount('SIGINT');
const sigtermListenersBeforeImport = process.listenerCount('SIGTERM');
const serverModule = require('../server');

test('server import exposes app factory without registering shutdown handlers', () => {
  assert.equal(typeof serverModule, 'function');
  assert.equal(typeof serverModule.createApp, 'function');
  assert.equal(typeof serverModule.startServer, 'function');
  assert.equal(typeof serverModule.shutdown, 'function');
  assert.equal(process.listenerCount('SIGINT'), sigintListenersBeforeImport);
  assert.equal(process.listenerCount('SIGTERM'), sigtermListenersBeforeImport);
});

test('createApp builds an Express app without starting a listener', () => {
  const app = serverModule.createApp();

  assert.equal(typeof app, 'function');
  assert.equal(typeof app.use, 'function');
  assert.equal(typeof app.listen, 'function');
});
