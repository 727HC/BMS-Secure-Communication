import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBmuAnalytics } from './useBmuAnalytics';
import type { BmuRecord } from './lib';

describe('useBmuAnalytics — sortedRecords', () => {
  it('returns empty for empty input', () => {
    const { result } = renderHook(() => useBmuAnalytics([]));
    expect(result.current.sortedRecords).toEqual([]);
    expect(result.current.latestRecord).toBeNull();
    expect(result.current.eventDistribution).toBeNull();
  });

  it('sorts records by timestamp descending', () => {
    const records: BmuRecord[] = [
      { recordId: 'old', timestamp: '2026-01-01T00:00:00.000Z' },
      { recordId: 'new', timestamp: '2026-05-06T00:00:00.000Z' },
      { recordId: 'mid', timestamp: '2026-03-01T00:00:00.000Z' },
    ];
    const { result } = renderHook(() => useBmuAnalytics(records));
    expect(result.current.sortedRecords.map((r) => r.recordId)).toEqual(['new', 'mid', 'old']);
    expect(result.current.latestRecord?.recordId).toBe('new');
  });
});

describe('useBmuAnalytics — recentSlice', () => {
  it('caps at 60 records and reverses to oldest→newest', () => {
    const records: BmuRecord[] = Array.from({ length: 70 }, (_, i) => ({
      recordId: `r${i}`,
      timestamp: new Date(2026, 0, i + 1).toISOString(),
      soc: 0.5 * 65535,
      voltage: 3.7,
      current: 1.0,
      temperature: 0.5 * 65535,
    }));
    const { result } = renderHook(() => useBmuAnalytics(records));
    expect(result.current.recentSlice.soc).toHaveLength(60);
    expect(result.current.recentSlice.voltage).toHaveLength(60);
    expect(result.current.recentSlice.current).toHaveLength(60);
    expect(result.current.recentSlice.temperature).toHaveLength(60);
  });

  it('handles missing fields by substituting 0 for voltage/current', () => {
    const records: BmuRecord[] = [{ timestamp: '2026-05-06T00:00:00.000Z', soc: 0 }];
    const { result } = renderHook(() => useBmuAnalytics(records));
    expect(result.current.recentSlice.voltage).toEqual([0]);
    expect(result.current.recentSlice.current).toEqual([0]);
  });
});

describe('useBmuAnalytics — eventDistribution', () => {
  it('classifies fault flags first', () => {
    const records: BmuRecord[] = [
      { statusFlags: 0x04, timestamp: '2026-05-01T00:00:00.000Z' },
    ];
    const { result } = renderHook(() => useBmuAnalytics(records));
    const map = Object.fromEntries(result.current.eventDistribution!.map((b) => [b.label, b.value]));
    expect(map['결함']).toBe(1);
    expect(map['정상']).toBe(0);
  });

  it('classifies temperature outliers as 온도 이상', () => {
    const records: BmuRecord[] = [
      { statusFlags: 0, temperature: 65535, timestamp: '2026-05-01T00:00:00.000Z' }, // scaleTemp ≈ 50 > 45
    ];
    const { result } = renderHook(() => useBmuAnalytics(records));
    const map = Object.fromEntries(result.current.eventDistribution!.map((b) => [b.label, b.value]));
    expect(map['온도 이상']).toBe(1);
  });

  it('classifies charging/balancing/normal in priority order (fault > temp > charging > balancing > normal)', () => {
    const records: BmuRecord[] = [
      { statusFlags: 0x01, timestamp: '2026-05-01T00:00:00.000Z' }, // charging
      { statusFlags: 0x02, timestamp: '2026-05-02T00:00:00.000Z' }, // balancing
      { statusFlags: 0, temperature: 65535 / 4, timestamp: '2026-05-03T00:00:00.000Z' }, // normal-ish temp
    ];
    const { result } = renderHook(() => useBmuAnalytics(records));
    const map = Object.fromEntries(result.current.eventDistribution!.map((b) => [b.label, b.value]));
    expect(map['충전']).toBe(1);
    expect(map['밸런싱']).toBe(1);
    expect(map['정상']).toBe(1);
  });
});
