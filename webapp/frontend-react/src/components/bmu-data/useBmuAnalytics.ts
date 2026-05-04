import { useMemo } from 'react';
import { scaleSOC, scaleTemp } from '../../lib/helpers';
import type { BmuRecord } from './lib';

export function useBmuAnalytics(records: BmuRecord[]) {
  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        const tA = new Date(a.timestamp || 0).getTime() || 0;
        const tB = new Date(b.timestamp || 0).getTime() || 0;
        return tB - tA;
      }),
    [records]
  );

  const recentSlice = useMemo(() => {
    const slice = sortedRecords.slice(0, 60).reverse();
    return {
      soc: slice.map((r) => scaleSOC(r.soc)),
      voltage: slice.map((r) => (r.voltage != null ? Number(r.voltage) : 0)),
      current: slice.map((r) => (r.current != null ? Number(r.current) : 0)),
      temperature: slice.map((r) => {
        const t = scaleTemp(r.temperature);
        return typeof t === 'number' ? t : parseFloat(String(t));
      }),
    };
  }, [sortedRecords]);

  const eventDistribution = useMemo(() => {
    if (sortedRecords.length === 0) return null;
    let normal = 0, charging = 0, balancing = 0, fault = 0, tempAbnormal = 0;
    for (const r of sortedRecords) {
      const num = typeof r.statusFlags === 'number' ? r.statusFlags : parseInt(String(r.statusFlags), 10);
      const temp = scaleTemp(r.temperature);
      const tempNum = typeof temp === 'number' ? temp : parseFloat(String(temp));
      const isTempAbnormal = !isNaN(tempNum) && (tempNum > 45 || tempNum < -10);
      if (!isNaN(num) && (num & 0x04)) { fault++; continue; }
      if (isTempAbnormal) { tempAbnormal++; continue; }
      if (!isNaN(num) && (num & 0x01)) { charging++; continue; }
      if (!isNaN(num) && (num & 0x02)) { balancing++; continue; }
      normal++;
    }
    return [
      { label: '정상', value: normal, color: 'var(--color-success)' },
      { label: '충전', value: charging, color: 'var(--color-accent)' },
      { label: '밸런싱', value: balancing, color: 'var(--color-success)' },
      { label: '결함', value: fault, color: 'var(--color-danger)' },
      { label: '온도 이상', value: tempAbnormal, color: 'var(--color-warning)' },
    ];
  }, [sortedRecords]);

  const latestRecord = sortedRecords[0] ?? null;

  return { sortedRecords, recentSlice, eventDistribution, latestRecord };
}
