import { useMemo } from 'react';
import { avg, hasRecoveryRates, isRecyclingRelated, type Passport, type Tab } from './lib';

interface TabCounts {
  all: number;
  recyclable: number;
  recycling: number;
  disposed: number;
}

export function useRecyclingAnalytics(passports: Passport[], tabCounts: Record<Tab, number> | TabCounts) {
  const avgSoh = useMemo(() => {
    const vals = passports.filter(isRecyclingRelated).map((p) => p.soh).filter((v): v is number => v != null);
    return avg(vals);
  }, [passports]);

  const avgRemaining = useMemo(() => {
    const vals = passports.filter(isRecyclingRelated).map((p) => p.remainingLifeCycle).filter((v): v is number => v != null);
    return avg(vals);
  }, [passports]);

  const avgRates = useMemo(() => {
    const totals: Record<string, number[]> = {};
    for (const p of passports) {
      if (!p.recyclingRates) continue;
      for (const [k, v] of Object.entries(p.recyclingRates)) {
        if (!totals[k]) totals[k] = [];
        totals[k].push(v);
      }
    }
    return Object.entries(totals)
      .map(([k, vs]) => ({ element: k, avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }))
      .sort((a, b) => b.avg - a.avg);
  }, [passports]);

  const lifecycleMetrics = useMemo(() => {
    const lifecycleFiles = passports.filter(isRecyclingRelated);
    const analysisQueue = passports.filter((p) => p.status === 'ANALYSIS').length;
    const activeCandidates = passports.filter((p) => p.status === 'ACTIVE').length;
    const extractionEvidence = passports.filter(hasRecoveryRates).length;
    const readyRatio = lifecycleFiles.length > 0 ? Math.round((tabCounts.recyclable / lifecycleFiles.length) * 100) : 0;
    return { lifecycleFiles, analysisQueue, activeCandidates, extractionEvidence, readyRatio };
  }, [passports, tabCounts.recyclable]);

  const lifecycleBreakdown = [
    { label: '분석 요청 후보', value: lifecycleMetrics.activeCandidates, color: 'var(--color-warning)' },
    { label: '분석 결과 대기', value: lifecycleMetrics.analysisQueue, color: 'var(--color-accent)' },
    { label: '회수 가능 판정', value: tabCounts.recyclable, color: 'var(--color-success)' },
    { label: '재활용 진행', value: tabCounts.recycling, color: 'var(--color-accent)' },
    { label: '폐기 승인 완료', value: tabCounts.disposed, color: 'var(--color-text-3)' },
  ];

  return { avgSoh, avgRemaining, avgRates, lifecycleMetrics, lifecycleBreakdown };
}
