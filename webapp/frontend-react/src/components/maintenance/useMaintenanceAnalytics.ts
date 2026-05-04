import { useMemo } from 'react';
import type { Passport } from './lib';

export function useMaintenanceAnalytics(passports: Passport[]) {
  const extStats = useMemo(() => {
    const totalMaintenance = passports.reduce((sum, p) => sum + (p.maintenanceLogs?.length ?? 0), 0);
    const totalAccident = passports.reduce((sum, p) => sum + (p.accidentLogs?.length ?? 0), 0);

    const now = Date.now();
    const urgentCount = passports.filter((p) => {
      if (p.status !== 'MAINTENANCE') return false;
      const logs = p.maintenanceLogs ?? [];
      if (logs.length === 0) return false;
      const latest = logs.reduce((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA > tB ? a : b;
      });
      if (!latest.timestamp) return false;
      const diffDays = (now - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 7;
    }).length;

    const intervals: number[] = [];
    for (const p of passports) {
      if (!p.createdAt || !p.maintenanceLogs?.length) continue;
      const created = new Date(p.createdAt).getTime();
      if (isNaN(created)) continue;
      const latestLog = p.maintenanceLogs.reduce((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA > tB ? a : b;
      });
      if (!latestLog.timestamp) continue;
      const latestTime = new Date(latestLog.timestamp).getTime();
      if (isNaN(latestTime) || latestTime <= created) continue;
      const days = (latestTime - created) / (1000 * 60 * 60 * 24);
      if (days > 0) intervals.push(days);
    }
    const avgIntervalDays = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;

    const pendingPassports = passports.filter((p) => p.status === 'ACTIVE' && p.vin && !(p.maintenanceLogs?.length)).length;

    return { totalMaintenance, totalAccident, urgentCount, avgIntervalDays, pendingPassports };
  }, [passports]);

  const maintenanceTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = { routine: 0, repair: 0, recall: 0, emergency: 0 };
    for (const p of passports) {
      for (const log of p.maintenanceLogs ?? []) {
        const t = log.maintenanceType ?? 'routine';
        if (t in counts) counts[t]++;
      }
    }
    return [
      { label: '정기점검', value: counts.routine, color: 'var(--color-success)' },
      { label: '수리', value: counts.repair, color: 'var(--color-accent)' },
      { label: '리콜', value: counts.recall, color: 'var(--color-warning)' },
      { label: '긴급', value: counts.emergency, color: 'var(--color-danger)' },
    ];
  }, [passports]);

  const donutSegments = useMemo(() => [
    { label: '정비 기록', value: extStats.totalMaintenance, color: 'var(--color-success)' },
    { label: '사고 기록', value: extStats.totalAccident, color: 'var(--color-danger)' },
    { label: '접수 후보', value: extStats.pendingPassports, color: 'var(--color-warning)' },
  ], [extStats]);

  const donutTotal = extStats.totalMaintenance + extStats.totalAccident + extStats.pendingPassports;

  return { extStats, maintenanceTypeBreakdown, donutSegments, donutTotal };
}
