import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuditLogAnalytics } from './useAuditLogAnalytics';
import type { LogRecord } from './lib';

describe('useAuditLogAnalytics — activeActionLabel', () => {
  it("returns '전체' for empty filter", () => {
    const { result } = renderHook(() => useAuditLogAnalytics([], ''));
    expect(result.current.activeActionLabel).toBe('전체');
  });

  it('returns matching ACTION_OPTIONS label when found', () => {
    const { result } = renderHook(() => useAuditLogAnalytics([], 'CREATE_PASSPORT'));
    expect(result.current.activeActionLabel).toBe('여권 생성');
  });

  it("falls back to '전체' for unknown action", () => {
    const { result } = renderHook(() => useAuditLogAnalytics([], 'UNKNOWN_ACTION'));
    expect(result.current.activeActionLabel).toBe('전체');
  });
});

describe('useAuditLogAnalytics — distributions', () => {
  it('returns empty distributions for empty logs', () => {
    const { result } = renderHook(() => useAuditLogAnalytics([], ''));
    expect(result.current.actionDistribution).toEqual([]);
    expect(result.current.methodDistribution).toEqual([]);
    expect(result.current.statusDistribution).toEqual([]);
    expect(result.current.statusSummary).toBeNull();
  });

  it('actionDistribution sorts top 5 by descending count', () => {
    const logs = [
      ...Array(5).fill(null).map((_, i) => ({ id: `a${i}`, action: 'A' })),
      ...Array(3).fill(null).map((_, i) => ({ id: `b${i}`, action: 'B' })),
      ...Array(1).fill(null).map((_, i) => ({ id: `c${i}`, action: 'C' })),
      ...Array(7).fill(null).map((_, i) => ({ id: `d${i}`, action: 'D' })),
    ] as LogRecord[];
    const { result } = renderHook(() => useAuditLogAnalytics(logs, ''));
    expect(result.current.actionDistribution[0]).toEqual({ action: 'D', count: 7 });
    expect(result.current.actionDistribution[1]).toEqual({ action: 'A', count: 5 });
    expect(result.current.actionDistribution.length).toBeLessThanOrEqual(5);
  });

  it('methodDistribution uppercases methods, defaults to OTHER', () => {
    const logs: LogRecord[] = [
      { id: '1', method: 'get' },
      { id: '2', method: 'POST' },
      { id: '3' }, // → OTHER
    ];
    const { result } = renderHook(() => useAuditLogAnalytics(logs, ''));
    const map = Object.fromEntries(result.current.methodDistribution.map((m) => [m.label, m.value]));
    expect(map.GET).toBe(1);
    expect(map.POST).toBe(1);
    expect(map.OTHER).toBe(1);
  });

  it('statusDistribution buckets statusCode into 2xx/3xx/4xx/5xx and filters empty', () => {
    const logs: LogRecord[] = [
      { id: '1', statusCode: 200 },
      { id: '2', statusCode: 201 },
      { id: '3', statusCode: 404 },
      { id: '4', statusCode: 503 },
      { id: '5' }, // skipped
    ];
    const { result } = renderHook(() => useAuditLogAnalytics(logs, ''));
    const map = Object.fromEntries(result.current.statusDistribution.map((b) => [b.key, b.value]));
    expect(map['2xx']).toBe(2);
    expect(map['3xx']).toBeUndefined();
    expect(map['4xx']).toBe(1);
    expect(map['5xx']).toBe(1);
  });

  it('statusSummary computes success/fail/successPct from coded logs', () => {
    const logs: LogRecord[] = [
      { id: '1', statusCode: 200 },
      { id: '2', statusCode: 200 },
      { id: '3', statusCode: 500 },
      { id: '4' }, // ignored
    ];
    const { result } = renderHook(() => useAuditLogAnalytics(logs, ''));
    expect(result.current.statusSummary).toEqual({ success: 2, fail: 1, successPct: 67, total: 3 });
  });
});

describe('useAuditLogAnalytics — timeSummary', () => {
  it('counts logs within 24h and 7d windows', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const logs: LogRecord[] = [
      { id: '1', timestamp: tenMinutesAgo },
      { id: '2', timestamp: threeDaysAgo },
      { id: '3', timestamp: tenDaysAgo },
    ];
    const { result } = renderHook(() => useAuditLogAnalytics(logs, ''));
    expect(result.current.timeSummary.last24h).toBe(1);
    expect(result.current.timeSummary.last7d).toBe(2);
  });
});
