import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecyclingAnalytics } from './useRecyclingAnalytics';
import type { Passport, Tab } from './lib';

const emptyTabCounts: Record<Tab, number> = { all: 0, recyclable: 0, recycling: 0, disposed: 0 };

describe('useRecyclingAnalytics — averages', () => {
  it('returns null averages for empty list', () => {
    const { result } = renderHook(() => useRecyclingAnalytics([], emptyTabCounts));
    expect(result.current.avgSoh).toBeNull();
    expect(result.current.avgRemaining).toBeNull();
    expect(result.current.avgRates).toEqual([]);
  });

  it('averages SOH/remainingLifeCycle across recycling-related passports', () => {
    const passports: Passport[] = [
      { status: 'ACTIVE', soh: 80, remainingLifeCycle: 1000 },
      { status: 'ANALYSIS', soh: 60, remainingLifeCycle: 500 },
      { status: 'MANUFACTURED', soh: 100, remainingLifeCycle: 2000 }, // not recycling-related → ignored
    ];
    const { result } = renderHook(() => useRecyclingAnalytics(passports, emptyTabCounts));
    expect(result.current.avgSoh).toBe(70);
    expect(result.current.avgRemaining).toBe(750);
  });

  it('averages recyclingRates per element across all passports, sorted by descending', () => {
    const passports: Passport[] = [
      { recyclingRates: { Li: 90, Co: 80 } },
      { recyclingRates: { Li: 80, Ni: 50 } },
    ];
    const { result } = renderHook(() => useRecyclingAnalytics(passports, emptyTabCounts));
    const map = Object.fromEntries(result.current.avgRates.map((r) => [r.element, r.avg]));
    expect(map.Li).toBe(85);
    expect(map.Co).toBe(80);
    expect(map.Ni).toBe(50);
    // sorted descending
    expect(result.current.avgRates[0].avg).toBeGreaterThanOrEqual(result.current.avgRates[1].avg);
  });
});

describe('useRecyclingAnalytics — lifecycleMetrics', () => {
  it('counts ANALYSIS as analysisQueue and ACTIVE as activeCandidates', () => {
    const passports: Passport[] = [
      { status: 'ACTIVE' },
      { status: 'ACTIVE' },
      { status: 'ANALYSIS' },
      { status: 'DISPOSED' },
    ];
    const { result } = renderHook(() => useRecyclingAnalytics(passports, emptyTabCounts));
    expect(result.current.lifecycleMetrics.activeCandidates).toBe(2);
    expect(result.current.lifecycleMetrics.analysisQueue).toBe(1);
    expect(result.current.lifecycleMetrics.lifecycleFiles.length).toBe(4);
  });

  it('counts extractionEvidence (passports with non-empty recyclingRates)', () => {
    const passports: Passport[] = [
      { recyclingRates: { Li: 80 } },
      { recyclingRates: {} },
      {},
    ];
    const { result } = renderHook(() => useRecyclingAnalytics(passports, emptyTabCounts));
    expect(result.current.lifecycleMetrics.extractionEvidence).toBe(1);
  });

  it('readyRatio = recyclable / lifecycleFiles when files exist', () => {
    const passports: Passport[] = [
      { status: 'ACTIVE', recycleAvailable: true },
      { status: 'ACTIVE' },
    ];
    const tabCounts: Record<Tab, number> = { all: 2, recyclable: 1, recycling: 0, disposed: 0 };
    const { result } = renderHook(() => useRecyclingAnalytics(passports, tabCounts));
    expect(result.current.lifecycleMetrics.readyRatio).toBe(50);
  });

  it('readyRatio is 0 when no lifecycle files', () => {
    const { result } = renderHook(() => useRecyclingAnalytics([], emptyTabCounts));
    expect(result.current.lifecycleMetrics.readyRatio).toBe(0);
  });
});

describe('useRecyclingAnalytics — lifecycleBreakdown', () => {
  it('emits 5 ordered breakdown rows mapping tabCounts and metrics', () => {
    const passports: Passport[] = [
      { status: 'ACTIVE' },
      { status: 'ANALYSIS' },
    ];
    const tabCounts: Record<Tab, number> = { all: 5, recyclable: 2, recycling: 1, disposed: 1 };
    const { result } = renderHook(() => useRecyclingAnalytics(passports, tabCounts));
    expect(result.current.lifecycleBreakdown.map((b) => b.label)).toEqual([
      '분석 요청 후보', '분석 결과 대기', '회수 가능 판정', '재활용 진행', '폐기 승인 완료',
    ]);
    const map = Object.fromEntries(result.current.lifecycleBreakdown.map((b) => [b.label, b.value]));
    expect(map['분석 요청 후보']).toBe(1);   // ACTIVE
    expect(map['분석 결과 대기']).toBe(1);   // ANALYSIS
    expect(map['회수 가능 판정']).toBe(2);   // tabCounts.recyclable
    expect(map['재활용 진행']).toBe(1);      // tabCounts.recycling
    expect(map['폐기 승인 완료']).toBe(1);   // tabCounts.disposed
  });
});
