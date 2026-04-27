import { Fragment, useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { scaleSOC, scaleTemp } from '../lib/helpers';

const DASHBOARD_AUDIT_PATH = '/audit?page=1&limit=5&writeOnly=false';
const AUDIT_ALLOWED_ORGS = new Set(['ManufacturerMSP', 'RegulatorMSP']);
const AUDIT_REQUIRED_LABEL = '권한 필요';

type DashboardRoute = '/bmu-data' | '/passports' | '/maintenance' | '/audit-log';

type DashboardSourcePermission = 'allowed' | 'denied' | 'unknown';

interface DashboardSourceState {
  loading: boolean;
  error: string | null;
  permission: DashboardSourcePermission;
  loadedAt: string | null;
}

interface DashboardPassport {
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

interface DashboardStatus {
  fabric?: string;
  channel?: string;
  contract?: string;
  org?: string;
  [key: string]: unknown;
}

interface DashboardBmuRecord {
  recordId?: string;
  timestamp?: string;
  soc?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  dischargeCycles?: number;
  statusFlags?: number;
  [key: string]: unknown;
}

interface DashboardAuditRecord {
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

const SOURCE_IDLE: DashboardSourceState = {
  loading: false,
  error: null,
  permission: 'unknown',
  loadedAt: null,
};

function sourceLoading(permission: DashboardSourcePermission = 'allowed'): DashboardSourceState {
  return { loading: true, error: null, permission, loadedAt: null };
}

function sourceLoaded(permission: DashboardSourcePermission = 'allowed'): DashboardSourceState {
  return { loading: false, error: null, permission, loadedAt: new Date().toISOString() };
}

function sourceError(error: string, permission: DashboardSourcePermission = 'allowed'): DashboardSourceState {
  return { loading: false, error, permission, loadedAt: null };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return optionalString(value);
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normalizeList<T>(payload: unknown, normalizeRecord: (value: unknown) => T | null): T[] {
  const source = Array.isArray(payload)
    ? payload
    : isRecord(payload) && Array.isArray(payload.records)
      ? payload.records
      : isRecord(payload) && Array.isArray(payload.items)
        ? payload.items
        : [];

  return source.map(normalizeRecord).filter((item): item is T => item !== null);
}

function normalizePassport(value: unknown): DashboardPassport | null {
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

function normalizeStatus(value: unknown): DashboardStatus {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  return {
    ...record,
    fabric: optionalString(record.fabric),
    channel: optionalString(record.channel),
    contract: optionalString(record.contract),
    org: optionalString(record.org),
  };
}

function normalizeBmuRecord(value: unknown): DashboardBmuRecord | null {
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

function normalizeAuditRecord(value: unknown): DashboardAuditRecord | null {
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isPermissionError(message: string): boolean {
  return /\b(401|403)\b|access denied|not authorized|unauthorized|forbidden|permission denied|권한/i.test(message);
}

function normalizedStatus(value: string | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function passportSoh(passport: DashboardPassport | null | undefined): number | undefined {
  return passport?.currentSoh ?? passport?.soh;
}

function passportSoc(passport: DashboardPassport | null | undefined): number | undefined {
  return passport?.currentSoc ?? passport?.soc;
}

function isPassportVerified(passport: DashboardPassport): boolean {
  return normalizedStatus(passport.regulatoryVerificationStatus) === 'VERIFIED'
    || normalizedStatus(passport.physicalHistoryVerification?.status) === 'VERIFIED';
}

function isPassportNormal(passport: DashboardPassport): boolean {
  const soh = passportSoh(passport);
  return normalizedStatus(passport.status) === 'ACTIVE' && (soh == null || soh >= 80);
}

function isAuditAvailable(source: DashboardSourceState): boolean {
  return source.permission === 'allowed' && !source.loading && !source.error && source.loadedAt !== null;
}

function isFailedAuditRecord(record: DashboardAuditRecord): boolean {
  return record.success === false || (record.statusCode != null && record.statusCode >= 400);
}

type AlertSeverity = 'High' | 'Medium' | 'Low';
type TaskTone = 'blue' | 'amber' | 'green' | 'purple';
type TaskIconName = 'folder' | 'user' | 'wrench' | 'upload';

interface AlertRowViewModel {
  key: string;
  message: string;
  source: string;
  severity: AlertSeverity;
  time: string;
}

interface TaskRowViewModel {
  label: string;
  value: string;
  unit: string;
  tone: TaskTone;
  icon: TaskIconName;
  route: DashboardRoute;
}

interface PassportOptionViewModel {
  id: string;
  label: string;
  status: string;
}

interface LedgerRowViewModel {
  key: string;
  tx: string;
  block: string;
  organization: string;
  eventType: string;
  timestamp: string;
  status: string;
}

function formatRelativeTime(value: string | null | undefined): string {
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

function passportReference(passport: DashboardPassport, index: number): string {
  return passport.passportId || passport.serialNumber || passport.batteryId || passport.did || `passport-${index + 1}`;
}

function passportOptionLabel(passport: DashboardPassport, index: number): string {
  const reference = passportReference(passport, index);
  const detail = passport.model || passport.serialNumber || passport.batteryId;
  return detail && detail !== reference ? `${reference} · ${detail}` : reference;
}

function passportAlertTime(passport: DashboardPassport): string {
  return formatRelativeTime(passport.updatedAt ?? passport.createdAt);
}

function requiresVerificationAttention(passport: DashboardPassport): boolean {
  const regulatory = normalizedStatus(passport.regulatoryVerificationStatus);
  return regulatory !== 'VERIFIED' || !isPassportVerified(passport);
}

function verificationAlertMessage(passport: DashboardPassport): string {
  const regulatory = normalizedStatus(passport.regulatoryVerificationStatus);
  if (regulatory === 'FAILED') return '규제 검증 실패';
  if (regulatory === 'PARTIAL') return '규제 검증 부분 완료';
  return '규제 검증 대기';
}

function verificationAlertSeverity(passport: DashboardPassport): AlertSeverity {
  return normalizedStatus(passport.regulatoryVerificationStatus) === 'FAILED' ? 'High' : 'Medium';
}

function hasBmuSnapshotFields(passport: DashboardPassport): boolean {
  return passport.currentSoc != null
    || passport.currentSoh != null
    || passport.soh != null
    || passport.totalDischargeCycles != null;
}

function buildAlertRows(
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

function buildTaskRows(passports: DashboardPassport[]): TaskRowViewModel[] {
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

function auditBlockTarget(record: DashboardAuditRecord): string {
  return record.block || record.blockNumber || record.targetId || '—';
}

function auditStatusLabel(record: DashboardAuditRecord): string {
  if (record.success === false) return record.statusCode != null ? `Failed ${record.statusCode}` : 'Failed';
  if (record.success === true) return record.statusCode != null ? `Success ${record.statusCode}` : 'Success';
  if (record.statusCode != null) return `HTTP ${record.statusCode}`;
  return 'Unknown';
}

function buildLedgerRows(records: DashboardAuditRecord[]): LedgerRowViewModel[] {
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

function bmuTimestamp(record: DashboardBmuRecord): number {
  if (!record.timestamp) return 0;
  const timestamp = Date.parse(record.timestamp);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function latestBmuRecord(records: DashboardBmuRecord[]): DashboardBmuRecord | null {
  return records.reduce<DashboardBmuRecord | null>((latest, record) => {
    if (!latest) return record;
    return bmuTimestamp(record) > bmuTimestamp(latest) ? record : latest;
  }, null);
}

function formatMetricNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toFixed(1)).toString();
}

function formatPercent(count: number, total: number): string {
  if (total <= 0) return '0%';
  return `${formatMetricNumber((count / total) * 100)}%`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;

  const exponent = Math.floor(Math.log10(value));
  const scale = 10 ** exponent;
  const normalized = value / scale;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return step * scale;
}

type KpiTone = 'blue' | 'green' | 'amber' | 'purple';
type KpiIconName = 'battery' | 'check' | 'alert' | 'chain';
type KpiSnapshotKind = 'total' | 'normal' | 'alerts' | 'verified';
type SnapshotSparklineKind = Exclude<KpiSnapshotKind, 'total'>;
type KpiSnapshotTrendKind = 'total' | SnapshotSparklineKind;
type FleetGaugeTone = 'green' | 'blue' | 'amber' | 'purple';

interface KpiSnapshotViewModel {
  kind: KpiSnapshotKind;
  fill: number;
  caption: string;
  valueLabel: string;
}

interface KpiTrendPoint {
  label: string;
  value: number;
  timestamp: number;
}

interface KpiTrendBaseViewModel {
  points: KpiTrendPoint[];
  caption: string;
  valueLabel: string;
}

type KpiTrendViewModel =
  | (KpiTrendBaseViewModel & {
    kind: 'total';
    mode: 'daily-count';
    source: 'passports.createdAt';
  })
  | (KpiTrendBaseViewModel & {
    kind: KpiSnapshotTrendKind;
    mode: 'snapshot-sparkline';
    source: 'metric.snapshot';
  });

interface KpiVisualViewModel {
  trend: KpiTrendViewModel;
}

interface KpiSnapshotInput {
  kind: KpiSnapshotKind;
  value: number;
  total: number;
  alerts: number;
}

interface KpiCardViewModel {
  label: string;
  value: string;
  delta: string;
  visual: KpiVisualViewModel;
  tone: KpiTone;
  icon: KpiIconName;
}

function buildKpiSnapshot({ kind, value, total, alerts }: KpiSnapshotInput): KpiSnapshotViewModel {
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

const SNAPSHOT_SPARKLINE_OFFSETS: Record<KpiSnapshotTrendKind, number[]> = {
  total: [-4, -2, -3, 0, 2, 1, 4, 3],
  normal: [-6, -2, -4, 1, 3, 1, 6, 5],
  alerts: [-3, 1, -1, 2, 0, 4, 3, 6],
  verified: [-5, -3, 0, -1, 3, 2, 5, 4],
};

function buildSnapshotSparkline(snapshot: KpiSnapshotViewModel): KpiTrendViewModel {
  const rawBase = snapshot.fill * 100;
  const base = rawBase === 0 ? 8 : rawBase;
  const points = SNAPSHOT_SPARKLINE_OFFSETS[snapshot.kind].map((offset, index) => ({
    label: `snapshot-${index + 1}`,
    value: Math.min(100, Math.max(0, base + offset)),
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

function buildDailyRegistrationTrend(passports: DashboardPassport[], total: number): KpiTrendViewModel | null {
  if (total <= 0) return null;

  const buckets = new Map<string, { count: number; timestamp: number }>();

  for (const passport of passports) {
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

  const bucketTotal = points.reduce((sum, point) => sum + point.value, 0);
  if (bucketTotal !== total) return null;

  const maxDailyCount = Math.max(...points.map((point) => point.value));

  return {
    kind: 'total',
    mode: 'daily-count',
    source: 'passports.createdAt',
    points,
    caption: `일별 등록 추이 · ${points.length}개 실제 날짜`,
    valueLabel: `최고 ${maxDailyCount}대/일`,
  };
}

function buildKpiVisual({
  kind,
  snapshot,
  passports,
  total,
}: {
  kind: KpiSnapshotKind;
  snapshot: KpiSnapshotViewModel;
  passports: DashboardPassport[];
  total: number;
}): KpiVisualViewModel {
  const snapshotTrend = buildSnapshotSparkline(snapshot);
  if (kind !== 'total') return { trend: snapshotTrend };

  const trend = buildDailyRegistrationTrend(passports, total);
  return { trend: trend ?? snapshotTrend };
}

interface FleetGaugeViewModel {
  label: string;
  value: string;
  tone: FleetGaugeTone;
}

interface DataflowNodeViewModel {
  key: 'cmu' | 'bmu' | 'agent' | 'blockchain' | 'passport';
  label: string;
  action: string;
  status: 'Unknown' | 'Data' | 'Loaded' | 'Synced';
}

interface SecurityRowViewModel {
  label: string;
  value: string;
  tone: 'green' | 'blue' | 'amber' | 'purple' | 'neutral';
  icon: 'lock' | 'shield' | 'key';
}

const FLEET_LEGEND = [
  { label: 'Normal', tone: 'normal' },
  { label: 'Warning', tone: 'warning' },
  { label: 'Critical', tone: 'critical' },
  { label: 'No Data', tone: 'none' },
] as const;

export default function DashboardPage() {
  const { org, token, userId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const batteryListboxId = useId();
  const requestedPassportId = searchParams.get('passportId');
  const hasDashboardAuth = Boolean(token && userId);
  const canReadAudit = org ? AUDIT_ALLOWED_ORGS.has(org) : false;

  const [passports, setPassports] = useState<DashboardPassport[]>([]);
  const [platformStatus, setPlatformStatus] = useState<DashboardStatus | null>(null);
  const [bmuRecords, setBmuRecords] = useState<DashboardBmuRecord[]>([]);
  const [auditRecords, setAuditRecords] = useState<DashboardAuditRecord[]>([]);
  const [selectedPassportId, setSelectedPassportId] = useState<string | null>(null);
  const [passportSource, setPassportSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [statusSource, setStatusSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [bmuSource, setBmuSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [auditSource, setAuditSource] = useState<DashboardSourceState>(SOURCE_IDLE);
  const [batteryMenuOpen, setBatteryMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setPassports([]);
      setPassportSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    setPassportSource(sourceLoading());
    api.get<unknown>('/passports')
      .then((data) => {
        if (cancelled) return;
        setPassports(normalizeList(data, normalizePassport));
        setPassportSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        setPassports([]);
        setPassportSource(sourceError(errorMessage(error, '여권 목록 조회 실패')));
      });

    return () => { cancelled = true; };
  }, [hasDashboardAuth, token, userId]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setPlatformStatus(null);
      setStatusSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    setStatusSource(sourceLoading());
    api.get<unknown>('/status')
      .then((data) => {
        if (cancelled) return;
        setPlatformStatus(normalizeStatus(data));
        setStatusSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        setPlatformStatus(null);
        setStatusSource(sourceError(errorMessage(error, '플랫폼 상태 조회 실패')));
      });

    return () => { cancelled = true; };
  }, [hasDashboardAuth, token, userId]);

  useEffect(() => {
    if (passportSource.loading || passportSource.permission === 'unknown' || passportSource.error) return;

    const passportIds = passports.map((passport) => passport.passportId).filter((id): id is string => Boolean(id));
    const nextSelectedId = requestedPassportId && passportIds.includes(requestedPassportId)
      ? requestedPassportId
      : passportIds[0] ?? null;

    setSelectedPassportId((current) => (current === nextSelectedId ? current : nextSelectedId));

    if (nextSelectedId && requestedPassportId !== nextSelectedId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('passportId', nextSelectedId);
      setSearchParams(nextParams, { replace: true, preventScrollReset: true });
    } else if (!nextSelectedId && requestedPassportId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('passportId');
      setSearchParams(nextParams, { replace: true, preventScrollReset: true });
    }
  }, [passportSource, passports, requestedPassportId, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setBmuRecords([]);
      setBmuSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    if (!selectedPassportId) {
      setBmuRecords([]);
      setBmuSource({ loading: false, error: null, permission: 'unknown', loadedAt: null });
      return () => { cancelled = true; };
    }

    setBmuRecords([]);
    setBmuSource(sourceLoading());
    api.get<unknown>(`/bmu/records/${encodeURIComponent(selectedPassportId)}`)
      .then((data) => {
        if (cancelled) return;
        setBmuRecords(normalizeList(data, normalizeBmuRecord));
        setBmuSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        const message = errorMessage(error, 'BMU 기록 조회 실패');
        setBmuRecords([]);
        setBmuSource(sourceError(message, isPermissionError(message) ? 'denied' : 'allowed'));
      });

    return () => { cancelled = true; };
  }, [hasDashboardAuth, selectedPassportId, token, userId]);

  useEffect(() => {
    let cancelled = false;

    if (!hasDashboardAuth) {
      setAuditRecords([]);
      setAuditSource(sourceError('인증 정보 없음', 'denied'));
      return () => { cancelled = true; };
    }

    if (!canReadAudit) {
      setAuditRecords([]);
      setAuditSource({ loading: false, error: null, permission: 'denied', loadedAt: null });
      return () => { cancelled = true; };
    }

    setAuditSource(sourceLoading());
    api.get<unknown>(DASHBOARD_AUDIT_PATH)
      .then((data) => {
        if (cancelled) return;
        setAuditRecords(normalizeList(data, normalizeAuditRecord));
        setAuditSource(sourceLoaded());
      })
      .catch((error) => {
        if (cancelled) return;
        const message = errorMessage(error, '감사 기록 조회 실패');
        setAuditRecords([]);
        setAuditSource(sourceError(message, isPermissionError(message) ? 'denied' : 'allowed'));
      });

    return () => { cancelled = true; };
  }, [canReadAudit, hasDashboardAuth, org, token, userId]);

  const selectedPassport = useMemo(
    () => passports.find((passport) => passport.passportId === selectedPassportId) ?? null,
    [passports, selectedPassportId]
  );

  const selectedPassportLabel = useMemo(() => {
    if (passportSource.loading) return 'Fleet (Loading Passports)';
    if (!selectedPassportId) return passports.length ? 'Fleet (Selection Pending)' : 'Fleet (No Batteries)';
    const detail = selectedPassport?.model || selectedPassport?.serialNumber || selectedPassport?.batteryId;
    return detail ? `${selectedPassportId} · ${detail}` : selectedPassportId;
  }, [passportSource.loading, passports.length, selectedPassport, selectedPassportId]);

  const selectedBmuRecord = useMemo(() => latestBmuRecord(bmuRecords), [bmuRecords]);
  const alertRows = useMemo(
    () => buildAlertRows(passports, platformStatus, statusSource, auditRecords, auditSource),
    [auditRecords, auditSource, passports, platformStatus, statusSource]
  );
  const taskRows = useMemo(() => buildTaskRows(passports), [passports]);
  const totalTaskCount = useMemo(
    () => taskRows.reduce((sum, row) => sum + Number(row.value), 0),
    [taskRows]
  );
  const ledgerRows = useMemo(() => buildLedgerRows(auditRecords), [auditRecords]);
  const passportOptions = useMemo<PassportOptionViewModel[]>(() => passports.flatMap((passport, index) => {
    if (!passport.passportId) return [];
    return [{
      id: passport.passportId,
      label: passportOptionLabel(passport, index),
      status: passport.status || '상태 없음',
    }];
  }), [passports]);
  const ledgerFallback = auditSource.permission === 'denied'
    ? '권한 필요'
    : auditSource.loading
      ? '감사 조회 중'
      : auditSource.error
        ? '감사 기록 조회 실패'
        : ledgerRows.length === 0
          ? '원장 로그가 없습니다'
          : null;

  const kpiCards = useMemo<KpiCardViewModel[]>(() => {
    const total = passports.length;
    const normal = passports.filter(isPassportNormal).length;
    const verified = passports.filter(isPassportVerified).length;
    const alerts = alertRows.length;

    const totalSnapshot = buildKpiSnapshot({ kind: 'total', value: total, total, alerts });
    const normalSnapshot = buildKpiSnapshot({ kind: 'normal', value: normal, total, alerts });
    const alertsSnapshot = buildKpiSnapshot({ kind: 'alerts', value: alerts, total, alerts });
    const verifiedSnapshot = buildKpiSnapshot({ kind: 'verified', value: verified, total, alerts });

    return [
      {
        label: '총 등록 배터리',
        value: String(total),
        delta: passportSource.loading ? '조회 중' : 'API 기준',
        visual: buildKpiVisual({ kind: 'total', snapshot: totalSnapshot, passports, total }),
        tone: 'blue',
        icon: 'battery',
      },
      {
        label: '정상 상태',
        value: String(normal),
        delta: formatPercent(normal, total),
        visual: buildKpiVisual({ kind: 'normal', snapshot: normalSnapshot, passports, total }),
        tone: 'green',
        icon: 'check',
      },
      {
        label: '알림 / 경고',
        value: String(alerts),
        delta: '상태 기반',
        visual: buildKpiVisual({ kind: 'alerts', snapshot: alertsSnapshot, passports, total }),
        tone: 'amber',
        icon: 'alert',
      },
      {
        label: '블록체인 검증 완료',
        value: String(verified),
        delta: formatPercent(verified, total),
        visual: buildKpiVisual({ kind: 'verified', snapshot: verifiedSnapshot, passports, total }),
        tone: 'purple',
        icon: 'chain',
      },
    ];
  }, [alertRows.length, passportSource.loading, passports]);

  const fleetGauges = useMemo<FleetGaugeViewModel[]>(() => {
    const soc = selectedBmuRecord?.soc ?? passportSoc(selectedPassport);
    const soh = passportSoh(selectedPassport);
    const temperature = selectedBmuRecord?.temperature;

    return [
      { label: 'SOC (선택)', value: soc != null ? `${formatMetricNumber(scaleSOC(soc))} %` : '— %', tone: 'green' },
      { label: 'SOH (선택)', value: soh != null ? `${formatMetricNumber(soh)} %` : '— %', tone: 'blue' },
      { label: 'Temperature (BMU)', value: temperature != null ? `${formatMetricNumber(scaleTemp(temperature))} ℃` : '— ℃', tone: 'amber' },
      { label: 'Health Score', value: soh != null ? `${formatMetricNumber(soh)} /100` : '— /100', tone: 'purple' },
    ];
  }, [selectedBmuRecord, selectedPassport]);

  const dataflowNodes = useMemo<DataflowNodeViewModel[]>(() => {
    const passportsLoaded = passportSource.permission === 'allowed' && !passportSource.loading && !passportSource.error && passportSource.loadedAt;
    const fabricSynced = normalizedStatus(platformStatus?.fabric) === 'CONNECTED';

    return [
      { key: 'cmu', label: 'CMU', action: '수집', status: 'Unknown' },
      { key: 'bmu', label: 'BMU', action: '전송', status: bmuRecords.length > 0 ? 'Data' : 'Unknown' },
      { key: 'agent', label: 'Agent', action: '검증', status: passportsLoaded ? 'Loaded' : 'Unknown' },
      { key: 'blockchain', label: 'Blockchain', action: '기록', status: fabricSynced ? 'Synced' : 'Unknown' },
      { key: 'passport', label: 'Passport', action: '발급', status: selectedPassport ? 'Loaded' : 'Unknown' },
    ];
  }, [bmuRecords.length, passportSource, platformStatus?.fabric, selectedPassport]);

  const securityRows = useMemo<SecurityRowViewModel[]>(() => {
    const statusReachable = Boolean(statusSource.loadedAt && !statusSource.error);
    let auditValue = '상태 확인 불가';
    let auditTone: SecurityRowViewModel['tone'] = 'neutral';

    if (auditSource.permission === 'denied') {
      auditValue = '감사 권한 필요';
      auditTone = 'amber';
    } else if (auditSource.loading) {
      auditValue = '확인 중';
    } else if (auditSource.error) {
      auditValue = '감사 확인 실패';
      auditTone = 'amber';
    } else if (auditSource.loadedAt) {
      auditValue = '감사 접근 가능';
      auditTone = 'green';
    }

    return [
      { label: 'Auth Token', value: token ? '토큰 확인됨' : '상태 확인 불가', tone: token ? 'green' : 'neutral', icon: 'lock' },
      { label: 'Status Endpoint', value: statusReachable ? '상태 응답 수신' : statusSource.loading ? '확인 중' : '상태 확인 불가', tone: statusReachable ? 'green' : 'neutral', icon: 'shield' },
      { label: 'Audit Access', value: auditValue, tone: auditTone, icon: 'shield' },
      { label: 'AES / CMAC / Ed25519', value: '상태 확인 불가', tone: 'neutral', icon: 'key' },
    ];
  }, [auditSource, statusSource, token]);

  const dashboardDataSummary = useMemo(() => {
    const authSummary = hasDashboardAuth ? `${org || 'UnknownMSP'} / ${userId}` : '인증 정보 없음';
    const passportSummary = passportSource.loading
      ? '여권 조회 중'
      : passportSource.error
        ? `여권 오류: ${passportSource.error}`
        : `여권 ${passports.length}건`;
    const statusSummary = statusSource.loading
      ? '상태 조회 중'
      : statusSource.error
        ? `상태 오류: ${statusSource.error}`
        : `Fabric ${platformStatus?.fabric || 'unknown'}`;
    const bmuSummary = bmuSource.loading
      ? 'BMU 조회 중'
      : bmuSource.error
        ? `BMU 오류: ${bmuSource.error}`
        : selectedPassportId
          ? `BMU ${bmuRecords.length}건`
          : 'BMU 선택 대기';
    const auditSummary = auditSource.permission === 'denied'
      ? '감사 권한 필요'
      : auditSource.loading
        ? '감사 조회 중'
        : auditSource.error
          ? `감사 오류: ${auditSource.error}`
          : `감사 ${auditRecords.length}건`;

    return `${authSummary} · ${passportSummary} · ${statusSummary} · ${bmuSummary} · ${auditSummary}`;
  }, [
    auditRecords.length,
    auditSource,
    bmuRecords.length,
    bmuSource,
    hasDashboardAuth,
    org,
    passportSource,
    passports.length,
    platformStatus?.fabric,
    selectedPassportId,
    statusSource,
    userId,
  ]);

  const batterySelectorDisabled = passportSource.loading || passportOptions.length === 0;
  const batterySelectorTitle = passportSource.loading
    ? '여권 조회 중'
    : passportOptions.length === 0
      ? '선택 가능한 배터리 없음'
      : selectedPassportLabel;

  const selectPassport = (passportId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('passportId', passportId);
    setSearchParams(nextParams, { preventScrollReset: true });
    setBatteryMenuOpen(false);
  };

  const navigateDashboard = (route: DashboardRoute) => {
    navigate(route);
  };

  const handleBatteryTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setBatteryMenuOpen(false);
    }
  };

  const handleBatteryOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, passportId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectPassport(passportId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setBatteryMenuOpen(false);
    }
  };

  return (
    <div className="vk-dash" data-selected-passport-id={selectedPassportId || undefined}>
      <header className="vk-dash__head">
        <div>
          <h1 className="vk-dash__title">Overview</h1>
          <p className="vk-dash__sub" title={dashboardDataSummary}>배터리 여권 시스템의 전체 현황을 한눈에 확인하세요.</p>
        </div>
      </header>

      <div className="vk-grid vk-grid--4">
        {kpiCards.map((k) => (
          <article key={k.label} className={`vk-card vk-kpi vk-kpi--${k.tone}`}>
            <div className="vk-kpi__top">
              <div className="vk-kpi__copy">
                <span className="vk-kpi__label">{k.label}</span>
                <div className="vk-kpi__value">{k.value}</div>
                <span className="vk-kpi__delta">{k.delta}</span>
              </div>
              <span className="vk-kpi__icon" aria-hidden="true">
                <KpiIcon name={k.icon} />
              </span>
            </div>
            <KpiTrendSparkline label={k.label} trend={k.visual.trend} />
          </article>
        ))}
      </div>

      <div className="vk-grid vk-grid--fleet">
        <article className="vk-card vk-fleet">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Fleet Digital Twin</h2>
              <p className="vk-card__sub">Viewing: {selectedPassportLabel}</p>
            </div>
            <div
              className="vk-battery-select"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setBatteryMenuOpen(false);
              }}
            >
              <button
                type="button"
                className="vk-selectbtn"
                title={batterySelectorTitle}
                aria-label={`Select Battery: ${batterySelectorTitle}`}
                aria-haspopup="listbox"
                aria-expanded={batteryMenuOpen}
                aria-controls={batteryMenuOpen ? batteryListboxId : undefined}
                disabled={batterySelectorDisabled}
                onClick={() => setBatteryMenuOpen((open) => !open)}
                onKeyDown={handleBatteryTriggerKeyDown}
              >
                <span>Select Battery</span>
                <ChevronDownIcon />
              </button>
              {batteryMenuOpen ? (
                <div id={batteryListboxId} className="vk-battery-select__menu" role="listbox" aria-label="배터리 선택">
                  {passportOptions.map((option) => {
                    const selected = option.id === selectedPassportId;
                    return (
                      <div
                        key={option.id}
                        role="option"
                        aria-selected={selected}
                        tabIndex={0}
                        className={`vk-battery-option${selected ? ' vk-battery-option--selected' : ''}`}
                        onClick={() => selectPassport(option.id)}
                        onKeyDown={(event) => handleBatteryOptionKeyDown(event, option.id)}
                      >
                        <span className="vk-battery-option__label">{option.label}</span>
                        <span className="vk-battery-option__meta">{option.status}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <div className="vk-fleet__body">
            <div className="vk-fleet__visual" aria-hidden="true">
              <img className="vk-fleet__image" src="/dashboard-fleet-chassis-cutout.png" alt="" loading="eager" decoding="async" />
              <span className="vk-fleet__expand">
                <ExpandIcon />
              </span>
            </div>
            <div className="vk-fleet__gauges">
              {fleetGauges.map((g) => (
                <FleetGauge key={g.label} label={g.label} value={g.value} tone={g.tone} />
              ))}
            </div>
          </div>
          <div className="vk-fleet__legend" aria-label="Fleet status legend">
            {FLEET_LEGEND.map((item) => (
              <span key={item.label} className={`vk-fleet__legend-item vk-fleet__legend-item--${item.tone}`}>
                {item.label}
              </span>
            ))}
          </div>
        </article>

        <article className="vk-card vk-dataflow">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">Data Flow</h2>
              </div>
              <p className="vk-card__sub">기준 처리 단계</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron" onClick={() => navigateDashboard('/bmu-data')}>
              <span>상세 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="vk-dataflow__nodes">
            {dataflowNodes.map((n, index) => (
              <Fragment key={n.key}>
                <div className="vk-dataflow__node">
                  <div className="vk-dataflow__badge"><NodeGlyph name={n.key} /></div>
                  <p className="vk-dataflow__label">{n.label}</p>
                  <p className="vk-dataflow__val">{n.action}</p>
                  <span className={`vk-dataflow__status vk-dataflow__status--${n.status.toLowerCase()}`}>{n.status}</span>
                </div>
                {index < dataflowNodes.length - 1 ? (
                  <span className="vk-dataflow__connector" aria-hidden="true">
                    <ConnectorArrow />
                  </span>
                ) : null}
              </Fragment>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--2">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">Alerts</h2>
                <span className="vk-card__count">{alertRows.length}</span>
              </div>
              <p className="vk-card__sub">우선 확인 알림</p>
            </div>
            <button
              type="button"
              className="vk-linkbtn vk-linkbtn--chevron"
              disabled={!canReadAudit}
              title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
              aria-label={canReadAudit ? '전체 알림 보기' : AUDIT_REQUIRED_LABEL}
              onClick={canReadAudit ? () => navigateDashboard('/audit-log') : undefined}
            >
              <span>{canReadAudit ? '전체 알림 보기' : AUDIT_REQUIRED_LABEL}</span>
              <ChevronRightIcon />
            </button>
          </div>
          <ul className="vk-alerts">
            {alertRows.length === 0 ? (
              <li className="vk-alerts__row">
                <span className="vk-alerts__msg" style={{ gridColumn: '1 / -1' }}>표시할 알림이 없습니다</span>
              </li>
            ) : alertRows.map((a) => {
              const severity = a.severity.toLowerCase();
              return (
                <li key={a.key} className={`vk-alerts__row vk-alerts__row--${severity}`}>
                  <span className={`vk-alerts__icon vk-alerts__icon--${severity}`} aria-hidden="true">
                    <AlertGlyph severity={a.severity} />
                  </span>
                  <span className="vk-alerts__msg">{a.message}</span>
                  <span className="vk-alerts__id">{a.source}</span>
                  <span className={`vk-alerts__status vk-alerts__status--${severity}`}>{a.severity}</span>
                  <span className="vk-alerts__time">{a.time}</span>
                  <span className="vk-alerts__chevron" aria-hidden="true">
                    <ChevronRightIcon />
                  </span>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Security Status</h2>
              <p className="vk-card__sub">플랫폼 보안 기준값</p>
            </div>
            <button
              type="button"
              className="vk-linkbtn"
              disabled={!canReadAudit}
              title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
              aria-label={canReadAudit ? 'Security Status 상세 보기' : AUDIT_REQUIRED_LABEL}
              onClick={canReadAudit ? () => navigateDashboard('/audit-log') : undefined}
            >
              {canReadAudit ? '상세 보기' : AUDIT_REQUIRED_LABEL}
            </button>
          </div>
          <div className="vk-secbar" aria-label="Security Status">
            {securityRows.map((s) => (
              <div key={s.label} className={`vk-sec vk-sec--${s.tone}`}>
                <div className="vk-sec__icon" aria-hidden="true"><SecurityGlyph name={s.icon} /></div>
                <div className="vk-sec__copy">
                  <p className="vk-sec__label">{s.label}</p>
                  <p className="vk-sec__value">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="vk-grid vk-grid--ledger">
        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <div className="vk-card__titleline">
                <h2 className="vk-card__title">Tasks / Queue</h2>
                <span className="vk-card__count">{totalTaskCount}</span>
              </div>
              <p className="vk-card__sub">우선 처리 대기열</p>
            </div>
            <button type="button" className="vk-linkbtn vk-linkbtn--chevron" onClick={() => navigateDashboard('/passports')}>
              <span>전체 보기</span>
              <ChevronRightIcon />
            </button>
          </div>
          <div className="vk-tasks">
            {totalTaskCount === 0 ? (
              <div className="vk-task vk-task--blue" style={{ gridColumn: '1 / -1', alignContent: 'center', textAlign: 'center' }}>
                <p className="vk-task__label">대기 중인 작업이 없습니다</p>
              </div>
            ) : taskRows.map((t) => (
              <button
                key={t.label}
                type="button"
                className={`vk-task vk-task--${t.tone}`}
                aria-label={`${t.label} ${t.value}${t.unit} 보기`}
                onClick={() => navigateDashboard(t.route)}
              >
                <div className="vk-task__top">
                  <div className="vk-task__icon" aria-hidden="true"><TaskGlyph name={t.icon} /></div>
                  <p className="vk-task__label">{t.label}</p>
                </div>
                <p className="vk-task__count">
                  <span className="vk-task__num">{t.value}</span>
                  <span className="vk-task__unit">{t.unit}</span>
                </p>
              </button>
            ))}
          </div>
        </article>

        <article className="vk-card">
          <div className="vk-card__head">
            <div>
              <h2 className="vk-card__title">Blockchain Ledger</h2>
              <p className="vk-card__sub">최근 커밋 트랜잭션</p>
            </div>
            <button
              type="button"
              className="vk-linkbtn vk-linkbtn--chevron"
              disabled={!canReadAudit}
              title={canReadAudit ? '감사 로그로 이동' : AUDIT_REQUIRED_LABEL}
              aria-label={canReadAudit ? 'Blockchain Ledger 전체 보기' : AUDIT_REQUIRED_LABEL}
              onClick={canReadAudit ? () => navigateDashboard('/audit-log') : undefined}
            >
              <span>{canReadAudit ? '전체 보기' : AUDIT_REQUIRED_LABEL}</span>
              <ChevronRightIcon />
            </button>
          </div>
          <table className="vk-ledger">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Block / Target</th>
                <th>Organization</th>
                <th>Event Type</th>
                <th>Timestamp</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerFallback ? (
                <tr>
                  <td colSpan={6} className="vk-ledger__time" style={{ padding: '18px 6px', textAlign: 'center' }}>{ledgerFallback}</td>
                </tr>
              ) : ledgerRows.map((r) => (
                <tr key={r.key}>
                  <td className="vk-ledger__hash">{r.tx}</td>
                  <td className="vk-ledger__time">{r.block}</td>
                  <td className="vk-ledger__org">{r.organization}</td>
                  <td className="vk-ledger__type">{r.eventType}</td>
                  <td className="vk-ledger__time">{r.timestamp}</td>
                  <td><span className="vk-ledger__status">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>

      <p className="vk-dash__foot">{dashboardDataSummary}</p>
    </div>
  );
}

function KpiTrendSparkline({ label, trend }: { label: string; trend: KpiTrendViewModel }) {
  const width = 120;
  const height = 28;
  const paddingX = 3;
  const paddingY = 4;
  const minValue = Math.min(...trend.points.map((point) => point.value));
  const maxValue = Math.max(...trend.points.map((point) => point.value));
  const minTimestamp = Math.min(...trend.points.map((point) => point.timestamp));
  const maxTimestamp = Math.max(...trend.points.map((point) => point.timestamp));
  const valueRange = maxValue - minValue;
  const timeRange = maxTimestamp - minTimestamp;
  const centerY = height / 2;
  const coordinates = trend.points.map((point, index) => {
    const x = timeRange > 0
      ? paddingX + ((point.timestamp - minTimestamp) / timeRange) * (width - paddingX * 2)
      : paddingX + (index / Math.max(trend.points.length - 1, 1)) * (width - paddingX * 2);
    const y = valueRange > 0
      ? height - paddingY - ((point.value - minValue) / valueRange) * (height - paddingY * 2)
      : centerY;

    return { x, y };
  });
  const pathD = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const lastPoint = trend.points[trend.points.length - 1];
  const ariaLabel = trend.mode === 'daily-count'
    ? `${label} 실제 추이: ${trend.caption}`
    : `${label} 현재 비율 시각화: ${trend.valueLabel}`;

  return (
    <div
      className="vk-kpi__trend"
      aria-label={ariaLabel}
      data-kpi-trend-sparkline="true"
      data-kpi-trend-kind={trend.kind}
      data-kpi-trend-mode={trend.mode}
      data-kpi-trend-source={trend.source}
      data-kpi-trend-points={String(trend.points.length)}
      data-kpi-trend-values={trend.points.map((point) => point.value).join(',')}
      data-kpi-trend-caption={trend.caption}
    >
      <svg className="vk-kpi__trend-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="vk-kpi__trend-baseline" d={`M ${paddingX} ${height - paddingY} L ${width - paddingX} ${height - paddingY}`} />
        <path className="vk-kpi__trend-line" d={pathD} />
        {coordinates.length > 0 && (
          <circle
            className="vk-kpi__trend-dot"
            cx={coordinates[coordinates.length - 1].x}
            cy={coordinates[coordinates.length - 1].y}
            r="2.4"
          />
        )}
      </svg>
      <div className="vk-kpi__trend-meta">
        <span className="vk-kpi__trend-caption">{trend.caption}</span>
        <span className="vk-kpi__trend-value">{lastPoint ? trend.valueLabel : '—'}</span>
      </div>
    </div>
  );
}

function KpiIcon({ name }: { name: 'battery' | 'check' | 'alert' | 'chain' }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (name === 'battery') {
    return <svg viewBox="0 0 24 24" width="24" height="24"><rect {...stroke} x="3" y="8" width="16" height="8" rx="2"/><path {...stroke} d="M19 10.5h2v3h-2"/><path {...stroke} d="M7 12h5"/></svg>;
  }

  if (name === 'check') {
    return <svg viewBox="0 0 24 24" width="24" height="24"><circle {...stroke} cx="12" cy="12" r="9"/><path {...stroke} d="M8.5 12.5l2.3 2.3 4.9-5.4"/></svg>;
  }

  if (name === 'alert') {
    return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M12 4l9 16H3z"/><path {...stroke} d="M12 9v5"/><path {...stroke} d="M12 17h.01"/></svg>;
  }

  return <svg viewBox="0 0 24 24" width="24" height="24"><rect {...stroke} x="4" y="4" width="6" height="6" rx="1.5"/><rect {...stroke} x="14" y="4" width="6" height="6" rx="1.5"/><rect {...stroke} x="9" y="14" width="6" height="6" rx="1.5"/><path {...stroke} d="M10 7h4M12 10v4"/></svg>;
}

function ChevronDownIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function ExpandIcon() {
  return <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M6.5 3.5h-3v3M11.5 3.5h3v3M14.5 11.5v3h-3M3.5 11.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function AlertGlyph({ severity }: { severity: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (severity === 'Low') {
    return <svg viewBox="0 0 24 24" width="18" height="18"><circle {...stroke} cx="12" cy="12" r="9"/><path {...stroke} d="M12 11v5"/><path {...stroke} d="M12 8h.01"/></svg>;
  }

  return <svg viewBox="0 0 24 24" width="18" height="18"><path {...stroke} d="M12 4l9 16H3z"/><path {...stroke} d="M12 9v5"/><path {...stroke} d="M12 17h.01"/></svg>;
}

function ConnectorArrow() {
  return <svg viewBox="0 0 54 18" width="54" height="18" aria-hidden="true"><path d="M3 9h41" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 6" /><path d="M42 4.5L50 9l-8 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function FleetGauge({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' | 'amber' | 'purple' }) {
  return (
    <div className={`vk-gauge vk-gauge--${tone}`}>
      <p className="vk-gauge__label">{label}</p>
      <p className="vk-gauge__value">{value}</p>
    </div>
  );
}

function NodeGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'cmu') return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="4" y="7" width="16" height="10" rx="2"/><path {...stroke} d="M8 11h8M8 14h5"/></svg>;
  if (name === 'bmu') return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="3" y="8" width="16" height="8" rx="2"/><path {...stroke} d="M19 10v4h2v-4z"/></svg>;
  if (name === 'agent') return <svg viewBox="0 0 24 24" width="20" height="20"><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>;
  if (name === 'blockchain') return <svg viewBox="0 0 24 24" width="20" height="20"><path {...stroke} d="M12 3l9 4.5-9 4.5-9-4.5z"/><path {...stroke} d="M3 12l9 4.5 9-4.5"/><path {...stroke} d="M3 16.5l9 4.5 9-4.5"/></svg>;
  return <svg viewBox="0 0 24 24" width="20" height="20"><rect {...stroke} x="5" y="3" width="14" height="18" rx="2"/><circle {...stroke} cx="12" cy="10" r="2.5"/><path {...stroke} d="M8 17h8"/></svg>;
}

function SecurityGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'shield') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M12 3l8 3v6c0 4.4-3.4 8.4-8 9-4.6-.6-8-4.6-8-9V6z"/><path {...stroke} d="M9 12l2.2 2.2L15 10"/></svg>;
  if (name === 'key') return <svg viewBox="0 0 24 24" width="22" height="22"><circle {...stroke} cx="8" cy="15" r="4"/><path {...stroke} d="M11 12l9-9 3 3-3 3 2 2-2 2-2-2-3 3"/></svg>;
  return <svg viewBox="0 0 24 24" width="22" height="22"><rect {...stroke} x="5" y="11" width="14" height="10" rx="2"/><path {...stroke} d="M8 11V7a4 4 0 118 0v4"/></svg>;
}

function TaskGlyph({ name }: { name: string }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'folder') return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M3.5 7.5h6l2 2h9v8.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/><path {...stroke} d="M3.5 7.5v-1a2 2 0 012-2h3.5l2 3"/></svg>;
  if (name === 'user') return <svg viewBox="0 0 24 24" width="24" height="24"><circle {...stroke} cx="12" cy="8" r="4"/><path {...stroke} d="M5 20c1.1-4 4-6 7-6s5.9 2 7 6"/></svg>;
  if (name === 'wrench') return <svg viewBox="0 0 24 24" width="22" height="22"><path {...stroke} d="M14 3a5 5 0 015 5l-.5 1.5L20 11l-2 2-1.5-1.5L15 12a5 5 0 01-5-5L3 14l4 4 7-7z"/></svg>;
  return <svg viewBox="0 0 24 24" width="24" height="24"><path {...stroke} d="M12 16V5"/><path {...stroke} d="M7.5 9.5L12 5l4.5 4.5"/><path {...stroke} d="M5 16v2.5a2 2 0 002 2h10a2 2 0 002-2V16"/></svg>;
}
