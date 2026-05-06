import { describe, expect, it } from 'vitest';
import {
  bmuTimestamp,
  clamp01,
  formatMetricNumber,
  formatPercent,
  latestBmuRecord,
  niceCeil,
} from './lib-bmu';

describe('bmuTimestamp', () => {
  it('returns 0 when timestamp is missing', () => {
    expect(bmuTimestamp({})).toBe(0);
  });

  it('returns 0 for invalid date strings', () => {
    expect(bmuTimestamp({ timestamp: 'not-a-date' })).toBe(0);
  });

  it('returns parsed milliseconds for ISO timestamps', () => {
    const iso = '2026-01-01T00:00:00.000Z';
    expect(bmuTimestamp({ timestamp: iso })).toBe(Date.parse(iso));
  });
});

describe('latestBmuRecord', () => {
  it('returns null for empty array', () => {
    expect(latestBmuRecord([])).toBeNull();
  });

  it('returns the record with the largest timestamp', () => {
    const records = [
      { timestamp: '2026-01-01T00:00:00.000Z', recordId: 'a' },
      { timestamp: '2026-03-01T00:00:00.000Z', recordId: 'c' },
      { timestamp: '2026-02-01T00:00:00.000Z', recordId: 'b' },
    ];
    expect(latestBmuRecord(records)?.recordId).toBe('c');
  });

  it('treats missing timestamps as 0', () => {
    const records = [
      { recordId: 'no-ts' },
      { timestamp: '2026-01-01T00:00:00.000Z', recordId: 'has-ts' },
    ];
    expect(latestBmuRecord(records)?.recordId).toBe('has-ts');
  });
});

describe('formatMetricNumber', () => {
  it('returns dash for non-finite values', () => {
    expect(formatMetricNumber(NaN)).toBe('—');
    expect(formatMetricNumber(Infinity)).toBe('—');
  });

  it('rounds to 1 decimal and strips trailing zero', () => {
    expect(formatMetricNumber(12.3456)).toBe('12.3');
    expect(formatMetricNumber(12)).toBe('12');
    expect(formatMetricNumber(12.0)).toBe('12');
  });
});

describe('formatPercent', () => {
  it('returns 0% when total is non-positive', () => {
    expect(formatPercent(5, 0)).toBe('0%');
    expect(formatPercent(5, -1)).toBe('0%');
  });

  it('formats fraction as percentage with metric formatter', () => {
    expect(formatPercent(1, 2)).toBe('50%');
    expect(formatPercent(1, 3)).toBe('33.3%');
  });
});

describe('clamp01', () => {
  it('returns 0 for non-finite values', () => {
    expect(clamp01(NaN)).toBe(0);
  });

  it('clamps below 0 and above 1', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.7)).toBe(0.7);
  });
});

describe('niceCeil', () => {
  it('returns 0 for non-positive or non-finite values', () => {
    expect(niceCeil(0)).toBe(0);
    expect(niceCeil(-3)).toBe(0);
    expect(niceCeil(NaN)).toBe(0);
  });

  it('rounds up to a 1/2/5 decade boundary', () => {
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(11)).toBe(20);
    expect(niceCeil(35)).toBe(50);
    expect(niceCeil(0.7)).toBe(1);
    expect(niceCeil(0.21)).toBeCloseTo(0.5);
  });
});
