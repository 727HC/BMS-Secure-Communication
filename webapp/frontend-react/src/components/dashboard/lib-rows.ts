import {
  isAuditAvailable,
  isFailedAuditRecord,
  isPassportVerified,
  normalizedStatus,
  type DashboardAuditRecord,
  type DashboardPassport,
  type DashboardRoute,
  type DashboardSourceState,
  type DashboardStatus,
} from './lib';

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
