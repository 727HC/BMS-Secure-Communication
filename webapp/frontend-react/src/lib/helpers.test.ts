import { describe, expect, it } from 'vitest';
import { fmtDate, getStatusBadge, scaleSOC, scaleTemp, STATUS_LIST } from './helpers';

describe('scaleSOC', () => {
  it('returns 0 for null/undefined', () => {
    expect(scaleSOC(null)).toBe(0);
    expect(scaleSOC(undefined)).toBe(0);
  });

  it('passes through percent values (≤100) unchanged', () => {
    expect(scaleSOC(50)).toBe(50);
    expect(scaleSOC(100)).toBe(100);
    expect(scaleSOC('75.5')).toBe(75.5);
  });

  it('scales raw uint16 (>100) using DBC factor', () => {
    expect(scaleSOC(65535)).toBe(100);
    expect(scaleSOC(32768)).toBeCloseTo(50, 0);
  });

  it('rounds to 1 decimal', () => {
    expect(Number.isFinite(scaleSOC(12345))).toBe(true);
    expect(scaleSOC(12345).toString().split('.')[1]?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe('scaleTemp', () => {
  it('returns 0 for null/undefined', () => {
    expect(scaleTemp(null)).toBe(0);
  });

  it('passes through °C values (≤100) unchanged', () => {
    expect(scaleTemp(25)).toBe(25);
    expect(scaleTemp(45)).toBe(45);
  });

  it('scales raw uint16 (>100) using DBC factor (max 50°C)', () => {
    expect(scaleTemp(65535)).toBe(50);
  });
});

describe('getStatusBadge', () => {
  it('returns full config for known statuses', () => {
    for (const status of STATUS_LIST) {
      expect(getStatusBadge(status).label).toBe(STATUS_CONFIG_LABELS[status]);
    }
  });

  it('falls back to DISPOSED config for unknown status', () => {
    expect(getStatusBadge('UNKNOWN').label).toBe('폐기');
  });
});

const STATUS_CONFIG_LABELS: Record<string, string> = {
  MANUFACTURED: '제조완료',
  ACTIVE: '운행중',
  MAINTENANCE: '정비중',
  ANALYSIS: '분석중',
  RECYCLING: '재활용',
  DISPOSED: '폐기',
};

describe('fmtDate', () => {
  it('returns dash for falsy', () => {
    expect(fmtDate(null)).toBe('-');
    expect(fmtDate(undefined)).toBe('-');
    expect(fmtDate('')).toBe('-');
  });

  it('formats valid date as ko-KR month/day', () => {
    expect(fmtDate('2026-05-06T00:00:00Z')).toMatch(/5월/);
  });
});
