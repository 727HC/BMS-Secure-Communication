import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMaintenanceAnalytics } from './useMaintenanceAnalytics';
import type { Passport } from './lib';

describe('useMaintenanceAnalytics — extStats', () => {
  it('returns 0 totals and null avgIntervalDays for empty input', () => {
    const { result } = renderHook(() => useMaintenanceAnalytics([]));
    expect(result.current.extStats.totalMaintenance).toBe(0);
    expect(result.current.extStats.totalAccident).toBe(0);
    expect(result.current.extStats.urgentCount).toBe(0);
    expect(result.current.extStats.avgIntervalDays).toBeNull();
    expect(result.current.extStats.pendingPassports).toBe(0);
  });

  it('aggregates totalMaintenance/totalAccident across passports', () => {
    const passports: Passport[] = [
      { maintenanceLogs: [{ timestamp: '2026-05-01T00:00:00.000Z' }, { timestamp: '2026-05-02T00:00:00.000Z' }] },
      { accidentLogs: [{ timestamp: '2026-05-01T00:00:00.000Z' }] },
    ];
    const { result } = renderHook(() => useMaintenanceAnalytics(passports));
    expect(result.current.extStats.totalMaintenance).toBe(2);
    expect(result.current.extStats.totalAccident).toBe(1);
  });

  it('counts MAINTENANCE passports whose latest log is 7+ days old as urgent', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const passports: Passport[] = [
      { status: 'MAINTENANCE', maintenanceLogs: [{ timestamp: eightDaysAgo }] }, // urgent
      { status: 'MAINTENANCE', maintenanceLogs: [{ timestamp: oneDayAgo }] },    // recent
      { status: 'MAINTENANCE' },                                                  // no logs → not urgent
      { status: 'ACTIVE', maintenanceLogs: [{ timestamp: eightDaysAgo }] },      // not maintenance status
    ];
    const { result } = renderHook(() => useMaintenanceAnalytics(passports));
    expect(result.current.extStats.urgentCount).toBe(1);
  });

  it('computes pendingPassports for ACTIVE+VIN+no maintenance logs', () => {
    const passports: Passport[] = [
      { status: 'ACTIVE', vin: 'V1' },                              // pending
      { status: 'ACTIVE', vin: 'V2', maintenanceLogs: [{}] },       // has log
      { status: 'ACTIVE' },                                          // no VIN
      { status: 'MAINTENANCE', vin: 'V3' },                          // not active
    ];
    const { result } = renderHook(() => useMaintenanceAnalytics(passports));
    expect(result.current.extStats.pendingPassports).toBe(1);
  });

  it('computes avgIntervalDays from createdAt → latest log', () => {
    const created = '2026-01-01T00:00:00.000Z';
    const sixtyDaysLater = new Date(Date.parse(created) + 60 * 86_400_000).toISOString();
    const passports: Passport[] = [
      { createdAt: created, maintenanceLogs: [{ timestamp: sixtyDaysLater }] },
    ];
    const { result } = renderHook(() => useMaintenanceAnalytics(passports));
    expect(result.current.extStats.avgIntervalDays).toBe(60);
  });
});

describe('useMaintenanceAnalytics — maintenanceTypeBreakdown', () => {
  it('returns 4 known types in fixed order with 0 counts when empty', () => {
    const { result } = renderHook(() => useMaintenanceAnalytics([]));
    expect(result.current.maintenanceTypeBreakdown.map((b) => b.label)).toEqual([
      '정기점검', '수리', '리콜', '긴급',
    ]);
    expect(result.current.maintenanceTypeBreakdown.every((b) => b.value === 0)).toBe(true);
  });

  it('counts logs per known type and ignores unknown types', () => {
    const passports: Passport[] = [
      { maintenanceLogs: [{ maintenanceType: 'routine' }, { maintenanceType: 'repair' }, { maintenanceType: 'unknown' }] },
      { maintenanceLogs: [{ maintenanceType: 'repair' }, { maintenanceType: 'emergency' }] },
    ];
    const { result } = renderHook(() => useMaintenanceAnalytics(passports));
    const map = Object.fromEntries(result.current.maintenanceTypeBreakdown.map((b) => [b.label, b.value]));
    expect(map['정기점검']).toBe(1);
    expect(map['수리']).toBe(2);
    expect(map['긴급']).toBe(1);
    expect(map['리콜']).toBe(0);
  });
});

describe('useMaintenanceAnalytics — donutSegments/donutTotal', () => {
  it('uses extStats fields and sums them in donutTotal', () => {
    const passports: Passport[] = [
      { maintenanceLogs: [{ timestamp: '2026-05-01T00:00:00.000Z' }] },
      { accidentLogs: [{ timestamp: '2026-05-01T00:00:00.000Z' }] },
      { status: 'ACTIVE', vin: 'V' }, // pending
    ];
    const { result } = renderHook(() => useMaintenanceAnalytics(passports));
    expect(result.current.donutTotal).toBe(3);
    const labels = result.current.donutSegments.map((s) => s.label);
    expect(labels).toEqual(['정비 기록', '사고 기록', '접수 후보']);
  });
});
