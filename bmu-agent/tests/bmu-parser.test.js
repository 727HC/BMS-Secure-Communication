const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRawPayload, PAYLOAD_SIZE } = require('../services/bmu-parser.service');

function buildPayload({
  current = -15.25,
  voltage = 403.5,
  socRaw = 32768,
  dischargeCycles = 1234,
  temperature = 4567,
  cellVoltageRaw = 128,
  cellSocRaw = 128,
  timestampMs = 500,
  statusFlags = 0x07,
  cellCount = 11,
  freshnessCounter = 42,
  bmsBindingCode32 = 0,
} = {}) {
  const buf = Buffer.alloc(PAYLOAD_SIZE);
  buf.writeFloatLE(current, 0);
  buf.writeFloatLE(voltage, 4);
  buf.writeUInt16LE(socRaw, 8);
  buf.writeUInt16LE(dischargeCycles, 10);
  buf.writeUInt16LE(temperature, 12);
  for (let i = 0; i < 11; i++) buf.writeUInt8(cellVoltageRaw, 14 + i);
  for (let i = 0; i < 11; i++) buf.writeUInt8(cellSocRaw, 25 + i);
  buf.writeUInt16LE(timestampMs, 36);
  buf.writeUInt8(statusFlags, 38);
  buf.writeUInt8(cellCount, 39);
  buf.writeUInt32LE(freshnessCounter, 40);
  buf.writeUInt32LE(bmsBindingCode32, 44);
  return buf.toString('hex');
}

test('parseRawPayload decodes a valid 48-byte BMU payload', () => {
  const parsed = parseRawPayload(buildPayload());

  assert.equal(parsed.current, -15.25);
  assert.equal(parsed.voltage, 403.5);
  assert.equal(parsed.soc, 32768);
  assert.equal(parsed.dischargeCycles, 1234);
  assert.equal(parsed.temperature, 4567);
  assert.equal(parsed.timestampMs, 500);
  assert.equal(parsed.statusFlags, 0x07);
  assert.equal(parsed.isCharging, true);
  assert.equal(parsed.isBalancing, true);
  assert.equal(parsed.isFault, true);
  assert.equal(parsed.cellCount, 11);
  assert.equal(parsed.freshnessCounter, 42);
  assert.equal(parsed.bmsBindingCode32, 0);
  assert.equal(parsed.bmsBindingCodeHex, '0x00000000');
  assert.equal(parsed.cellVoltages.length, 11);
  assert.equal(parsed.cellSocs.length, 11);
});

test('parseRawPayload rejects payloads that are not exactly 48 bytes', () => {
  assert.throws(
    () => parseRawPayload('00'),
    /rawPayload size mismatch: expected 48 bytes, got 1/
  );
});

test('parseRawPayload rejects non-hex and odd-length payloads before decoding', () => {
  assert.throws(
    () => parseRawPayload('zz'),
    /rawPayload must be an even-length hex string/
  );
  assert.throws(
    () => parseRawPayload('abc'),
    /rawPayload must be an even-length hex string/
  );
});

test('parseRawPayload preserves raw soc_u16 even when cell SOC average differs', () => {
  const socRaw = 100;
  const parsed = parseRawPayload(buildPayload({ socRaw, cellSocRaw: 255 }));

  assert.equal(parsed.soc, socRaw);
  assert.equal(parsed.cellSocs.every((soc) => soc === 100), true);
});

test('parseRawPayload exposes bmsBindingCode32 from bytes 44..47 as little-endian uint32', () => {
  const parsed = parseRawPayload(buildPayload({ bmsBindingCode32: 0x12345678 }));

  assert.equal(parsed.bmsBindingCode32, 0x12345678);
  assert.equal(parsed.bmsBindingCodeHex, '0x12345678');
});
