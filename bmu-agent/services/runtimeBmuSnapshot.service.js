const MAX_SNAPSHOTS = parseInt(process.env.RUNTIME_BMU_SNAPSHOT_MAX || '50', 10);

const snapshotsByPassportId = new Map();

function recordRuntimeBmuSnapshot(snapshot) {
  const passportId = typeof snapshot?.passportId === 'string' ? snapshot.passportId.trim() : '';
  if (!passportId) return null;

  const normalized = {
    ...snapshot,
    passportId,
    cachedAt: new Date().toISOString(),
  };

  snapshotsByPassportId.delete(passportId);
  snapshotsByPassportId.set(passportId, normalized);

  while (snapshotsByPassportId.size > MAX_SNAPSHOTS) {
    snapshotsByPassportId.delete(snapshotsByPassportId.keys().next().value);
  }

  return normalized;
}

function getRuntimeBmuSnapshot(passportId) {
  return snapshotsByPassportId.get(passportId) || null;
}

function listRuntimeBmuSnapshots() {
  return Array.from(snapshotsByPassportId.values())
    .sort((a, b) => String(b.timestamp || b.cachedAt || '').localeCompare(String(a.timestamp || a.cachedAt || '')));
}

function clearRuntimeBmuSnapshots() {
  snapshotsByPassportId.clear();
}

module.exports = {
  recordRuntimeBmuSnapshot,
  getRuntimeBmuSnapshot,
  listRuntimeBmuSnapshots,
  clearRuntimeBmuSnapshots,
};
