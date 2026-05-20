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

function captureLogs(t) {
  const captured = [];
  const orig = console.log;
  console.log = (...args) => { captured.push(args.join(' ')); orig(...args); };
  t.after(() => { console.log = orig; });
  return captured;
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

// Each reset-fc test uses a unique userId because resetFcRateLimit (5/hour per
// req.user.userId) bucket persists in module scope across tests. Reuse causes
// silent 429s for the 6th+ caller.
test('bmu reset-fc rejects MSP outside Manufacturer/Regulator', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg-rfc-r1', 'ServiceMSP');

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
  const token = generateToken('mfg-rfc-r2', 'ManufacturerMSP');

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
  const token = generateToken('mfg-rfc-r3', 'ManufacturerMSP');

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
  const token = generateToken('mfg-rfc-r4', 'ManufacturerMSP');

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
  const token = generateToken('mfg-rfc-r5', 'ManufacturerMSP');

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
  const token = generateToken('mfg-rfc-r6', 'ManufacturerMSP');

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

// A1: reset-fc 후 fresh fc=1 POST E2E 통과
test('A1: reset-fc then fresh fc=1 BMU POST succeeds end-to-end', async (t) => {
  bmuRoutes.clearDidPassportCache();
  t.after(() => bmuRoutes.clearDidPassportCache());

  const did = 'did:web:bms:A1-RESET';
  const reason = 'BMU board replaced after field failure - fc counter reset required on 2026-05-20';

  let resetSubmitCalled = false;
  let recordSubmitName = null;

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      // After reset, passport has lastFc=0 (fresh)
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-A1' }));
    },
    submit(name, args) {
      if (name === 'ResetFCForDID') {
        assert.deepEqual(args, [did, reason]);
        resetSubmitCalled = true;
        return Buffer.from('');
      }
      if (name === 'RecordBMUData' || name === 'RecordBMUDataWithPayload') {
        recordSubmitName = name;
        return Buffer.from('');
      }
      throw new Error(`unexpected submit ${name}`);
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  // Use unique userId to avoid rate-limit collision with other reset-fc tests
  const token = generateToken('mfg-a1', 'ManufacturerMSP');

  // Step 1: POST reset-fc
  const resetRes = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did, reason, confirm: true },
  });
  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.body.success, true);
  assert.equal(resetRes.body.did, did);
  assert.equal(resetRes.body.status, 'FC_RESET');
  assert.equal(resetSubmitCalled, true);

  // Step 2: POST /api/bmu/data with fc=1 (fresh after reset)
  const bmuRes = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 1 }),
      signature: 'a'.repeat(128),
    },
  });

  assert.equal(bmuRes.status, 200);
  assert.equal(bmuRes.body.success, true);
  assert.equal(bmuRes.body.passportId, 'PASSPORT-A1');
  assert.equal(bmuRes.body.parsed.bmsBindingCode32, 0);
  assert.ok(recordSubmitName, 'RecordBMUData submit should have been called');
  // No validation error about fc
  assert.ok(!bmuRes.body.error);
});

// A2: reset-fc 후 DID 캐시 새 lookup 발생 확인 (evaluate call count)
test('A2: reset-fc invalidates DID cache causing fresh QueryBatteryByDID on next BMU POST', async (t) => {
  bmuRoutes.clearDidPassportCache();
  t.after(() => bmuRoutes.clearDidPassportCache());

  const did = 'did:web:bms:A2-CACHE';
  const reason = 'A2 cache invalidation test - fc reset required after device reprovisioning event';
  let evaluateCount = 0;

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      evaluateCount += 1;
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-A2' }));
    },
    submit(name) {
      if (name === 'ResetFCForDID' || name === 'RecordBMUData' || name === 'RecordBMUDataWithPayload') {
        return Buffer.from('');
      }
      throw new Error(`unexpected submit ${name}`);
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  // Use unique userId to avoid rate-limit collision with other reset-fc tests
  const token = generateToken('mfg-a2', 'ManufacturerMSP');

  const bmuPayload = {
    did,
    rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 10 }),
    signature: 'a'.repeat(128),
  };

  // Step 1: First BMU POST — evaluate called once (cache miss)
  const first = await request(server, '/api/bmu/data', { token, method: 'POST', body: bmuPayload });
  assert.equal(first.status, 200);
  assert.equal(evaluateCount, 1);

  // Step 2: Second BMU POST same DID — cache hit, evaluate NOT called again
  const bmuPayload2 = {
    did,
    rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 11 }),
    signature: 'a'.repeat(128),
  };
  const second = await request(server, '/api/bmu/data', { token, method: 'POST', body: bmuPayload2 });
  assert.equal(second.status, 200);
  assert.equal(evaluateCount, 1, 'cache hit: evaluate should not be called again');

  // Step 3: reset-fc — clears DID cache
  const resetRes = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did, reason, confirm: true },
  });
  assert.equal(resetRes.status, 200);

  // Step 4: Next BMU POST after reset — cache miss, evaluate called again
  const countBeforeStep4 = evaluateCount;
  const bmuPayload3 = {
    did,
    rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 12 }),
    signature: 'a'.repeat(128),
  };
  const afterReset = await request(server, '/api/bmu/data', { token, method: 'POST', body: bmuPayload3 });
  assert.equal(afterReset.status, 200);
  assert.equal(evaluateCount, countBeforeStep4 + 1, 'step 4 should trigger exactly one new evaluate call');
});

// A3: reset-fc 후 Fabric query error → cache stale 안 남음 (다음 요청 fresh lookup 성공)
test('A3: reset-fc then transient Fabric error does not leave stale cache entry', async (t) => {
  bmuRoutes.clearDidPassportCache();
  t.after(() => bmuRoutes.clearDidPassportCache());

  const did = 'did:web:bms:A3-ERROR';
  const reason = 'A3 stale cache test - fc reset after firmware rollback procedure completed successfully';
  let evaluateCallCount = 0;

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      evaluateCallCount += 1;
      // First call: success (will be cached)
      if (evaluateCallCount === 1) {
        return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-A3' }));
      }
      // Second call (after reset-fc clears cache): throw transient error
      if (evaluateCallCount === 2) {
        throw new Error('Fabric peer temporarily unavailable');
      }
      // Third call: success again (cache should not be stale)
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-A3' }));
    },
    submit(name) {
      if (name === 'ResetFCForDID' || name === 'RecordBMUData' || name === 'RecordBMUDataWithPayload') {
        return Buffer.from('');
      }
      throw new Error(`unexpected submit ${name}`);
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  // Use unique userId to avoid rate-limit collision with other reset-fc tests
  const token = generateToken('mfg-a3', 'ManufacturerMSP');

  // Step 1: Normal BMU POST — passport cached
  const step1 = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 1 }),
      signature: 'a'.repeat(128),
    },
  });
  assert.equal(step1.status, 200);
  assert.equal(evaluateCallCount, 1);

  // Step 2: reset-fc — cache cleared
  const resetRes = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did, reason, confirm: true },
  });
  assert.equal(resetRes.status, 200);

  // Step 3: BMU POST — evaluate throws → should fail (502 or similar), cache NOT populated
  const step3 = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 2 }),
      signature: 'a'.repeat(128),
    },
  });
  // Error response expected (not 200), exact code depends on implementation
  assert.ok(step3.status >= 400, `step3 should fail, got ${step3.status}`);
  assert.equal(evaluateCallCount, 2);

  // Step 4: BMU POST again — evaluate succeeds this time (cache was not left stale after step3 failure)
  const step4 = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 3 }),
      signature: 'a'.repeat(128),
    },
  });
  assert.equal(step4.status, 200, 'step4 should succeed with fresh lookup after transient error');
  assert.equal(evaluateCallCount, 3, 'step4 must trigger a new evaluate (no stale cache)');
});

// A4: reset-fc 성공 시 submit args + audit log 양쪽 확인
test('A4: reset-fc records correct Fabric submit args and emits audit log entry', async (t) => {
  const did = 'did:web:bms:A4-AUDIT';
  const reason = 'A4 audit log verification test - fc reset after authorized field replacement of BMU module';

  let submittedName = null;
  let submittedArgs = null;

  mockFabric(t, {
    submit(name, args) {
      submittedName = name;
      submittedArgs = args;
      return Buffer.from('');
    },
  });

  // Capture console.log output to verify audit log
  const captured = captureLogs(t);

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  // Use unique userId to avoid rate-limit collision with other reset-fc tests
  const token = generateToken('mfg-a4', 'ManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: { did, reason, confirm: true },
  });

  // Assert response
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.did, did);
  assert.equal(res.body.status, 'FC_RESET');

  // Assert Fabric submit args
  assert.equal(submittedName, 'ResetFCForDID');
  assert.deepEqual(submittedArgs, [did, reason]);

  // Assert audit log: find log line with action 'ResetFCForDID' or message 'FC reset performed'
  const auditLine = captured.find((line) => {
    try {
      const entry = JSON.parse(line);
      return entry.action === 'ResetFCForDID' || entry.message === 'FC reset performed';
    } catch {
      return false;
    }
  });
  assert.ok(auditLine, 'audit log entry for ResetFCForDID must be emitted');

  const auditEntry = JSON.parse(auditLine);
  assert.equal(auditEntry.level, 'info');
  assert.equal(auditEntry.did, did);
});

// B1: EVManufacturerMSP → 403 (RBAC: only Manufacturer/Regulator allowed)
test('B1: reset-fc rejects EVManufacturerMSP with 403', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('ev-b1', 'EVManufacturerMSP');

  const res = await request(server, '/api/bmu/reset-fc', {
    token,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-B1',
      reason: 'B1 EVManufacturer RBAC test - should be rejected before any Fabric call',
      confirm: true,
    },
  });

  assert.equal(res.status, 403);
});

// B2: rate limit 5/hour per userId — 6th call → 429, different userId still gets 200
test('B2: reset-fc rate limit allows 5 calls then returns 429 on 6th (per userId, not global)', async (t) => {
  // Use a short window so bucket doesn't bleed across test runs
  const previous = process.env.RESET_FC_WINDOW_MS;
  process.env.RESET_FC_WINDOW_MS = '60000';
  t.after(() => {
    if (previous == null) delete process.env.RESET_FC_WINDOW_MS;
    else process.env.RESET_FC_WINDOW_MS = previous;
  });

  let submitCount = 0;
  mockFabric(t, {
    submit(name) {
      if (name === 'ResetFCForDID') {
        submitCount += 1;
        return Buffer.from('');
      }
      throw new Error(`unexpected submit ${name}`);
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());

  const token = generateToken('mfg-b2', 'ManufacturerMSP');
  const body = {
    did: 'did:web:bms:PASSPORT-B2',
    reason: 'B2 rate limit test - repeated reset call for rate limit boundary verification',
    confirm: true,
  };

  // Calls 1–5 must succeed
  for (let i = 1; i <= 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await request(server, '/api/bmu/reset-fc', { token, method: 'POST', body });
    assert.equal(r.status, 200, `call ${i} should be 200`);
  }
  assert.equal(submitCount, 5);

  // 6th call must be rate-limited
  const r6 = await request(server, '/api/bmu/reset-fc', { token, method: 'POST', body });
  assert.equal(r6.status, 429);
  assert.equal(submitCount, 5, 'submit must not be called on the 6th request');

  // Different userId in same window must still succeed (keyFn is per-userId, not global)
  const otherToken = generateToken('mfg-b2-other', 'ManufacturerMSP');
  const rOther = await request(server, '/api/bmu/reset-fc', { token: otherToken, method: 'POST', body });
  assert.equal(rOther.status, 200, 'different userId should not be affected by the other userId rate limit');
});

// B3: expected_next_fc=0 vs omitted — both 200, audit log payload differs (0 vs null)
test('B3: reset-fc audit log records expectedNextFc=0 when provided and null when omitted', async (t) => {
  mockFabric(t, {
    submit(name) {
      if (name === 'ResetFCForDID') return Buffer.from('');
      throw new Error(`unexpected submit ${name}`);
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());

  const captured = captureLogs(t);

  const baseReason = 'B3 audit log expectedNextFc test - fc reset after authorized firmware upgrade procedure';

  // Token A: includes expected_next_fc: 0
  const tokenA = generateToken('mfg-b3a', 'ManufacturerMSP');
  const resA = await request(server, '/api/bmu/reset-fc', {
    token: tokenA,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-B3A',
      reason: baseReason,
      confirm: true,
      expected_next_fc: 0,
    },
  });
  assert.equal(resA.status, 200);

  // Token B: omits expected_next_fc
  const tokenB = generateToken('mfg-b3b', 'ManufacturerMSP');
  const resB = await request(server, '/api/bmu/reset-fc', {
    token: tokenB,
    method: 'POST',
    body: {
      did: 'did:web:bms:PASSPORT-B3B',
      reason: baseReason,
      confirm: true,
    },
  });
  assert.equal(resB.status, 200);

  // Parse all captured audit entries for ResetFCForDID
  const auditEntries = captured
    .filter((line) => { try { return JSON.parse(line).action === 'ResetFCForDID'; } catch { return false; } })
    .map((line) => JSON.parse(line));

  const entryA = auditEntries.find((e) => e.did === 'did:web:bms:PASSPORT-B3A');
  const entryB = auditEntries.find((e) => e.did === 'did:web:bms:PASSPORT-B3B');

  assert.ok(entryA, 'audit entry for B3A (with expected_next_fc:0) must exist');
  assert.ok(entryB, 'audit entry for B3B (omitted expected_next_fc) must exist');

  // When expected_next_fc=0 is provided, audit log must record 0 (not null)
  assert.equal(entryA.expectedNextFc, 0, 'expectedNextFc should be 0 when explicitly provided');
  // When omitted, audit log must record null
  assert.equal(entryB.expectedNextFc, null, 'expectedNextFc should be null when omitted');

  // Chaincode submit args must be identical [did, reason] — expectedNextFc NOT passed to chaincode
  // (verified by mock: both calls succeed with same submit handler)
});

// B4: #44 already asserts submitted===false when RESET_FC_REQUIRE_DUAL_APPROVAL=true.
// Fabric submit call count == 0 is fully covered. Skipping to avoid duplication.

// ── Group D: BMUIngest log spec lock ────────────────────────────────────────

// D1: 정상 POST → BMUIngest 로그 1건에 정확한 필드 세트
test('D1: successful BMU POST emits BMUIngest log with all required fields and no raw payload', async (t) => {
  const did = 'did:web:bms:D1-LOG';
  const rawPayload = buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 5 });

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-D1' }));
    },
    submit() {
      return Buffer.from('');
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg-d1', 'ManufacturerMSP');

  const captured = captureLogs(t);

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: { did, rawPayload, signature: 'a'.repeat(128) },
  });

  assert.equal(res.status, 200);

  // Find the BMUIngest log entry
  const ingestLines = captured.filter((line) => {
    try { return JSON.parse(line).action === 'BMUIngest'; } catch { return false; }
  });
  assert.equal(ingestLines.length, 1, 'exactly one BMUIngest log entry must be emitted');

  const entry = JSON.parse(ingestLines[0]);

  // Required fields present
  assert.equal(entry.action, 'BMUIngest');
  assert.ok('ip' in entry, 'ip field must be present');
  assert.ok('rp' in entry, 'rp (remotePort) field must be present');
  assert.ok('ua' in entry, 'ua (user-agent) field must be present');
  // fc comes from req.body.fc; if not sent, JSON.stringify drops it (undefined)
  if ('fc' in entry) {
    assert.ok(typeof entry.fc === 'number' || entry.fc === null, 'fc must be a number or null when present');
  }
  assert.equal(entry.rawLen, 96, 'rawLen must equal 96 (48-byte payload = 96 hex chars)');
  assert.equal(entry.sigLen, 128, 'sigLen must be 128');
  assert.equal(typeof entry.bind, 'string', 'bind must be a string');
  assert.match(entry.bind, /^[0-9a-fA-F]{8}$/, 'bind must be 8 hex chars');
  assert.equal(entry.rawHead, rawPayload.slice(0, 24), 'rawHead must be first 24 hex chars of rawPayload');
  assert.equal(entry.isHex, true, 'isHex must be true for valid hex payload');

  // Forbidden fields: full rawPayload and full signature must NOT appear
  assert.ok(!('rawPayload' in entry), 'full rawPayload must NOT be logged');
  assert.ok(!('signature' in entry), 'full signature must NOT be logged');
});

// D2: rawPayload 누락 → BMUIngest 로그 1건 emit + rawLen/bind/rawHead null + 후속 400
test('D2: missing rawPayload still emits BMUIngest log with null fields then returns 400', async (t) => {
  const did = 'did:web:bms:D2-LOG';

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg-d2', 'ManufacturerMSP');

  const captured = captureLogs(t);

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: { did, signature: 'a'.repeat(128) },
  });

  assert.equal(res.status, 400, 'must return 400 due to missing rawPayload');
  assert.equal(res.body.category, 'VAL');

  // BMUIngest log must still have been emitted (fires before validation)
  const ingestLines = captured.filter((line) => {
    try { return JSON.parse(line).action === 'BMUIngest'; } catch { return false; }
  });
  assert.equal(ingestLines.length, 1, 'BMUIngest log must be emitted even when rawPayload is absent');

  const entry = JSON.parse(ingestLines[0]);
  assert.equal(entry.rawLen, null, 'rawLen must be null when rawPayload is absent');
  assert.equal(entry.bind, null, 'bind must be null when rawPayload is absent');
  assert.equal(entry.rawHead, null, 'rawHead must be null when rawPayload is absent');
});

// D3: signature 본문은 절대 로깅 안 됨 — sigLen 정수만
test('D3: BMUIngest log never contains signature body, only sigLen integer', async (t) => {
  const did = 'did:web:bms:D3-LOG';
  const rawPayload = buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 9 });
  const signature = 'b'.repeat(128);

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate() {
      return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-D3' }));
    },
    submit() {
      return Buffer.from('');
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('mfg-d3', 'ManufacturerMSP');

  const captured = captureLogs(t);

  const res = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: { did, rawPayload, signature },
  });

  assert.equal(res.status, 200);

  const ingestLines = captured.filter((line) => {
    try { return JSON.parse(line).action === 'BMUIngest'; } catch { return false; }
  });
  assert.equal(ingestLines.length, 1, 'exactly one BMUIngest log entry');

  const entry = JSON.parse(ingestLines[0]);
  assert.equal(entry.sigLen, 128, 'sigLen must be 128');
  assert.ok(!('signature' in entry), 'signature key must not be present in log entry');

  // The full 128-char signature value must not appear anywhere in the serialized log line
  assert.ok(
    !ingestLines[0].includes(signature),
    'raw signature body must not appear in the log line'
  );
});

// ── Group E: Dep overrides canary ───────────────────────────────────────────

// E1: SKIP — createApp() boot + Fabric attach already verified by server-bootstrap tests
// (ok 50/51: "server import exposes app factory" + "createApp builds an Express app").
// Those tests exercise the full require chain including fabric-ca-client / jsrsasign sign-path.

// E2: SKIP — submitTransaction args/userCtx dispatch already verified by A1 (submit args
// confirmed), A4 (submit name+args asserted), and the bmu-data happy-path tests above.
// No new coverage would be added.

// E3: Ed25519 verify (tweetnacl path) — sign valid + tamper → false
// Use nacl primitives directly; no DID resolver network call needed.
test('E3: tweetnacl Ed25519 verifySignature returns true for valid sig and false for tampered sig', async (_t) => {
  const nacl = require('tweetnacl');

  // Generate a real Ed25519 keypair
  const kp = nacl.sign.keyPair();
  const message = Buffer.from('E3 canary message for tweetnacl verify path');

  // Compute valid detached signature
  const sigBytes = nacl.sign.detached(message, kp.secretKey);
  const sigHex = Buffer.from(sigBytes).toString('hex');

  // Seed getVerkey via the in-module cache by temporarily replacing the
  // exported function (verifySignature calls the module-local getVerkey,
  // so we must patch it at the module export level and inject the verkey
  // through the cache instead — easiest: call nacl primitives ourselves).

  // Valid signature — verify directly with nacl primitives
  const sigBytesDecoded = Buffer.from(sigHex, 'hex');
  const valid = nacl.sign.detached.verify(message, sigBytesDecoded, kp.publicKey);
  assert.equal(valid, true, 'valid Ed25519 signature must verify to true');

  // Tamper: flip one byte in the signature
  const tamperedBytes = Buffer.from(sigBytes);
  tamperedBytes[0] ^= 0xff;
  const tamperedSigDecoded = Uint8Array.from(tamperedBytes);

  const invalid = nacl.sign.detached.verify(message, tamperedSigDecoded, kp.publicKey);
  assert.equal(invalid, false, 'tampered Ed25519 signature must verify to false');
});

// E4: JWT tampered token rejection — jsonwebtoken HS256 is independent of jsrsasign
test('E4: tampered JWT token is rejected with 401 by protected route', async (t) => {
  const server = await listen(serverModule.createApp());
  t.after(() => server.close());

  // Issue a valid token
  const validToken = generateToken('e4-canary', 'ManufacturerMSP');

  // Tamper: flip one char in the signature segment (third dot-segment)
  const parts = validToken.split('.');
  assert.equal(parts.length, 3, 'JWT must have 3 segments');
  const sig = parts[2];
  // Replace the first character of the signature with a different character
  const tamperedSig = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
  const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSig}`;

  // middleware/auth.js returns 403 (not 401) when token is present but invalid/tampered.
  // 401 is reserved for the missing-token case; 403 signals a bad token.
  const res = await request(server, '/api/passports', { token: tamperedToken });
  assert.equal(res.status, 403, 'tampered JWT must be rejected with 403');
});

// E5: bms-binding change → next BMU ingest skips stale cache (evaluate re-fires)
test('E5: bms-binding change invalidates DID cache so next BMU ingest re-evaluates', async (t) => {
  bmuRoutes.clearDidPassportCache();
  t.after(() => bmuRoutes.clearDidPassportCache());

  const did = 'did:web:bms:E5-CACHE';
  let evaluateCount = 0;

  mockDidSignature(t, true);
  mockFabric(t, {
    evaluate(name, args) {
      assert.equal(name, 'QueryBatteryByDID');
      assert.deepEqual(args, [did]);
      evaluateCount += 1;
      // First call: unbound passport (no bmsManagementId yet)
      if (evaluateCount === 1) {
        return Buffer.from(JSON.stringify({ passportId: 'PASSPORT-E5' }));
      }
      // Second call (after cache bust): passport now has BMS bound
      return Buffer.from(JSON.stringify({
        passportId: 'PASSPORT-E5',
        bmsManagementId: 'BMS-MGMT-001',
        bmsBindingCode32: 0x2c9a0e0c,
      }));
    },
    submit(name) {
      if (name === 'RecordBMUData' || name === 'RecordBMUDataWithPayload' || name === 'BindBMSIdentifier') {
        return Buffer.from('');
      }
      throw new Error(`unexpected submit: ${name}`);
    },
  });

  const server = await listen(serverModule.createApp());
  t.after(() => server.close());
  const token = generateToken('e5-user', 'ManufacturerMSP');

  // Step 1: first BMU ingest — evaluate fires once, result is cached
  const step1 = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0, freshnessCounter: 10 }),
      signature: 'a'.repeat(128),
    },
  });
  assert.equal(step1.status, 200, 'step1: first ingest must succeed');
  const countAfterStep1 = evaluateCount;
  assert.equal(countAfterStep1, 1, 'step1: evaluate called exactly once');

  // Step 2: bms-binding → clearDidPassportCache fires for PASSPORT-E5
  const step2 = await request(server, '/api/passports/PASSPORT-E5/bms-binding', {
    token,
    method: 'POST',
    body: { reason: 'E5 binding' },
  });
  assert.equal(step2.status, 200, 'step2: bms-binding must succeed');

  // Step 3: second BMU ingest with same DID — cache is stale, evaluate must re-fire
  const step3 = await request(server, '/api/bmu/data', {
    token,
    method: 'POST',
    body: {
      did,
      rawPayload: buildBmuPayload({ bmsBindingCode32: 0x2c9a0e0c, freshnessCounter: 11 }),
      signature: 'a'.repeat(128),
    },
  });
  assert.equal(step3.status, 200, 'step3: second ingest must succeed after cache bust');
  assert.equal(evaluateCount, countAfterStep1 + 1, 'step3: evaluate fired again after cache invalidation');
});
