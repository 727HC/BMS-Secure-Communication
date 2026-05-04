import { useMemo } from 'react';
import {
  CHEMISTRY_COLORS,
  STATUS_COLORS,
  getGbaPct,
  type Passport,
} from './lib';

const STATUS_KEYS = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'];
const STATUS_LABELS: Record<string, string> = {
  MANUFACTURED: '제조완료', ACTIVE: '운행중', MAINTENANCE: '정비중',
  ANALYSIS: '분석중', RECYCLING: '회수 검토', DISPOSED: '폐기',
};

export function usePassportsAnalytics(passports: Passport[]) {
  const totalCount = passports.length;
  const activeCount = passports.filter((p) => p.status === 'ACTIVE').length;
  const maintenanceCount = passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS').length;
  const endOfLifeCount = passports.filter((p) => p.status === 'RECYCLING' || p.status === 'DISPOSED').length;
  const avgGba = passports.length ? Math.round(passports.reduce((acc, p) => acc + getGbaPct(p), 0) / passports.length) : 0;
  const vinPendingCount = passports.filter((p) => !p.vin).length;
  const reviewReadyCount = passports.filter((p) => getGbaPct(p) === 100 && !!p.vin).length;

  const statusDistSegments = useMemo(() => (
    STATUS_KEYS
      .map((key) => ({
        label: STATUS_LABELS[key],
        value: passports.filter((p) => p.status === key).length,
        color: STATUS_COLORS[key],
      }))
      .filter((s) => s.value > 0)
  ), [passports]);

  const statusLegendItems = useMemo(() => (
    STATUS_KEYS.map((key) => ({
      label: STATUS_LABELS[key],
      value: passports.filter((p) => p.status === key).length,
      color: STATUS_COLORS[key],
    }))
  ), [passports]);

  const manufacturerBarItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of passports) {
      const name = p.manufacturerName || '미등록';
      counts[name] = (counts[name] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  }, [passports]);

  const chemistryBarItems = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of passports) {
      const chem = p.chemistry || '기타';
      const key = ['NCM', 'LFP', 'NCA', 'LMO'].includes(chem) ? chem : '기타';
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: CHEMISTRY_COLORS[label] || '#94a3b8' }));
  }, [passports]);

  return {
    totalCount,
    activeCount,
    maintenanceCount,
    endOfLifeCount,
    avgGba,
    vinPendingCount,
    reviewReadyCount,
    statusDistSegments,
    statusLegendItems,
    manufacturerBarItems,
    chemistryBarItems,
  };
}
