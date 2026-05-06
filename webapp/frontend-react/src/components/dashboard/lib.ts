export const DASHBOARD_AUDIT_PATH = '/audit?page=1&limit=5&writeOnly=false';
export const AUDIT_ALLOWED_ORGS = new Set(['ManufacturerMSP', 'RegulatorMSP']);
export const AUDIT_REQUIRED_LABEL = '권한 필요';

export type DashboardRoute = '/bmu-data' | '/passports' | '/maintenance' | '/audit-log';

export type DashboardSourcePermission = 'allowed' | 'denied' | 'unknown';

export interface DashboardSourceState {
  loading: boolean;
  error: string | null;
  permission: DashboardSourcePermission;
  loadedAt: string | null;
}

export interface DashboardPassport {
  passportId?: string;
  batteryId?: string;
  did?: string;
  model?: string;
  serialNumber?: string;
  status?: string;
  vin?: string;
  currentSoc?: number;
  soc?: number;
  currentSoh?: number;
  soh?: number;
  totalDischargeCycles?: number;
  regulatoryVerificationStatus?: string;
  physicalHistoryVerification?: { status?: string; [key: string]: unknown };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface DashboardStatus {
  fabric?: string;
  channel?: string;
  contract?: string;
  org?: string;
  [key: string]: unknown;
}

export interface DashboardBmuRecord {
  recordId?: string;
  timestamp?: string;
  soc?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  dischargeCycles?: number;
  statusFlags?: number;
  signature?: string;
  did?: string;
  [key: string]: unknown;
}

export interface DashboardAuditRecord {
  id?: string;
  action?: string;
  timestamp?: string;
  userId?: string | null;
  orgMsp?: string | null;
  method?: string;
  path?: string;
  block?: string;
  blockNumber?: string;
  statusCode?: number;
  success?: boolean;
  targetId?: string | null;
  [key: string]: unknown;
}

export const SOURCE_IDLE: DashboardSourceState = {
  loading: false,
  error: null,
  permission: 'unknown',
  loadedAt: null,
};

export function sourceLoading(permission: DashboardSourcePermission = 'allowed'): DashboardSourceState {
  return { loading: true, error: null, permission, loadedAt: null };
}

export function sourceLoaded(permission: DashboardSourcePermission = 'allowed'): DashboardSourceState {
  return { loading: false, error: null, permission, loadedAt: new Date().toISOString() };
}

export function sourceError(error: string, permission: DashboardSourcePermission = 'allowed'): DashboardSourceState {
  return { loading: false, error, permission, loadedAt: null };
}

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

export function passportSoh(passport: DashboardPassport | null | undefined): number | undefined {
  return passport?.currentSoh ?? passport?.soh;
}

export function passportSoc(passport: DashboardPassport | null | undefined): number | undefined {
  return passport?.currentSoc ?? passport?.soc;
}

export function isPassportVerified(passport: DashboardPassport): boolean {
  return normalizedStatus(passport.regulatoryVerificationStatus) === 'VERIFIED'
    || normalizedStatus(passport.physicalHistoryVerification?.status) === 'VERIFIED';
}

export function isPassportNormal(passport: DashboardPassport): boolean {
  const soh = passportSoh(passport);
  return normalizedStatus(passport.status) === 'ACTIVE' && (soh == null || soh >= 80);
}

export function isAuditAvailable(source: DashboardSourceState): boolean {
  return source.permission === 'allowed' && !source.loading && !source.error && source.loadedAt !== null;
}

export function isFailedAuditRecord(record: DashboardAuditRecord): boolean {
  return record.success === false || (record.statusCode != null && record.statusCode >= 400);
}

export type AlertSeverity = 'High' | 'Medium' | 'Low';
export type TaskTone = 'blue' | 'amber' | 'green' | 'purple';
export type TaskIconName = 'folder' | 'user' | 'wrench' | 'upload';

export interface AlertRowViewModel {
  key: string;
  message: string;
  source: string;
  severity: AlertSeverity;
  time: string;
  /** source가 실제 passport ID라서 클릭 시 /passports/:id로 이동 가능한지. system error/audit row는 false. */
  navigable?: boolean;
}

export interface TaskRowViewModel {
  label: string;
  value: string;
  unit: string;
  tone: TaskTone;
  icon: TaskIconName;
  route: DashboardRoute;
}

export interface PassportOptionViewModel {
  id: string;
  label: string;
  status: string;
}

export interface LedgerRowViewModel {
  key: string;
  tx: string;
  block: string;
  organization: string;
  eventType: string;
  timestamp: string;
  status: string;
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '현재';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;

  const diffMs = Date.now() - timestamp;
  if (diffMs < 60_000) return '방금';

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;

  return new Date(timestamp).toISOString().slice(0, 10);
}

export function passportReference(passport: DashboardPassport, index: number): string {
  return passport.passportId || passport.serialNumber || passport.batteryId || passport.did || `passport-${index + 1}`;
}

export function passportOptionLabel(passport: DashboardPassport, index: number): string {
  const reference = passportReference(passport, index);
  const detail = passport.model || passport.serialNumber || passport.batteryId;
  return detail && detail !== reference ? `${reference} · ${detail}` : reference;
}

export function passportAlertTime(passport: DashboardPassport): string {
  return formatRelativeTime(passport.updatedAt ?? passport.createdAt);
}

export function requiresVerificationAttention(passport: DashboardPassport): boolean {
  const regulatory = normalizedStatus(passport.regulatoryVerificationStatus);
  return regulatory !== 'VERIFIED' || !isPassportVerified(passport);
}

export function verificationAlertMessage(passport: DashboardPassport): string {
  const regulatory = normalizedStatus(passport.regulatoryVerificationStatus);
  if (regulatory === 'FAILED') return '규제 검증 실패';
  if (regulatory === 'PARTIAL') return '규제 검증 부분 완료';
  return '규제 검증 대기';
}

export function verificationAlertSeverity(passport: DashboardPassport): AlertSeverity {
  return normalizedStatus(passport.regulatoryVerificationStatus) === 'FAILED' ? 'High' : 'Medium';
}

export function hasBmuSnapshotFields(passport: DashboardPassport): boolean {
  return passport.currentSoc != null
    || passport.currentSoh != null
    || passport.soh != null
    || passport.totalDischargeCycles != null;
}

export function buildAlertRows(
  passports: DashboardPassport[],
  platformStatus: DashboardStatus | null,
  statusSource: DashboardSourceState,
  auditRecords: DashboardAuditRecord[],
  auditSource: DashboardSourceState
): AlertRowViewModel[] {
  const rows: AlertRowViewModel[] = [];

  if (statusSource.error) {
    rows.push({
      key: 'status-error',
      message: '플랫폼 상태 조회 실패',
      source: statusSource.error,
      severity: 'High',
      time: '현재',
    });
  } else if (statusSource.loadedAt && platformStatus?.fabric && normalizedStatus(platformStatus.fabric) !== 'CONNECTED') {
    rows.push({
      key: 'status-disconnected',
      message: 'Fabric 연결 상태 확인 필요',
      source: platformStatus.fabric,
      severity: 'High',
      time: formatRelativeTime(statusSource.loadedAt),
    });
  }

  passports.forEach((passport, index) => {
    if (!passport.vin) {
      const source = passportReference(passport, index);
      rows.push({
        key: `vin-${source}`,
        message: '차량 연결을 위한 VIN 등록 대기',
        source,
        severity: 'Medium',
        time: passportAlertTime(passport),
        navigable: true,
      });
    }
  });

  passports.forEach((passport, index) => {
    if (requiresVerificationAttention(passport)) {
      const source = passportReference(passport, index);
      rows.push({
        key: `verification-${source}`,
        message: verificationAlertMessage(passport),
        source,
        severity: verificationAlertSeverity(passport),
        time: passportAlertTime(passport),
        navigable: true,
      });
    }
  });

  passports.forEach((passport, index) => {
    const status = normalizedStatus(passport.status);
    if (status === 'MAINTENANCE' || status === 'ANALYSIS') {
      const source = passportReference(passport, index);
      rows.push({
        key: `status-${source}`,
        message: status === 'MAINTENANCE' ? '정비 상태 확인 필요' : '분석 상태 확인 필요',
        source,
        severity: status === 'MAINTENANCE' ? 'Medium' : 'Low',
        time: passportAlertTime(passport),
        navigable: true,
      });
    }
  });

  if (isAuditAvailable(auditSource)) {
    auditRecords.forEach((record, index) => {
      if (!isFailedAuditRecord(record)) return;
      const source = record.targetId || record.id || record.path || `audit-${index + 1}`;
      rows.push({
        key: `audit-${record.id ?? index}`,
        message: `${record.action || record.method || '감사 이벤트'} 실패`,
        source,
        severity: record.statusCode != null && record.statusCode < 500 ? 'Medium' : 'High',
        time: formatRelativeTime(record.timestamp),
      });
    });
  }

  return rows;
}

export function buildTaskRows(passports: DashboardPassport[]): TaskRowViewModel[] {
  const vinMissing = passports.filter((passport) => !passport.vin).length;
  const verificationPending = passports.filter(requiresVerificationAttention).length;
  const maintenance = passports.filter((passport) => normalizedStatus(passport.status) === 'MAINTENANCE').length;
  const bmuSnapshotMissing = passports.filter((passport) => !hasBmuSnapshotFields(passport)).length;

  return [
    { label: 'VIN 연결 대기', value: String(vinMissing), unit: '건', tone: 'blue', icon: 'folder', route: '/passports' },
    { label: '검증 대기', value: String(verificationPending), unit: '건', tone: 'amber', icon: 'user', route: '/passports' },
    { label: '정비 필요', value: String(maintenance), unit: '건', tone: 'green', icon: 'wrench', route: '/maintenance' },
    { label: 'BMU 데이터 업로드 대기', value: String(bmuSnapshotMissing), unit: '건', tone: 'purple', icon: 'upload', route: '/bmu-data' },
  ];
}

export function auditBlockTarget(record: DashboardAuditRecord): string {
  return record.block || record.blockNumber || record.targetId || '—';
}

export function auditStatusLabel(record: DashboardAuditRecord): string {
  if (record.success === false) return record.statusCode != null ? `Failed ${record.statusCode}` : 'Failed';
  if (record.success === true) return record.statusCode != null ? `Success ${record.statusCode}` : 'Success';
  if (record.statusCode != null) return `HTTP ${record.statusCode}`;
  return 'Unknown';
}

export function buildLedgerRows(records: DashboardAuditRecord[]): LedgerRowViewModel[] {
  return records.map((record, index) => ({
    key: record.id ?? `${record.timestamp ?? 'audit'}-${index}`,
    tx: record.id ?? '—',
    block: auditBlockTarget(record),
    organization: record.orgMsp ?? '—',
    eventType: record.action ?? record.method ?? '—',
    timestamp: record.timestamp ?? '—',
    status: auditStatusLabel(record),
  }));
}

export function bmuTimestamp(record: DashboardBmuRecord): number {
  if (!record.timestamp) return 0;
  const timestamp = Date.parse(record.timestamp);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function latestBmuRecord(records: DashboardBmuRecord[]): DashboardBmuRecord | null {
  return records.reduce<DashboardBmuRecord | null>((latest, record) => {
    if (!latest) return record;
    return bmuTimestamp(record) > bmuTimestamp(latest) ? record : latest;
  }, null);
}

export function formatMetricNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toFixed(1)).toString();
}

export function formatPercent(count: number, total: number): string {
  if (total <= 0) return '0%';
  return `${formatMetricNumber((count / total) * 100)}%`;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const exponent = Math.floor(Math.log10(value));
  const scale = 10 ** exponent;
  const normalized = value / scale;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * scale;
}

export type FleetGaugeTone = 'green' | 'blue' | 'amber' | 'purple';

export * from './lib-kpi';


export interface FleetGaugeViewModel {
  label: string;
  value: string;
  tone: FleetGaugeTone;
}

export interface DataflowNodeViewModel {
  key: 'cmu' | 'bmu' | 'agent' | 'blockchain' | 'passport';
  label: string;
  action: string;
  status: 'Unknown' | 'Data' | 'Loaded' | 'Synced';
}

export interface SecurityRowViewModel {
  label: string;
  value: string;
  tone: 'green' | 'blue' | 'amber' | 'purple' | 'neutral';
  icon: 'lock' | 'shield' | 'key';
}

export const FLEET_LEGEND = [
  { label: 'Normal', tone: 'normal' },
  { label: 'Warning', tone: 'warning' },
  { label: 'Critical', tone: 'critical' },
  { label: 'No Data', tone: 'none' },
] as const;
