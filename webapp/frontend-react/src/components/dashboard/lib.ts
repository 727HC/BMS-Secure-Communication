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

export type KpiTone = 'blue' | 'green' | 'amber' | 'purple';
export type KpiIconName = 'battery' | 'check' | 'alert' | 'chain';
export type KpiSnapshotKind = 'total' | 'normal' | 'alerts' | 'verified';
export type SnapshotSparklineKind = Exclude<KpiSnapshotKind, 'total'>;
export type KpiSnapshotTrendKind = 'total' | SnapshotSparklineKind;
export type FleetGaugeTone = 'green' | 'blue' | 'amber' | 'purple';

export interface KpiSnapshotViewModel {
  kind: KpiSnapshotKind;
  fill: number;
  caption: string;
  valueLabel: string;
}

export interface KpiTrendPoint {
  label: string;
  value: number;
  timestamp: number;
}

export interface KpiTrendBaseViewModel {
  points: KpiTrendPoint[];
  caption: string;
  valueLabel: string;
}

export type KpiTrendViewModel =
  | (KpiTrendBaseViewModel & {
    kind: KpiSnapshotKind;
    mode: 'daily-count';
    source: 'passports.createdAt';
  })
  | (KpiTrendBaseViewModel & {
    kind: KpiSnapshotTrendKind;
    mode: 'snapshot-sparkline';
    source: 'metric.snapshot';
  });

export interface KpiVisualViewModel {
  trend: KpiTrendViewModel;
}

export interface KpiSnapshotInput {
  kind: KpiSnapshotKind;
  value: number;
  total: number;
  alerts: number;
}

export interface KpiCardViewModel {
  label: string;
  value: string;
  delta: string;
  visual: KpiVisualViewModel;
  tone: KpiTone;
  icon: KpiIconName;
}

export function buildKpiSnapshot({ kind, value, total, alerts }: KpiSnapshotInput): KpiSnapshotViewModel {
  const valueLabel = (fill: number) => `${formatMetricNumber(fill * 100)}%`;

  if (kind === 'total') {
    const scaleMax = Math.max(10, niceCeil(total));
    const fill = total > 0 ? clamp01(total / scaleMax) : 0;
    return {
      kind,
      fill,
      caption: total > 0 ? `현재 ${total} / ${scaleMax}대 규모` : '등록 데이터 없음',
      valueLabel: valueLabel(fill),
    };
  }

  if (kind === 'normal') {
    const fill = total > 0 ? clamp01(value / total) : 0;
    return {
      kind,
      fill,
      caption: total > 0 ? `${value} / ${total} 정상` : '등록 데이터 없음',
      valueLabel: valueLabel(fill),
    };
  }

  if (kind === 'alerts') {
    const base = Math.max(total, 1);
    const fill = alerts > 0 ? clamp01(alerts / (alerts + base)) : 0;
    return {
      kind,
      fill,
      caption: alerts > 0 ? `경보 ${alerts}건 · 등록 ${total}대 기준` : '경보 없음',
      valueLabel: valueLabel(fill),
    };
  }

  const fill = total > 0 ? clamp01(value / total) : 0;
  return {
    kind,
    fill,
    caption: total > 0 ? `${value} / ${total} 검증` : '등록 데이터 없음',
    valueLabel: valueLabel(fill),
  };
}

export const SNAPSHOT_SPARKLINE_OFFSETS: Record<KpiSnapshotTrendKind, number[]> = {
  total: [-4, -2, -3, 0, 2, 1, 4, 3],
  normal: [-6, -2, -4, 1, 3, 1, 6, 5],
  alerts: [-3, 1, -1, 2, 0, 4, 3, 6],
  verified: [-5, -3, 0, -1, 3, 2, 5, 4],
};

export function buildSnapshotSparkline(snapshot: KpiSnapshotViewModel): KpiTrendViewModel {
  const rawBase = snapshot.fill * 100;
  // 값이 0이면 그래프도 평평한 0 baseline. base=8 fudge 제거 (실제값과 일치).
  const points = SNAPSHOT_SPARKLINE_OFFSETS[snapshot.kind].map((offset, index) => ({
    label: `snapshot-${index + 1}`,
    value: rawBase === 0 ? 0 : Math.min(100, Math.max(0, rawBase + offset)),
    timestamp: index,
  }));

  return {
    kind: snapshot.kind,
    mode: 'snapshot-sparkline',
    source: 'metric.snapshot',
    points,
    caption: '현재 비율 시각화',
    valueLabel: snapshot.valueLabel,
  };
}

export const KPI_FILTERS: Record<KpiSnapshotKind, (p: DashboardPassport) => boolean> = {
  total: () => true,
  normal: isPassportNormal,
  alerts: (p) => !isPassportNormal(p),
  verified: isPassportVerified,
};

export const KPI_TREND_LABELS: Record<KpiSnapshotKind, { caption: string; unit: string }> = {
  total: { caption: '일별 등록 추이', unit: '대/일' },
  normal: { caption: '정상 상태 일별 등록', unit: '대/일' },
  alerts: { caption: '알림 발생 일별 등록', unit: '건/일' },
  verified: { caption: '검증 완료 일별 등록', unit: '건/일' },
};

export function buildDailyKindTrend(
  kind: KpiSnapshotKind,
  passports: DashboardPassport[],
): KpiTrendViewModel | null {
  const filtered = passports.filter(KPI_FILTERS[kind]);
  if (filtered.length === 0) return null;

  const buckets = new Map<string, { count: number; timestamp: number }>();

  for (const passport of filtered) {
    if (!passport.createdAt) continue;
    const parsed = Date.parse(passport.createdAt);
    if (!Number.isFinite(parsed)) continue;

    const date = new Date(parsed);
    const label = date.toISOString().slice(0, 10);
    const timestamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const bucket = buckets.get(label);
    buckets.set(label, {
      count: (bucket?.count ?? 0) + 1,
      timestamp,
    });
  }

  if (buckets.size < 2) return null;

  const points = [...buckets.entries()]
    .sort(([, a], [, b]) => a.timestamp - b.timestamp)
    .map(([label, bucket]) => ({ label, value: bucket.count, timestamp: bucket.timestamp }));

  const maxDaily = Math.max(...points.map((point) => point.value));
  const labels = KPI_TREND_LABELS[kind];

  return {
    kind,
    mode: 'daily-count',
    source: 'passports.createdAt',
    points,
    caption: `${labels.caption} · ${points.length}개 날짜`,
    valueLabel: `최고 ${maxDaily}${labels.unit}`,
  };
}

export function buildKpiVisual({
  kind,
  snapshot,
  passports,
}: {
  kind: KpiSnapshotKind;
  snapshot: KpiSnapshotViewModel;
  passports: DashboardPassport[];
  total: number;
}): KpiVisualViewModel {
  // 4 KPI 모두 createdAt 기반 일별 시계열로 통일. 데이터 부족(필터 결과 0/1일)이면
  // snapshot wave fallback (현재 비율 amplitude).
  const dailyTrend = buildDailyKindTrend(kind, passports);
  if (dailyTrend) return { trend: dailyTrend };
  return { trend: buildSnapshotSparkline(snapshot) };
}

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
