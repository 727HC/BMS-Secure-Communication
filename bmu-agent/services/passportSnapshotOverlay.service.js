const fabricService = require('./fabric.service');
const {
  getRuntimeBmuSnapshot,
  listRuntimeBmuSnapshots,
} = require('./runtimeBmuSnapshot.service');

const OVERLAY_CONCURRENCY = Math.max(1, parseInt(process.env.PASSPORT_LIVE_OVERLAY_CONCURRENCY || '8', 10));
const OVERLAY_LIMIT = Math.max(0, parseInt(process.env.PASSPORT_LIVE_OVERLAY_LIMIT || '100', 10));

function parseResult(buffer) {
  return JSON.parse(buffer.toString());
}

function pageRecords(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.records)) return page.records;
  if (Array.isArray(page?.items)) return page.items;
  return [];
}

function withPageRecords(page, records) {
  if (Array.isArray(page)) return records;
  if (Array.isArray(page?.items) && !Array.isArray(page?.records)) {
    return { ...page, items: records, count: records.length };
  }
  return { ...page, records, count: records.length };
}

function bmuRecordsFromResult(data) {
  if (Array.isArray(data)) return data;
  return data?.records || [];
}

function latestRecord(records) {
  if (!records.length) return null;
  return records.reduce((a, b) => (String(a.timestamp || '') > String(b.timestamp || '') ? a : b));
}

function overlayLatestBmu(passport, latest) {
  if (!passport || !latest) return passport;
  const recordId = latest.recordId || latest.id || passport.lastBMUDataID || passport.lastBmuDataId;
  const latestSoc = latest.soc ?? latest.currentSoc;
  const latestTemperature = latest.temperature ?? latest.currentTemperature;
  const latestStatusFlags = latest.statusFlags ?? latest.currentStatusFlags;
  const latestDischargeCycles = latest.dischargeCycles ?? latest.totalDischargeCycles;
  const latestRawPayloadHashVerified = latest.rawPayloadHashVerified ?? latest.latestRawPayloadHashVerified;
  const latestDataHash = latest.dataHash ?? latest.latestDataHash;
  return {
    ...passport,
    currentSoc: latestSoc ?? passport.currentSoc,
    currentTemperature: latestTemperature ?? passport.currentTemperature,
    temperature: latestTemperature ?? passport.temperature,
    currentStatusFlags: latestStatusFlags ?? passport.currentStatusFlags,
    statusFlags: latestStatusFlags ?? passport.statusFlags,
    totalDischargeCycles: latestDischargeCycles ?? passport.totalDischargeCycles,
    lastBmuDataId: recordId,
    lastBMUDataID: recordId,
    bmsBindingCode32: latest.bmsBindingCode32 ?? passport.bmsBindingCode32,
    bmsBindingCodeHex: latest.bmsBindingCodeHex ?? passport.bmsBindingCodeHex,
    latestRawPayloadHashVerified: latestRawPayloadHashVerified ?? passport.latestRawPayloadHashVerified,
    latestDataHash: latestDataHash ?? passport.latestDataHash,
    updatedAt: latest.timestamp || passport.updatedAt,
  };
}

async function queryLatestBmuRecord(passportId, user) {
  const result = await fabricService.evaluateTransaction(
    'QueryBMURecordsByPassport',
    [passportId, '1', ''],
    user
  );
  return latestRecord(bmuRecordsFromResult(parseResult(result)));
}

async function overlayPassportWithLatestBmu(passport, user, options = {}) {
  const passportId = passport?.passportId;
  if (!passportId) return passport;

  const runtime = getRuntimeBmuSnapshot(passportId);
  if (runtime) return overlayLatestBmu(passport, runtime);

  try {
    return overlayLatestBmu(passport, await queryLatestBmuRecord(passportId, user));
  } catch (err) {
    if (options.throwOnOverlayError) throw err;
    return passport;
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const output = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      output[current] = await mapper(items[current], current);
    }
  }));
  return output;
}

async function buildRuntimePassports(existingIds, user) {
  const runtimeSnapshots = listRuntimeBmuSnapshots()
    .filter((snapshot) => !existingIds.has(snapshot.passportId));
  if (!runtimeSnapshots.length) return [];

  const passports = [];
  for (const snapshot of runtimeSnapshots) {
    try {
      const passport = parseResult(await fabricService.evaluateTransaction(
        'QueryPassport',
        [snapshot.passportId],
        user
      ));
      passports.push(overlayLatestBmu(passport, snapshot));
    } catch {
      // Runtime BMU cache is only an overlay hint. Do not break the base list.
    }
  }
  return passports;
}

async function overlayPassportPageWithLatestBmu(page, user) {
  const records = pageRecords(page);
  const overlayCount = Math.min(records.length, OVERLAY_LIMIT);
  const head = records.slice(0, overlayCount);
  const tail = records.slice(overlayCount);

  const overlaidHead = await mapWithConcurrency(
    head,
    OVERLAY_CONCURRENCY,
    (passport) => overlayPassportWithLatestBmu(passport, user)
  );

  const existingIds = new Set(records.map((record) => record?.passportId).filter(Boolean));
  const runtimePassports = await buildRuntimePassports(existingIds, user);
  return withPageRecords(page, [...runtimePassports, ...overlaidHead, ...tail]);
}

module.exports = {
  overlayLatestBmu,
  overlayPassportWithLatestBmu,
  overlayPassportPageWithLatestBmu,
  queryLatestBmuRecord,
};
