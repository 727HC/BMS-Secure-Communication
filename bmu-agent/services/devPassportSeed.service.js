const SEED_FLAG = 'dashboard-real-seed-data';

const BUCKETS = Object.freeze([
  Object.freeze({ date: '2026-04-10', count: 4 }),
  Object.freeze({ date: '2026-04-11', count: 13 }),
  Object.freeze({ date: '2026-04-12', count: 7 }),
  Object.freeze({ date: '2026-04-13', count: 16 }),
  Object.freeze({ date: '2026-04-14', count: 5 }),
  Object.freeze({ date: '2026-04-15', count: 18 }),
  Object.freeze({ date: '2026-04-16', count: 9 }),
  Object.freeze({ date: '2026-04-17', count: 14 }),
  Object.freeze({ date: '2026-04-18', count: 6 }),
  Object.freeze({ date: '2026-04-19', count: 8 }),
]);

const EXPECTED_VALUES = Object.freeze({
  total: 100,
  bucketCounts: Object.freeze({
    '2026-04-10': 4,
    '2026-04-11': 13,
    '2026-04-12': 7,
    '2026-04-13': 16,
    '2026-04-14': 5,
    '2026-04-15': 18,
    '2026-04-16': 9,
    '2026-04-17': 14,
    '2026-04-18': 6,
    '2026-04-19': 8,
  }),
});

function isDashboardPassportSeedEnabled() {
  return process.env.NODE_ENV !== 'production' && process.env.BMS_DEV_PASSPORT_SEED === SEED_FLAG;
}

function padOrdinal(value) {
  return String(value).padStart(3, '0');
}

function buildPassport(index, bucket) {
  const sequence = index + 1;
  const ordinal = padOrdinal(sequence);
  const isLfp = index % 2 === 1;
  const chemistry = isLfp ? 'LFP' : 'NCM811';
  const cellType = isLfp ? 'prismatic' : 'pouch';
  const soc = 48 + (index % 45);
  const soh = 72 + (index % 8);

  return {
    docType: 'batteryPassport',
    passportId: `DEV-DASH-P-${ordinal}`,
    batteryId: `DEV-DASH-BMU-${ordinal}`,
    did: `did:example:dev-dashboard-${ordinal}`,
    model: isLfp ? 'LFP QA Pack' : 'NCM QA Pack',
    serialNumber: `DEV-DASH-SN-${ordinal}`,
    manufacturerName: index % 3 === 0 ? 'OpenClaw Energy Systems' : 'BMS Mobility Cells',
    manufactureCountry: index % 4 === 0 ? 'KR' : 'DE',
    cellManufacturer: isLfp ? 'CathodeWorks LFP' : 'CathodeWorks NCM',
    cellManufactureCountry: index % 5 === 0 ? 'PL' : 'KR',
    manufactureDate: `2026-03-${String(1 + (index % 28)).padStart(2, '0')}`,
    cellType,
    chemistry,
    cellCount: isLfp ? 108 : 96,
    weight: isLfp ? 412.5 + (index % 6) : 386.4 + (index % 5),
    totalEnergy: isLfp ? 72 + (index % 9) : 84 + (index % 11),
    energyDensity: isLfp ? 174 + (index % 7) : 218 + (index % 9),
    ratedCapacity: isLfp ? 186 + (index % 8) : 225 + (index % 10),
    expectedLifespan: isLfp ? 12 : 10,
    voltageRange: isLfp ? '300-410V' : '320-450V',
    temperatureRange: '-20~60C',
    carbonFootprint: 58.4 + (index % 12),
    rawMaterials: ['lithium', isLfp ? 'iron' : 'nickel', isLfp ? 'phosphate' : 'cobalt'],
    recyclingRates: {
      lithium: 0.62,
      nickel: isLfp ? 0 : 0.81,
      cobalt: isLfp ? 0 : 0.77,
      copper: 0.9,
    },
    recycledElementContent: {
      lithium: 0.08 + (index % 4) / 100,
      nickel: isLfp ? 0 : 0.12 + (index % 5) / 100,
      cobalt: isLfp ? 0 : 0.09 + (index % 3) / 100,
    },
    extensionInfo: {
      seedFlag: SEED_FLAG,
      dossier: `DEV-DASH-DOSSIER-${ordinal}`,
      ledgerSource: 'deterministic-development-seed',
    },
    currentSoh: soh,
    currentSoc: soc,
    totalDischargeCycles: 40 + index,
    status: index % 10 === 0 ? 'MAINTENANCE' : 'ACTIVE',
    maintenanceLogs: [],
    accidentLogs: [],
    correctionLogs: [],
    regulatoryEvidenceIds: [`DEV-DASH-EVIDENCE-${ordinal}`],
    regulatoryVerificationStatus: index % 6 === 0 ? 'VERIFIED' : 'PENDING',
    physicalHistoryVerification: {
      status: index % 6 === 0 ? 'VERIFIED' : 'PENDING',
      verifiedAt: index % 6 === 0 ? '2026-04-20T10:00:00.000Z' : '',
      verifier: index % 6 === 0 ? 'RegulatorMSP' : '',
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
