/**
 * MaintenancePage 도메인 타입/헬퍼.
 */

export const PAGE_SIZE = 12;

export interface MaintenanceLog {
  timestamp?: string;
  maintenanceType?: string;
  description?: string;
  technician?: string;
}

export interface AccidentLog {
  timestamp?: string;
  severity?: string;
  description?: string;
  reporter?: string;
}

export interface Passport {
  passportId?: string;
  status?: string;
  vin?: string;
  model?: string;
  manufacturerName?: string;
  createdAt?: string;
  maintenanceLogs?: MaintenanceLog[];
  accidentLogs?: AccidentLog[];
  [key: string]: unknown;
}

export type Tab = 'all' | 'maintenance' | 'accident';

export const MAINTENANCE_TYPES = [
  { value: 'routine', label: '정기점검' },
  { value: 'repair', label: '수리' },
  { value: 'recall', label: '리콜' },
  { value: 'emergency', label: '긴급' },
];

export function formatTimestamp(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

export function latestMaintenanceTimestamp(logs?: MaintenanceLog[]): string {
  if (!logs || logs.length === 0) return '-';
  const sorted = [...logs].sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tB - tA;
  });
  return formatTimestamp(sorted[0].timestamp);
}
