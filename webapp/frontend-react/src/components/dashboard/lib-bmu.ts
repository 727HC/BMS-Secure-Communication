import type { DashboardBmuRecord } from './lib';

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
