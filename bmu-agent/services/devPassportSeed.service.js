const SEED_FLAG = 'dashboard-real-seed-data';

const BUCKETS = Object.freeze([
  Object.freeze({ date: '2026-03-30', count: 6 }),
  Object.freeze({ date: '2026-04-02', count: 8 }),
  Object.freeze({ date: '2026-04-05', count: 7 }),
  Object.freeze({ date: '2026-04-08', count: 11 }),
  Object.freeze({ date: '2026-04-11', count: 12 }),
  Object.freeze({ date: '2026-04-14', count: 14 }),
  Object.freeze({ date: '2026-04-17', count: 11 }),
  Object.freeze({ date: '2026-04-20', count: 13 }),
  Object.freeze({ date: '2026-04-23', count: 10 }),
  Object.freeze({ date: '2026-04-26', count: 8 }),
]);

const EXPECTED_VALUES = Object.freeze({
  total: 100,
  bucketCounts: Object.freeze({
    '2026-03-30': 6,
    '2026-04-02': 8,
    '2026-04-05': 7,
    '2026-04-08': 11,
    '2026-04-11': 12,
    '2026-04-14': 14,
    '2026-04-17': 11,
    '2026-04-20': 13,
    '2026-04-23': 10,
    '2026-04-26': 8,
  }),
});

const MANUFACTURERS = Object.freeze([
  'LG에너지솔루션',
  'SK On',
  '삼성SDI',
  '현대모비스',
  'CATL',
  'BYD',
  'Panasonic Energy',
  'Tesla Energy',
]);

const MFG_CODES = Object.freeze({
  'LG에너지솔루션': 'LGE',
  'SK On': 'SKO',
  '삼성SDI': 'SDI',
  '현대모비스': 'HMB',
  'CATL': 'CAT',
  'BYD': 'BYD',
  'Panasonic Energy': 'PAN',
  'Tesla Energy': 'TSL',
});

const COUNTRIES = Object.freeze(['KR', 'KR', 'KR', 'DE', 'CN', 'CN', 'US', 'JP', 'FR', 'PL', 'HU']);
const CELL_COUNTRIES = Object.freeze(['KR', 'CN', 'JP', 'PL', 'HU', 'DE']);
const STATUSES = Object.freeze(['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'RETIRED', 'DISPOSED']);

const CHEM_PROFILES = Object.freeze([
  Object.freeze({
    chemistry: 'LFP',
    cellType: 'prismatic',
    models: Object.freeze(['BLADE-72S', 'MEGA-LFP-90', 'FREEDOM-FP-66', 'EVO-LFP-110']),
    cellMfg: 'CathodeWorks LFP',
    voltageRange: '300-410V',
    cellCount: 108,
    capacity: 188,
    energy: 74,
    density: 178,
    lifespan: 12,
  }),
  Object.freeze({
    chemistry: 'NCM811',
    cellType: 'pouch',
    models: Object.freeze(['PRIME-NCM-85', 'ULTRA-NCM811-100', 'PEAK-NCM-92']),
    cellMfg: 'CathodeWorks NCM',
    voltageRange: '320-450V',
    cellCount: 96,
    capacity: 230,
    energy: 88,
    density: 220,
    lifespan: 10,
  }),
  Object.freeze({
    chemistry: 'NCA',
    cellType: 'cylindrical',
    models: Object.freeze(['SKYLINE-NCA-78', 'AURORA-NCA-82']),
    cellMfg: 'NCAprime Cells',
    voltageRange: '330-460V',
    cellCount: 168,
    capacity: 205,
    energy: 80,
    density: 240,
    lifespan: 9,
  }),
  Object.freeze({
    chemistry: 'NMC622',
    cellType: 'pouch',
    models: Object.freeze(['EDGE-NMC-80', 'MID-NMC622-72']),
    cellMfg: 'PrismaCells NMC',
    voltageRange: '310-440V',
    cellCount: 100,
    capacity: 215,
    energy: 82,
    density: 200,
    lifespan: 11,
  }),
  Object.freeze({
    chemistry: 'LMFP',
    cellType: 'prismatic',
    models: Object.freeze(['APEX-LMFP-95', 'NEXT-LMFP-88']),
    cellMfg: 'LMFP Foundry',
    voltageRange: '305-415V',
    cellCount: 112,
    capacity: 192,
    energy: 76,
    density: 188,
    lifespan: 13,
  }),
]);

function isDashboardPassportSeedEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.BMS_DEV_PASSPORT_SEED === SEED_FLAG;
}

function padOrdinal(value) {
  return String(value).padStart(3, '0');
}

function pick(arr, i) {
  return arr[i % arr.length];
}

function buildPassport(index, bucket) {
  const sequence = index + 1;
  const ordinal = padOrdinal(sequence);
  const profile = CHEM_PROFILES[index % CHEM_PROFILES.length];
  const model = pick(profile.models, Math.floor(index / CHEM_PROFILES.length));
  const status = pick(STATUSES, index * 7 + 3);
  const manufacturer = pick(MANUFACTURERS, index);
  const country = pick(COUNTRIES, index * 3);
  const cellCountry = pick(CELL_COUNTRIES, index * 5);
  const isLfpFamily = profile.chemistry === 'LFP' || profile.chemistry === 'LMFP';

  const soh = 65 + ((index * 7) % 35);
  const soc = 12 + ((index * 11) % 81);
  const cycles = 8 + ((index * 17) % 1280);
  const carbon = 35 + ((index * 13) % 75);

  const recyclingRates = {
    lithium: Number((0.55 + (index % 7) / 100).toFixed(3)),
    nickel: isLfpFamily ? 0 : Number((0.72 + (index % 9) / 100).toFixed(3)),
    cobalt: isLfpFamily ? 0 : Number((0.68 + (index % 8) / 100).toFixed(3)),
    copper: Number((0.86 + (index % 5) / 100).toFixed(3)),
  };
  const recycledElementContent = {
    lithium: Number((0.06 + (index % 6) / 100).toFixed(3)),
    nickel: isLfpFamily ? 0 : Number((0.10 + (index % 5) / 100).toFixed(3)),
    cobalt: isLfpFamily ? 0 : Number((0.08 + (index % 4) / 100).toFixed(3)),
  };

  const verified = index % 4 === 0;
  const maintenanceLogs = (status === 'MAINTENANCE' || index % 11 === 0)
    ? [{ id: `mlog-${ordinal}`, type: index % 2 === 0 ? 'BMS-INSPECT' : 'CELL-BALANCE', recordedAt: '2026-04-22T10:00:00.000Z', technician: 'manufacturer1' }]
    : [];
  const accidentLogs = index % 17 === 0
    ? [{ id: `alog-${ordinal}`, severity: index % 34 === 0 ? 'major' : 'minor', recordedAt: '2026-04-15T07:30:00.000Z', summary: '온도 이상 감지' }]
    : [];
  const correctionLogs = index % 23 === 0
    ? [{ id: `clog-${ordinal}`, reason: 'sensor-drift', recordedAt: '2026-04-18T11:15:00.000Z', operator: 'manufacturer1' }]
    : [];

  const mfgCode = MFG_CODES[manufacturer] || 'GEN';

  return {
    docType: 'batteryPassport',
    passportId: `DEV-DASH-P-${ordinal}`,
    batteryId: `DEV-DASH-BMU-${ordinal}`,
    did: `did:example:dev-dashboard-${ordinal}`,
    model,
    serialNumber: `${mfgCode}-${profile.chemistry}-${ordinal}`,
    manufacturerName: manufacturer,
    manufactureCountry: country,
    cellManufacturer: profile.cellMfg,
    cellManufactureCountry: cellCountry,
    manufactureDate: `2026-0${1 + (index % 3)}-${String(1 + (index % 28)).padStart(2, '0')}`,
    cellType: profile.cellType,
    chemistry: profile.chemistry,
    cellCount: profile.cellCount + (index % 7),
    weight: Number((360 + (index % 90) + (index % 5) * 0.4).toFixed(1)),
    totalEnergy: profile.energy + (index % 14),
    energyDensity: profile.density + (index % 18),
    ratedCapacity: profile.capacity + (index % 22),
    expectedLifespan: profile.lifespan,
    voltageRange: profile.voltageRange,
    temperatureRange: '-20~60C',
    carbonFootprint: Number(carbon.toFixed(1)),
    rawMaterials: ['lithium', isLfpFamily ? 'iron' : 'nickel', isLfpFamily ? 'phosphate' : 'cobalt'],
    recyclingRates,
    recycledElementContent,
    extensionInfo: {
      seedFlag: SEED_FLAG,
      dossier: `DEV-DASH-DOSSIER-${ordinal}`,
      ledgerSource: 'deterministic-development-seed',
      profileTier: model.split('-')[0],
    },
    currentSoh: soh,
    currentSoc: soc,
    totalDischargeCycles: cycles,
    status,
    maintenanceLogs,
    accidentLogs,
    correctionLogs,
    regulatoryEvidenceIds: [`DEV-DASH-EVIDENCE-${ordinal}`],
    regulatoryVerificationStatus: verified ? 'VERIFIED' : 'PENDING',
    physicalHistoryVerification: {
      status: verified ? 'VERIFIED' : 'PENDING',
      verifiedAt: verified ? '2026-04-20T10:00:00.000Z' : '',
      verifier: verified ? 'RegulatorMSP' : '',
      evidenceHash: `dev-dashboard-evidence-hash-${ordinal}`,
    },
    createdAt: `${bucket.date}T08:00:00.000Z`,
    updatedAt: `2026-04-${String(20 + (index % 7)).padStart(2, '0')}T09:30:00.000Z`,
    creatorMsp: 'ManufacturerMSP',
  };
}

function buildDashboardPassportSeed() {
  return BUCKETS.reduce((records, bucket) => {
    const startIndex = records.length;
    const bucketRecords = Array.from({ length: bucket.count }, (_, offset) => buildPassport(startIndex + offset, bucket));
    return records.concat(bucketRecords);
  }, []);
}

function bucketCreatedAtCounts(records) {
  return records.reduce((counts, record) => {
    const date = new Date(record.createdAt).toISOString().slice(0, 10);
    counts[date] = (counts[date] || 0) + 1;
    return counts;
  }, {});
}

function parsePageSize(pageSize) {
  const parsed = Number.parseInt(pageSize, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }
  return Math.min(parsed, 100);
}

function parseBookmark(bookmark) {
  if (bookmark === undefined || bookmark === null || bookmark === '') {
    return 0;
  }
  const bookmarkText = String(bookmark);
  if (!/^\d+$/.test(bookmarkText)) {
    return 0;
  }
  return Number.parseInt(bookmarkText, 10);
}

function paginateDashboardSeed(records, pageSize, bookmark) {
  const size = parsePageSize(pageSize);
  const offset = Math.min(parseBookmark(bookmark), records.length);
  const pageRecords = records.slice(offset, offset + size);
  const nextOffset = offset + pageRecords.length;

  return {
    records: pageRecords,
    bookmark: nextOffset < records.length ? String(nextOffset) : '',
    count: records.length,
  };
}

module.exports = {
  SEED_FLAG,
  BUCKETS,
  EXPECTED_VALUES,
  isDashboardPassportSeedEnabled,
  buildDashboardPassportSeed,
  bucketCreatedAtCounts,
  paginateDashboardSeed,
};
