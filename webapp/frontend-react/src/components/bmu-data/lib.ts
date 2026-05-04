/**
 * BmuDataPage 도메인 타입/헬퍼.
 */

export interface BmuRecord {
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

export interface StatusBadge {
  label: string;
  color: 'blue' | 'green' | 'red';
}

export function decodeStatusFlags(flags?: number): StatusBadge[] {
  const num = typeof flags === 'number' ? flags : parseInt(String(flags), 10);
  if (isNaN(num)) return [];
  const badges: StatusBadge[] = [];
  if (num & 0x01) badges.push({ label: '충전중', color: 'blue' });
  if (num & 0x02) badges.push({ label: '밸런싱', color: 'green' });
  if (num & 0x04) badges.push({ label: '결함', color: 'red' });
  return badges;
}

export const BADGE_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  blue:  { bg: 'var(--color-surface-accent)', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
  green: { bg: 'var(--color-success-soft)', color: 'var(--color-success)', dot: 'var(--color-success)' },
  red:   { bg: 'var(--color-danger-soft)', color: 'var(--color-danger)', dot: 'var(--color-danger)' },
};

export function formatTimestamp(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

export function formatNumber(val: unknown, decimals = 1): string {
  if (val == null) return '-';
  return Number(val).toFixed(decimals);
}
