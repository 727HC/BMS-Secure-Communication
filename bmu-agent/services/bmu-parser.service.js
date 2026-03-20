// BatteryData_t parser: 48-byte rawPayload (Little-endian) from BMU firmware
//
// Offset  Size  Field
//   0      4    float   current_A        (IEEE 754)
//   4      4    float   voltage_V        (IEEE 754)
//   8      2    uint16  soc_u16
//  10      2    uint16  discharge_cycles
//  12      2    uint16  temperature_u16
//  14     11    uint8[] cell_voltage[11]  (2.5~4.2V encoded)
//  25     11    uint8[] cell_soc[11]      (0~100%)
//  36      2    uint16  timestamp_ms
//  38      1    uint8   status_flags      (b0=charging, b1=balancing, b2=fault)
//  39      1    uint8   cell_count
//  40      4    uint32  freshness_counter
//  44      4    uint8[] reserved[4]
// Total: 48 bytes

const PAYLOAD_SIZE = 48;

function parseRawPayload(hexString) {
  const buf = Buffer.from(hexString, 'hex');
  if (buf.length < PAYLOAD_SIZE) {
    throw new Error(`rawPayload too short: expected ${PAYLOAD_SIZE} bytes, got ${buf.length}`);
  }

  const current = buf.readFloatLE(0);
  const voltage = buf.readFloatLE(4);
  const soc = buf.readUInt16LE(8);
  const dischargeCycles = buf.readUInt16LE(10);
  const temperature = buf.readUInt16LE(12);

  // Cell voltages: 11 bytes at offset 14
  // Encoding: value = 2.5 + (raw / 255) * 1.7  → maps 0~255 to 2.5~4.2V
  const cellVoltages = [];
  for (let i = 0; i < 11; i++) {
    const raw = buf.readUInt8(14 + i);
    cellVoltages.push(+(2.5 + (raw / 255) * 1.7).toFixed(3));
  }

  // Cell SOCs: 11 bytes at offset 25
  // Encoding: direct percentage 0~100
  const cellSocs = [];
  for (let i = 0; i < 11; i++) {
    cellSocs.push(buf.readUInt8(25 + i));
  }

  const timestampMs = buf.readUInt16LE(36);
  const statusFlags = buf.readUInt8(38);
  const cellCount = buf.readUInt8(39);
  const freshnessCounter = buf.readUInt32LE(40);

  return {
    current: +current.toFixed(3),
    voltage: +voltage.toFixed(3),
    soc,
    dischargeCycles,
    temperature,
    cellVoltages,
    cellSocs,
    timestampMs,
    statusFlags,
    isCharging: !!(statusFlags & 0x01),
    isBalancing: !!(statusFlags & 0x02),
    isFault: !!(statusFlags & 0x04),
    cellCount: cellCount || 11,
    freshnessCounter,
  };
}

module.exports = {
  parseRawPayload,
  PAYLOAD_SIZE,
};
