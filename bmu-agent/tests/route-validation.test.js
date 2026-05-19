const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

process.env.JWT_SECRET ||= 'test-jwt-secret';
process.env.FABRIC_ADMIN_SECRET ||= 'test-admin-secret';
process.env.FABRIC_ORG1_MSP ||= 'ManufacturerMSP';
process.env.FABRIC_ORG1_DOMAIN ||= 'manufacturer.example.com';
process.env.FABRIC_ORG1_CA_NAME ||= 'ca-manufacturer';
process.env.FABRIC_ORG2_MSP ||= 'EVManufacturerMSP';
process.env.FABRIC_ORG2_DOMAIN ||= 'evmanufacturer.example.com';
process.env.FABRIC_ORG2_CA_NAME ||= 'ca-evmanufacturer';
process.env.FABRIC_ORG3_MSP ||= 'ServiceMSP';
process.env.FABRIC_ORG3_DOMAIN ||= 'service.example.com';
process.env.FABRIC_ORG3_CA_NAME ||= 'ca-service';
process.env.FABRIC_ORG4_MSP ||= 'RegulatorMSP';
process.env.FABRIC_ORG4_DOMAIN ||= 'regulator.example.com';
process.env.FABRIC_ORG4_CA_NAME ||= 'ca-regulator';
process.env.CLOUD_AGENT_API_KEY ||= 'test-cloud-agent-key';
process.env.CLOUD_AGENT_BASE ||= 'http://127.0.0.1:1';

const serverModule = require('../server');
const { generateToken } = require('../services/auth.service');
const fabricService = require('../services/fabric.service');
const didService = require('../services/did.service');
const bmuRoutes = require('../routes/bmu.routes');
const {
  recordRuntimeBmuSnapshot,
  clearRuntimeBmuSnapshots,
} = require('../services/runtimeBmuSnapshot.service');

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function request(server, path, { token, method = 'GET', body } = {}) {
  const { port } = server.address();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

function mockFabric(t, handlers = {}) {
  const originalEvaluate = fabricService.evaluateTransaction;
  const originalSubmit = fabricService.submitTransaction;
  fabricService.evaluateTransaction = async (name, args, userCtx) => {
    if (handlers.evaluate) return handlers.evaluate(name, args, userCtx);
    return Buffer.from('{}');
  };
  fabricService.submitTransaction = async (name, args, userCtx) => {
    if (handlers.submit) return handlers.submit(name, args, userCtx);
    return Buffer.from('');
  };
  t.after(() => {
    fabricService.evaluateTransaction = originalEvaluate;
    fabricService.submitTransaction = originalSubmit;
  });
}

function mockDidSignature(t, value = true) {
  const originalVerify = didService.verifySignature;
  didService.verifySignature = async () => value;
  t.after(() => {
    didService.verifySignature = originalVerify;
  });
}

function buildBmuPayload({ bmsBindingCode32 = 0, freshnessCounter = 42 } = {}) {
  const buf = Buffer.alloc(48);
  buf.writeFloatLE(-15.25, 0);
  buf.writeFloatLE(403.5, 4);
  buf.writeUInt16LE(32768, 8);
  buf.writeUInt16LE(1234, 10);
  buf.writeUInt16LE(4567, 12);
  for (let i = 0; i < 11; i += 1) buf.writeUInt8(128, 14 + i);
  for (let i = 0; i < 11; i += 1) buf.writeUInt8(128, 25 + i);
  buf.writeUInt16LE(500, 36);
  buf.writeUInt8(0x07, 38);
  buf.writeUInt8(11, 39);
  buf.writeUInt32LE(freshnessCounter, 40);
  buf.writeUInt32LE(bmsBindingCode32, 44);
  return buf.toString('hex');
}

test('auth routes reject ambiguous orgNum before Fabric login', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());

  const res = await request(server, '/api/auth/login', {
    method: 'POST',
    body: { userId: 'alice', password: 'pw', orgNum: '1abc' },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /orgNum must be an integer/);
});

test('paginated passport list rejects invalid pageSize before Fabric query', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('alice', 'ManufacturerMSP');

  const res = await request(server, '/api/passports?pageSize=100abc', { token });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.equal(res.body.error, 'pageSize must be a positive integer');
});

test('passport detail overlays latest BMU data when snapshot fields are stale', async (t) => {
  clearRuntimeBmuSnapshots();
  t.after(() => clearRuntimeBmuSnapshots());
  mockFabric(t, {
    evaluate(name, args) {
      if (name === 'QueryPassport') {
        assert.deepEqual(args, ['PASSPORT-1']);
        return Buffer.from(JSON.stringify({
          passportId: 'PASSPORT-1',
          currentSoc: 0,
          currentSoh: 100,
          totalDischargeCycles: 0,
          updatedAt: '2026-05-08T00:00:00Z',
        }));
      }
      if (name === 'QueryBMURecordsByPassport') {
        assert.deepEqual(args, ['PASSPORT-1', '1', '']);
        return Buffer.from(JSON.stringify({
          records: [{
            recordId: 'BMU-LATEST',
            soc: 50000,
            temperature: 34567,
            statusFlags: 3,
            dischargeCycles: 9,
            timestamp: '2026-05-08T04:50:00Z',
            rawPayloadHashVerified: true,
          }],
          bookmark: '',
          count: 1,
        }));
      }
      throw new Error(`unexpected evaluate ${name}`);
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/passports/PASSPORT-1', { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.currentSoc, 50000);
  assert.equal(res.body.temperature, 34567);
  assert.equal(res.body.totalDischargeCycles, 9);
  assert.equal(res.body.lastBMUDataID, 'BMU-LATEST');
  assert.equal(res.body.latestRawPayloadHashVerified, true);
  assert.equal(res.body.updatedAt, '2026-05-08T04:50:00Z');
});

test('regulatory verification rejects unsupported status before Fabric submit', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('regulator', 'RegulatorMSP');

  const res = await request(server, '/api/passports/PASSPORT-1/regulatory-verification', {
    token,
    method: 'PUT',
    body: { status: 'DONE', evidenceIds: [] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /status must be one of/);
});

test('passport correction rejects invalid extension JSON before Fabric submit', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/passports/PASSPORT-1/correct', {
    token,
    method: 'POST',
    body: {
      fieldName: 'extensionInfo',
      newValue: '{bad',
      reason: '초기 속성 보완',
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.equal(res.body.error, 'extensionInfo must be valid JSON');
});

test('passport correction rejects non-numeric recycledElementContent values before Fabric submit', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/passports/PASSPORT-1/correct', {
    token,
    method: 'POST',
    body: {
      fieldName: 'recycledElementContent',
      newValue: '{"cobalt":"12"}',
      reason: '초기 속성 보완',
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.equal(res.body.error, 'recycledElementContent.cobalt must be a number between 0 and 100');
});

test('passport correction allows valid extension JSON through route validation', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/passports/PASSPORT-1/correct', {
    token,
    method: 'POST',
    body: {
      fieldName: 'extensionInfo',
      newValue: '{"bmsProfile":"BMS-v3"}',
      reason: '초기 속성 보완',
    },
  });

  assert.equal(res.status, 500);
  assert.equal(res.body.category, 'INTERNAL');
});

test('recycling extraction requires a non-empty rates object', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('regulator', 'RegulatorMSP');

  const res = await request(server, '/api/recycling/PASSPORT-1/extract', {
    token,
    method: 'POST',
    body: { recyclingRates: [] },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.equal(res.body.error, 'recyclingRates must be an object');
});

test('passport extended attributes use SetPassportExtendedAttributes and validate JSON vocabulary', async (t) => {
  let submitted;
  mockFabric(t, {
    submit(name, args) {
      submitted = { name, args };
      return Buffer.from('');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const invalid = await request(server, '/api/passports/PASSPORT-1/extended-attributes', {
    token,
    method: 'POST',
    body: {
      recycledElementContent: '{"unobtainium":1}',
      reason: 'initial extended attributes',
    },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.category, 'VAL');
  assert.equal(invalid.body.error, 'unknown recycledElementContent key: unobtainium');

  const res = await request(server, '/api/passports/PASSPORT-1/extended-attributes', {
    token,
    method: 'POST',
    body: {
      manufacturingProcess: 'dry-room-assembly',
      disposalMethod: 'certified-recycling',
      recycledElementContent: { lithium: 12.5, Ni: 3 },
      extensionInfo: { standard: 'BMS-3Y', oracle: 'passed' },
      reason: 'initial extended attributes',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(submitted.name, 'SetPassportExtendedAttributes');
  assert.deepEqual(submitted.args, [
    'PASSPORT-1',
    'dry-room-assembly',
    'certified-recycling',
    '{"lithium":12.5,"Ni":3}',
    '{"standard":"BMS-3Y","oracle":"passed"}',
    'initial extended attributes',
  ]);
});

test('passport bms-binding defaults to embedded/BMU confirmed identifiers', async (t) => {
  let submitted;
  mockFabric(t, {
    submit(name, args) {
      submitted = { name, args };
      return Buffer.from('');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/passports/PASSPORT-1/bms-binding', {
    token,
    method: 'POST',
    body: { reason: 'initial BMS binding' },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.bmsManagementId, 'BMS-MGMT-001');
  assert.equal(res.body.bmsBindingId, 'did:battery:001#BMS-MGMT-001');
  assert.equal(res.body.bmsBindingCode32, '0x2c9a0e0c');
  assert.equal(submitted.name, 'BindBMSIdentifier');
  assert.deepEqual(submitted.args, [
    'PASSPORT-1',
    'BMS-MGMT-001',
    'did:battery:001#BMS-MGMT-001',
    'b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178',
    'initial BMS binding',
  ]);
});

test('passport bms-binding clears cached unbound DID lookup before next BMU ingest', async (t) => {
  bmuRoutes.clearDidPassportCache();
  t.after(() => bmuRoutes.clearDidPassportCache());

  const did = 'did:web:bms:CACHE';
  let didLookupCount = 0;
  let recordSubmits = 0;
  let bindSubmits = 0;

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      didLookupCount += 1;
      if (didLookupCount === 1) {
        return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-CACHE' }));
      }
      return Buffer.from(JSON.stringify({
        passportId: 'PASSPORT-CACHE',
        bmsManagementId: 'BMS-MGMT-001',
        bmsBindingCode32: 0x2c9a0e0c,
      }));
    },
    submit(name) {
      if (name === 'RecordBMUData') {
        recordSubmits += 1;
        return Buffer.from('');
      }
      if (name === 'BindBMSIdentifier') {
        bindSubmits += 1;
        return Buffer.from('');
      }
      throw new Error(`unexpected submit ${name}`);
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const beforeBinding = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 1 }),
      signature: 'a'.repeat(128),
    },
  });
  assert.equal(beforeBinding.status, 200);
  assert.equal(recordSubmits, 1);
  assert.equal(didLookupCount, 1);

  const bind = await request(server, '/api/passports/PASSPORT-CACHE/bms-binding', {
    token,
    method: 'POST',
    body: { reason: 'bind after first BMU ingest' },
  });
  assert.equal(bind.status, 200);
  assert.equal(bindSubmits, 1);

  const afterBinding = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 2 }),
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(afterBinding.status, 400);
  assert.equal(afterBinding.body.category, 'VAL');
  assert.match(afterBinding.body.error, /BMS binding code mismatch/);
  assert.equal(recordSubmits, 1);
  assert.equal(didLookupCount, 2);
});

test('passport source-verification validates boolean result and records defaults', async (t) => {
  let submitted;
  mockFabric(t, {
    submit(name, args) {
      submitted = { name, args };
      return Buffer.from('');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const invalid = await request(server, '/api/passports/PASSPORT-1/source-verification', {
    token,
    method: 'POST',
    body: { result: 'yes' },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error, 'result must be a boolean');

  const res = await request(server, '/api/passports/PASSPORT-1/source-verification', {
    token,
    method: 'POST',
    body: {},
  });

  assert.equal(res.status, 200);
  assert.equal(submitted.name, 'RecordSourceVerification');
  assert.match(submitted.args[0], /^SRC-/);
  assert.equal(submitted.args[1], 'PASSPORT-1');
  assert.equal(submitted.args[2], 'BMS_BINDING');
  assert.equal(submitted.args[3], 'did:battery:001#BMS-MGMT-001');
  assert.equal(submitted.args[4], 'b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178');
  assert.equal(submitted.args[5], 'true');
  assert.equal(submitted.args[6], '{"bmsManagementId":"BMS-MGMT-001","bmsBindingId":"did:battery:001#BMS-MGMT-001","bmsBindingCode32":"0x2c9a0e0c"}');
});

test('bmu data rejects invalid rawPayload as VAL before DID or Fabric work', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-1',
      rawPayload: '00',
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /^rawPayload size mismatch/);
});

test('bmu data rejects zero bmsBindingCode32 when binding is required', async (t) => {
  const previous = process.env.BMU_BINDING_REQUIRED;
  process.env.BMU_BINDING_REQUIRED = 'true';
  t.after(() => {
    if (previous == null) delete process.env.BMU_BINDING_REQUIRED;
    else process.env.BMU_BINDING_REQUIRED = previous;
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-1',
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0 }),
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.equal(res.body.error, 'bmsBindingCode32 required');
});

test('bmu data exposes bmsBindingCode32 evidence after successful ingest', async (t) => {
  let submitted;
  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, ['did:web:bms:PASSPORT-1']);
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-1' }));
    },
    submit(name, args) {
      submitted = { name, args };
      return Buffer.from('');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-1',
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0x12345678 }),
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.parsed.bmsBindingCode32, 0x12345678);
  assert.equal(res.body.parsed.bmsBindingCodeHex, '0x12345678');
  assert.equal(submitted.name, 'RecordBMUData');
  assert.equal(submitted.args[1], 'PASSPORT-1');
  assert.match(submitted.args[3], /^[a-f0-9]{64}$/);
  assert.match(submitted.args[13], /^\d{4}-\d{2}-\d{2}T/);
});

test('bmu data uses RecordBMUDataWithPayload when passport has BMS binding and reports comparison result', async (t) => {
  let submitted;
  const did = 'did:web:bms:BOUND';
  const rawPayload = buildBmuPayload({ bmsBindingCode32: 0x2c9a0e0c, freshnessCounter: 77 });
  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      return Buffer.from(JSON.stringify({
        passportId: 'PASSPORT-BOUND',
        bmsManagementId: 'BMS-MGMT-001',
        bmsBindingId: 'did:battery:001#BMS-MGMT-001',
        bmsBindingCode32: 0x2c9a0e0c,
      }));
    },
    submit(name, args) {
      submitted = { name, args };
      return Buffer.from('');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload,
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.bindingSignals.bmsIdentifierMatched, true);
  assert.equal(res.body.bindingSignals.expectedBmsBindingCode32, 0x2c9a0e0c);
  assert.equal(submitted.name, 'RecordBMUDataWithPayload');
  assert.equal(submitted.args[14], rawPayload);
});

test('bmu data rejects BMS binding code mismatch before chaincode submit', async (t) => {
  const did = 'did:web:bms:MISMATCH';
  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate() {
      return Buffer.from(JSON.stringify({
        passportId: 'PASSPORT-MISMATCH',
        bmsManagementId: 'BMS-MGMT-001',
        bmsBindingCode32: 0x2c9a0e0c,
      }));
    },
    submit() {
      throw new Error('submit should not be called');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0x12345678 }),
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /BMS binding code mismatch/);
});

test('realtime passport falls back to Fabric and overlays latest BMU record', async (t) => {
  clearRuntimeBmuSnapshots();
  t.after(() => clearRuntimeBmuSnapshots());
  mockFabric(t, {
    evaluate(name, args) {
      if (name === 'QueryPassport') {
        assert.deepEqual(args, ['PASSPORT-1']);
        return Buffer.from(JSON.stringify({
          passportId: 'PASSPORT-1',
          currentSoc: 0,
          temperature: null,
          updatedAt: '2026-05-08T00:00:00Z',
        }));
      }
      if (name === 'QueryBMURecordsByPassport') {
        assert.deepEqual(args, ['PASSPORT-1', '1', '']);
        return Buffer.from(JSON.stringify({
          records: [{
            recordId: 'BMU-1',
            soc: 32768,
            temperature: 4567,
            statusFlags: 7,
            dischargeCycles: 1234,
            timestamp: '2026-05-08T04:31:13Z',
            bmsBindingCode32: 0x2c9a0e0c,
            rawPayloadHashVerified: true,
          }],
          bookmark: '',
          count: 1,
        }));
      }
      throw new Error(`unexpected evaluate ${name}`);
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/realtime/passports/PASSPORT-1', { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.currentSoc, 32768);
  assert.equal(res.body.temperature, 4567);
  assert.equal(res.body.statusFlags, 7);
  assert.equal(res.body.totalDischargeCycles, 1234);
  assert.equal(res.body.lastBMUDataID, 'BMU-1');
  assert.equal(res.body.updatedAt, '2026-05-08T04:31:13Z');
});

test('realtime passport list falls back to Fabric and prepends runtime BMU passport', async (t) => {
  clearRuntimeBmuSnapshots();
  t.after(() => clearRuntimeBmuSnapshots());
  recordRuntimeBmuSnapshot({
    passportId: 'PASSPORT-LIVE',
    recordId: 'BMU-LIVE',
    soc: 40000,
    temperature: 33000,
    statusFlags: 1,
    dischargeCycles: 12,
    timestamp: '2026-05-08T05:00:00Z',
    bmsBindingCode32: 0x2c9a0e0c,
  });

  mockFabric(t, {
    evaluate(name, args) {
      if (name === 'QueryPassportsWithPagination') {
        assert.deepEqual(args, ['2', '']);
        return Buffer.from(JSON.stringify({
          records: [{ passportId: 'PASSPORT-OLD', currentSoc: 0, updatedAt: '2026-05-08T00:00:00Z' }],
          bookmark: '',
          count: 1,
        }));
      }
      if (name === 'QueryBMURecordsByPassport') {
        assert.deepEqual(args, ['PASSPORT-OLD', '1', '']);
        return Buffer.from(JSON.stringify({ records: [], bookmark: '', count: 0 }));
      }
      if (name === 'QueryPassport') {
        assert.deepEqual(args, ['PASSPORT-LIVE']);
        return Buffer.from(JSON.stringify({
          passportId: 'PASSPORT-LIVE',
          currentSoc: 0,
          updatedAt: '2026-05-08T00:00:00Z',
        }));
      }
      throw new Error(`unexpected evaluate ${name}`);
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/realtime/passports?pageSize=2', { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.records[0].passportId, 'PASSPORT-LIVE');
  assert.equal(res.body.records[0].currentSoc, 40000);
  assert.equal(res.body.records[0].temperature, 33000);
  assert.equal(res.body.records[0].lastBMUDataID, 'BMU-LIVE');
  assert.equal(res.body.records[1].passportId, 'PASSPORT-OLD');
});

test('realtime BMU falls back to Fabric records when cloud-agent is unavailable', async (t) => {
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBMURecordsByPassport');
      assert.deepEqual(args, ['PASSPORT-1', '2', '']);
      return Buffer.from(JSON.stringify({
        records: [
          { recordId: 'BMU-2', bmsBindingCode32: 0x2c9a0e0c, rawPayloadHashVerified: true },
        ],
        bookmark: '',
        count: 1,
      }));
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/realtime/bmu/PASSPORT-1?pageSize=2', { token });

  assert.equal(res.status, 200);
  assert.equal(res.body.records[0].recordId, 'BMU-2');
  assert.equal(res.body.records[0].rawPayloadHashVerified, true);
});

test('vc issue defaults holderDid to passport.did and normalizes date-only expiresAt', async (t) => {
  const passportDid = 'did:web:bms:PASSPORT-1';
  let submitted;
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryPassport');
      assert.deepEqual(args, ['PASSPORT-1']);
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-1', did: passportDid }));
    },
    submit(name, args) {
      submitted = { name, args };
      return Buffer.from('');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/vc/issue', {
    token,
    method: 'POST',
    body: {
      passportId: 'PASSPORT-1',
      credType: 'BATTERY_PASSPORT',
      attributes: { purpose: 'demo' },
      expiresAt: '2026-05-08',
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(submitted.name, 'IssueCredential');
  assert.equal(submitted.args[1], 'PASSPORT-1');
  assert.equal(submitted.args[2], 'BATTERY_PASSPORT');
  assert.equal(submitted.args[4], passportDid);
  assert.match(submitted.args[7], /^[a-f0-9]{64}$/);
  assert.equal(submitted.args[8], '2026-05-08T00:00:00Z');
});

test('vc issue rejects arbitrary holderDid before chaincode submit', async (t) => {
  mockFabric(t, {
    evaluate() {
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-1', did: 'did:web:bms:PASSPORT-1' }));
    },
    submit() {
      throw new Error('submit should not be called');
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/vc/issue', {
    token,
    method: 'POST',
    body: {
      passportId: 'PASSPORT-1',
      credType: 'BATTERY_PASSPORT',
      holderDid: 'did:web:wrong-owner',
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /holder DID mismatch/);
});

test('vc issue rejects malformed expiresAt before Fabric query', async (t) => {
  let queried = false;
  mockFabric(t, {
    evaluate() {
      queried = true;
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-1', did: 'did:web:bms:PASSPORT-1' }));
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/vc/issue', {
    token,
    method: 'POST',
    body: {
      passportId: 'PASSPORT-1',
      credType: 'BATTERY_PASSPORT',
      expiresAt: '2026-05-08T99:00:00Z',
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.equal(res.body.error, 'expiresAt must be RFC3339');
  assert.equal(queried, false);
});

test('bmu reset-fc rejects MSP outside Manufacturer/Regulator', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('svc', 'ServiceMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did: 'did:web:bms:PASSPORT-1', reason: 'x'.repeat(60), confirm: true },
  });

  assert.equal(res.status, 403);
});

test('bmu reset-fc rejects reason shorter than 50 chars before Fabric submit', async (t) => {
  let submitted = false;
  mockFabric(t, {
    submit() { submitted = true; },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did: 'did:web:bms:PASSPORT-1', reason: 'too short', confirm: true },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /^reason too short/);
  assert.equal(submitted, false);
});

test('bmu reset-fc requires confirm:true to acknowledge destructive op', async (t) => {
  let submitted = false;
  mockFabric(t, {
    submit() { submitted = true; },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did: 'did:web:bms:PASSPORT-1', reason: 'BMU board reboot after firmware update on 2026-05-19', confirm: false },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /confirm must be true/);
  assert.equal(submitted, false);
});

test('bmu reset-fc rejects negative expected_next_fc', async (t) => {
  let submitted = false;
  mockFabric(t, {
    submit() { submitted = true; },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-1',
      reason: 'BMU board reboot after firmware update on 2026-05-19',
      confirm: true,
      expected_next_fc: -1,
    },
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.category, 'VAL');
  assert.match(res.body.error, /expected_next_fc must be a non-negative integer/);
  assert.equal(submitted, false);
});

test('bmu reset-fc returns 501 when dual approval is required (feature gated)', async (t) => {
  const previous = process.env.RESET_FC_REQUIRE_DUAL_APPROVAL;
  process.env.RESET_FC_REQUIRE_DUAL_APPROVAL = 'true';
  t.after(() => {
    if (previous == null) delete process.env.RESET_FC_REQUIRE_DUAL_APPROVAL;
    else process.env.RESET_FC_REQUIRE_DUAL_APPROVAL = previous;
  });
  let submitted = false;
  mockFabric(t, {
    submit() { submitted = true; },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-1',
      reason: 'BMU board reboot after firmware update on 2026-05-19',
      confirm: true,
    },
  });

  assert.equal(res.status, 501);
  assert.equal(submitted, false);
});

test('bmu reset-fc submits ResetFCForDID with did + reason on happy path', async (t) => {
  let submittedArgs = null;
  mockFabric(t, {
    submit(name, args) {
      submittedArgs = { name, args };
    },
  });
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-1',
      reason: 'BMU board reboot after firmware update on 2026-05-19',
      confirm: true,
      expected_next_fc: 0,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.did, 'did:web:bms:PASSPORT-1');
  assert.equal(res.body.status, 'FC_RESET');
  assert.ok(submittedArgs);
  assert.equal(submittedArgs.name, 'ResetFCForDID');
  assert.deepEqual(submittedArgs.args, ['did:web:bms:PASSPORT-1', 'BMU board reboot after firmware update on 2026-05-19']);
});
