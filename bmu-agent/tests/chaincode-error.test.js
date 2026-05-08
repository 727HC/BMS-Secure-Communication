const test = require('node:test');
const assert = require('node:assert/strict');
const { mapChaincodeError, unwrapFabricError } = require('../middleware/chaincode-error');

test('mapChaincodeError treats holder DID mismatch as validation', () => {
  assert.deepEqual(
    mapChaincodeError('holder DID mismatch: passport P1 is registered to DID did:1, not did:2'),
    { status: 400, category: 'VAL' }
  );
});

test('mapChaincodeError treats RFC3339 timestamp and expiry errors as validation', () => {
  assert.deepEqual(
    mapChaincodeError('invalid expiresAt value: parsing time "2026-05-08" as RFC3339'),
    { status: 400, category: 'VAL' }
  );
  assert.deepEqual(
    mapChaincodeError('invalid timestamp value: parsing time "2026-05-08" as RFC3339'),
    { status: 400, category: 'VAL' }
  );
});

test('mapChaincodeError treats dataHash and signature contract errors as validation', () => {
  assert.deepEqual(
    mapChaincodeError('dataHash must be 64-character hex SHA-256'),
    { status: 400, category: 'VAL' }
  );
  assert.deepEqual(
    mapChaincodeError('recordId, passportId, did, dataHash, signature, timestamp must not be empty'),
    { status: 400, category: 'VAL' }
  );
});

test('mapChaincodeError treats BMS binding and rawPayload validation as validation', () => {
  assert.deepEqual(
    mapChaincodeError('BMS binding code mismatch: payload bmsBindingCode32 1 does not match canonical BMS management identifier BMS-MGMT-001 code 748293644'),
    { status: 400, category: 'VAL' }
  );
  assert.deepEqual(
    mapChaincodeError('rawPayload must be 48 bytes, got 47'),
    { status: 400, category: 'VAL' }
  );
  assert.deepEqual(
    mapChaincodeError('dataHash mismatch: expected SHA-256 of 48-byte rawPayload abc, got def'),
    { status: 400, category: 'VAL' }
  );
});

test('unwrapFabricError preserves new validation message after gateway wrapping', () => {
  const wrapped = 'No valid responses from any peers. Errors:\n peer=peer0, status=500, message=holder DID mismatch: passport P1 is registered to DID did:1, not did:2';
  assert.match(unwrapFabricError(wrapped), /^holder DID mismatch/);
});
