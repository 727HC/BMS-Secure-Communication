import { useMemo } from 'react';
import { ACTION_OPTIONS, METHOD_COLORS, isWithinHours, type LogRecord } from './lib';

export function useAuditLogAnalytics(logs: LogRecord[], filterAction: string) {
  const activeActionLabel = useMemo(() => {
    const found = ACTION_OPTIONS.find((item) => item.value === filterAction);
    return found ? found.label : '전체';
  }, [filterAction]);

  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const key = log.action || 'OTHER';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
  }, [logs]);

  const methodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const log of logs) {
      const m = (log.method || 'OTHER').toUpperCase();
      counts[m] = (counts[m] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([method, value]) => ({ label: method, value, color: METHOD_COLORS[method] || 'var(--color-text-3)' }));
  }, [logs]);

  const statusDistribution = useMemo(() => {
    const buckets = [
      { key: '2xx', label: '2xx 성공', value: 0, color: 'var(--color-success)' },
      { key: '3xx', label: '3xx 전환', value: 0, color: 'var(--color-accent)' },
      { key: '4xx', label: '4xx 거절', value: 0, color: 'var(--color-warning)' },
      { key: '5xx', label: '5xx 오류', value: 0, color: 'var(--color-danger)' },
    ];
    for (const log of logs) {
      const code = log.statusCode;
      if (!code) continue;
      if (code < 300) buckets[0].value += 1;
      else if (code < 400) buckets[1].value += 1;
      else if (code < 500) buckets[2].value += 1;
      else buckets[3].value += 1;
    }
    return buckets.filter((bucket) => bucket.value > 0);
  }, [logs]);

  const timeSummary = useMemo(() => {
    const last24h = logs.filter((l) => isWithinHours(l.timestamp, 24)).length;
    const last7d = logs.filter((l) => isWithinHours(l.timestamp, 168)).length;
    return { last24h, last7d };
  }, [logs]);

  const statusSummary = useMemo(() => {
    const withCode = logs.filter((l) => l.statusCode);
    if (withCode.length === 0) return null;
    const success = withCode.filter((l) => (l.statusCode || 0) < 400).length;
    const fail = withCode.length - success;
    const successPct = Math.round((success / withCode.length) * 100);
    return { success, fail, successPct, total: withCode.length };
  }, [logs]);

  return {
    activeActionLabel,
    actionDistribution,
    methodDistribution,
    statusDistribution,
    timeSummary,
    statusSummary,
  };
}
