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

export * from './lib-normalize';
import { normalizedStatus } from './lib-normalize';


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

export * from './lib-rows';


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
