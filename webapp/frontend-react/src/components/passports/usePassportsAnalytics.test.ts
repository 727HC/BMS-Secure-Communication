import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePassportsAnalytics } from './usePassportsAnalytics';
import type { Passport } from './lib';

function passport(overrides: Partial<Passport>): Passport {
  return overrides as Passport;
}

describe('usePassportsAnalytics', () => {
  it('returns 0 counts and avgGba=0 for empty list', () => {
    const { result } = renderHook(() => usePassportsAnalytics([]));
    expect(result.current.totalCount).toBe(0);
    expect(result.current.avgGba).toBe(0);
    expect(result.current.statusDistSegments).toEqual([]);
  });

  it('counts active/maintenance/end-of-life buckets', () => {
    const passports = [
      passport({ status: 'ACTIVE', vin: 'V1' }),
      passport({ status: 'MAINTENANCE' }),
      passport({ status: 'ANALYSIS' }),
      passport({ status: 'RECYCLING' }),
      passport({ status: 'DISPOSED' }),
    ];
    const { result } = renderHook(() => usePassportsAnalytics(passports));
    expect(result.current.activeCount).toBe(1);
    expect(result.current.maintenanceCount).toBe(2); // MAINTENANCE + ANALYSIS
    expect(result.current.endOfLifeCount).toBe(2);   // RECYCLING + DISPOSED
    expect(result.current.totalCount).toBe(5);
  });

  it('counts vinPending and reviewReady (gba=100 + vin)', () => {
    const passports = [
      passport({ vin: 'V', status: 'ACTIVE' }), // partial GBA
      passport({}),                              // no VIN, no GBA
    ];
    const { result } = renderHook(() => usePassportsAnalytics(passports));
    expect(result.current.vinPendingCount).toBe(1);
    expect(result.current.reviewReadyCount).toBe(0);
  });

  it('aggregates manufacturer breakdown top 5', () => {
    const passports = [
      passport({ manufacturerName: 'A' }),
      passport({ manufacturerName: 'A' }),
      passport({ manufacturerName: 'B' }),
      passport({ manufacturerName: 'C' }),
    ];
    const { result } = renderHook(() => usePassportsAnalytics(passports));
    expect(result.current.manufacturerBarItems[0]).toEqual({ label: 'A', value: 2 });
    expect(result.current.manufacturerBarItems.length).toBeLessThanOrEqual(5);
  });

  it('groups chemistry into known buckets and 기타', () => {
    const passports = [
      passport({ chemistry: 'NCM' }),
      passport({ chemistry: 'LFP' }),
      passport({ chemistry: 'Other' }), // unknown → 기타
      passport({}),                     // missing → 기타
    ];
    const { result } = renderHook(() => usePassportsAnalytics(passports));
    const labels = result.current.chemistryBarItems.map((c) => c.label);
    expect(labels).toContain('NCM');
    expect(labels).toContain('LFP');
    expect(labels).toContain('기타');
    const etc = result.current.chemistryBarItems.find((c) => c.label === '기타');
    expect(etc?.value).toBe(2);
  });

  it('statusDistSegments filters out empty buckets', () => {
    const passports = [passport({ status: 'ACTIVE' })];
    const { result } = renderHook(() => usePassportsAnalytics(passports));
    expect(result.current.statusDistSegments).toHaveLength(1);
    expect(result.current.statusDistSegments[0].label).toBe('운행중');
  });
});
