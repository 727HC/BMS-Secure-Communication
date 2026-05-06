import type {
  DashboardAuditRecord,
  DashboardBmuRecord,
  DashboardPassport,
  DashboardStatus,
} from './lib';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
}

export function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return optionalString(value);
}

export function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function normalizeList<T>(payload: unknown, normalizeRecord: (value: unknown) => T | null): T[] {
  const source = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.records)
      ? payload.records
      : isRecord(payload) && Array.isArray(payload.items)
        ? payload.items
        : [];

  return source.map(normalizeRecord).filter((item): item is T => item !== null);
}

export function normalizePassport(value: unknown): DashboardPassport | null {
  if (!isRecord(value)) return null;
  const physical = isRecord(value.physicalHistoryVerification)
    ? {
        ...value.physicalHistoryVerification,
        status: optionalString(value.physicalHistoryVerification.status),
      }
    : undefined;

  return {
    ...value,
    passportId: optionalString(value.passportId),
    batteryId: optionalString(value.batteryId),
    did: optionalString(value.did),
    model: optionalString(value.model),
    serialNumber: optionalString(value.serialNumber),
    status: optionalString(value.status),
    vin: optionalString(value.vin),
    currentSoc: optionalNumber(value.currentSoc ?? value.soc),
    soc: optionalNumber(value.soc),
    currentSoh: optionalNumber(value.currentSoh ?? value.soh),
    soh: optionalNumber(value.soh),
    totalDischargeCycles: optionalNumber(value.totalDischargeCycles ?? value.dischargeCycles),
    regulatoryVerificationStatus: optionalString(value.regulatoryVerificationStatus),
    physicalHistoryVerification: physical,
    createdAt: optionalString(value.createdAt),
    updatedAt: optionalString(value.updatedAt),
  };
}

export function normalizeStatus(value: unknown): DashboardStatus {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  return {
    ...record,
    fabric: optionalString(record.fabric),
    channel: optionalString(record.channel),
    contract: optionalString(record.contract),
    org: optionalString(record.org),
  };
}

export function normalizeBmuRecord(value: unknown): DashboardBmuRecord | null {
  if (!isRecord(value)) return null;
  return {
    ...value,
    recordId: optionalString(value.recordId),
    timestamp: optionalString(value.timestamp),
    soc: optionalNumber(value.soc),
    voltage: optionalNumber(value.voltage),
    current: optionalNumber(value.current),
    temperature: optionalNumber(value.temperature),
    dischargeCycles: optionalNumber(value.dischargeCycles),
    statusFlags: optionalNumber(value.statusFlags),
  };
}

export function normalizeAuditRecord(value: unknown): DashboardAuditRecord | null {
  if (!isRecord(value)) return null;
  return {
    ...value,
    id: optionalString(value.id),
    action: optionalString(value.action),
    timestamp: optionalString(value.timestamp),
    userId: optionalNullableString(value.userId),
    orgMsp: optionalNullableString(value.orgMsp),
    method: optionalString(value.method),
    path: optionalString(value.path),
    block: optionalString(value.block),
    blockNumber: optionalString(value.blockNumber),
    statusCode: optionalNumber(value.statusCode),
    success: typeof value.success === 'boolean' ? value.success : undefined,
    targetId: optionalNullableString(value.targetId),
  };
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function isPermissionError(message: string): boolean {
  return /\b(401|403)\b|access denied|not authorized|unauthorized|forbidden|permission denied|권한/i.test(message);
}

export function normalizedStatus(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}
