const crypto = require('crypto');

const UINT32_MAX = 0xffffffff;
const FC_BOOT_SLOT_SIZE = 0x01000000;
const FC_WINDOW_MS = parseInt(process.env.BMU_FC_MONITOR_WINDOW_MS || String(24 * 60 * 60 * 1000), 10);
const FC_WRAP_WARNING_THRESHOLD = parseInt(process.env.BMU_FC_WRAP_WARNING_THRESHOLD || '0xf8000000', 0);
const ALERT_TTL_MS = parseInt(process.env.BMU_OPERATION_ALERT_TTL_MS || String(24 * 60 * 60 * 1000), 10);
const MAX_OBSERVATIONS = parseInt(process.env.BMU_FC_MONITOR_MAX_OBSERVATIONS || '20000', 10);
const MAX_ALERTS = parseInt(process.env.BMU_OPERATION_ALERT_MAX || '200', 10);

const observations = [];
const alerts = [];
let lastWrapAlertAtMs = 0;
const WRAP_ALERT_COOLDOWN_MS = 60 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function parseTimeMs(value, fallback = nowMs()) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toUint32(value) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > UINT32_MAX) return null;
  return numeric;
}

function toUint32Hex(value) {
  const fc = toUint32(value);
  if (fc == null) return null;
  return `0x${fc.toString(16).padStart(8, '0')}`;
}

function analyzeFreshnessCounter(value) {
  const fc = toUint32(value);
  if (fc == null) {
    return {
      fc: null,
      fcHex: null,
      bootSlot: null,
      bootOffset: null,
      fcJumpStartPattern: false,
      wrapWarning: false,
    };
  }
  const bootSlot = Math.floor(fc / FC_BOOT_SLOT_SIZE);
  const bootOffset = fc % FC_BOOT_SLOT_SIZE;
  return {
    fc,
    fcHex: toUint32Hex(fc),
    bootSlot,
    bootOffset,
    fcJumpStartPattern: bootSlot > 0 && bootOffset === 0,
    wrapWarning: fc >= FC_WRAP_WARNING_THRESHOLD,
  };
}

function prune(referenceMs = nowMs()) {
  const observationCutoff = referenceMs - FC_WINDOW_MS;
  while (observations.length && observations[0].observedAtMs < observationCutoff) {
    observations.shift();
  }
  while (observations.length > MAX_OBSERVATIONS) observations.shift();

  const alertCutoff = referenceMs - ALERT_TTL_MS;
  while (alerts.length && alerts[0].createdAtMs < alertCutoff) {
    alerts.shift();
  }
  while (alerts.length > MAX_ALERTS) alerts.shift();
}

function buildWrapAlert(observation) {
  return {
    id: `BMU-ALERT-${crypto.randomUUID()}`,
    type: 'FC_WRAP_NEAR',
    severity: 'yellow',
    title: 'BMU FC 256-boot wrap 근접',
    message: '최근 24시간 max FC가 0xF8000000 이상입니다. Option B boot-slot 예산이 256에 근접했으므로 embedded 상태를 확인하세요.',
    createdAt: observation.observedAt,
    did: observation.did,
    passportId: observation.passportId,
    recordId: observation.recordId,
    fc: observation.fc,
    fcHex: observation.fcHex,
    bootSlot: observation.bootSlot,
    bootOffset: observation.bootOffset,
    threshold: FC_WRAP_WARNING_THRESHOLD,
    thresholdHex: toUint32Hex(FC_WRAP_WARNING_THRESHOLD),
  };
}

function recordBmuFcObservation({ fc, did, passportId, recordId, timestamp } = {}) {
  const analyzed = analyzeFreshnessCounter(fc);
  if (analyzed.fc == null) return { observation: null, analysis: analyzed, alert: null };

  const observedAtMs = parseTimeMs(timestamp);
  const observation = {
    ...analyzed,
    did: did || null,
    passportId: passportId || null,
    recordId: recordId || null,
    observedAt: new Date(observedAtMs).toISOString(),
    observedAtMs,
  };
  observations.push(observation);
  prune(observedAtMs);

  let alert = null;
  const currentMs = nowMs();
  if (analyzed.wrapWarning && currentMs - lastWrapAlertAtMs >= WRAP_ALERT_COOLDOWN_MS) {
    alert = buildWrapAlert(observation);
    alerts.push({ ...alert, createdAtMs: currentMs });
    lastWrapAlertAtMs = currentMs;
    prune(currentMs);
  }

  return { observation, analysis: analyzed, alert };
}

function recordResetFcAlert({ did, reason, expectedNextFc, userId, orgMsp, timestamp } = {}) {
  const createdAtMs = parseTimeMs(timestamp);
  const alert = {
    id: `BMU-ALERT-${crypto.randomUUID()}`,
    type: 'RESET_FC_CALLED',
    severity: 'red',
    title: 'Manual ResetFCForDID 호출',
    message: 'Option B 적용 후 reset-fc는 0회/일이 정상입니다. 호출 발생 시 embedded fail-safe halt, DID 회전, counter 손상, 또는 256-boot wrap 징후를 확인하세요.',
    createdAt: new Date(createdAtMs).toISOString(),
    did: did || null,
    reason: reason || '',
    expectedNextFc: expectedNextFc ?? null,
    userId: userId || null,
    orgMsp: orgMsp || null,
    createdAtMs,
  };
  alerts.push(alert);
  prune(createdAtMs);
  return alert;
}

function latestMaxObservation() {
  if (!observations.length) return null;
  return observations.reduce((max, item) => (item.fc > max.fc ? item : max), observations[0]);
}

function getBmuOperationsStatus(referenceDate = new Date()) {
  const referenceMs = referenceDate.getTime();
  prune(referenceMs);
  const maxObservation = latestMaxObservation();
  const resetFcDailyCount = alerts.filter((a) => a.type === 'RESET_FC_CALLED').length;
  const wrapWarning = !!maxObservation && maxObservation.fc >= FC_WRAP_WARNING_THRESHOLD;
  const statusAlerts = [...alerts]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .map(({ createdAtMs, ...alert }) => alert);

  if (wrapWarning && !statusAlerts.some((a) => a.type === 'FC_WRAP_NEAR')) {
    statusAlerts.unshift(buildWrapAlert(maxObservation));
  }

  return {
    optionB: {
      name: 'BMU FC HSE NVM-backed persistence',
      expectedResetFcCallsPerDay: 0,
      fcPattern: '0xNN000000 boot jump-start; CMU 1,2,3... counters are rewritten before chain ingest',
    },
    fcWindow: {
      windowMs: FC_WINDOW_MS,
      since: new Date(referenceMs - FC_WINDOW_MS).toISOString(),
      observationCount: observations.length,
      threshold: FC_WRAP_WARNING_THRESHOLD,
      thresholdHex: toUint32Hex(FC_WRAP_WARNING_THRESHOLD),
      status: wrapWarning ? 'yellow' : 'normal',
      maxFc: maxObservation?.fc ?? null,
      maxFcHex: maxObservation?.fcHex ?? null,
      maxObservedAt: maxObservation?.observedAt ?? null,
      maxDid: maxObservation?.did ?? null,
      maxPassportId: maxObservation?.passportId ?? null,
      maxRecordId: maxObservation?.recordId ?? null,
      maxBootSlot: maxObservation?.bootSlot ?? null,
      maxBootOffset: maxObservation?.bootOffset ?? null,
    },
    resetFcDailyCount,
    alerts: statusAlerts,
  };
}

function clearBmuOperationsState() {
  observations.length = 0;
  alerts.length = 0;
  lastWrapAlertAtMs = 0;
}

module.exports = {
  analyzeFreshnessCounter,
  clearBmuOperationsState,
  getBmuOperationsStatus,
  recordBmuFcObservation,
  recordResetFcAlert,
  toUint32Hex,
};
