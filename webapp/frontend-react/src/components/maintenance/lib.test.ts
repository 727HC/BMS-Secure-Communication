import { describe, expect, it } from 'vitest';
import { formatTimestamp, latestMaintenanceTimestamp } from './lib';

describe('formatTimestamp', () => {
  it('returns dash for missing input', () => {
    expect(formatTimestamp(undefined)).toBe('-');
    expect(formatTimestamp('')).toBe('-');
  });

  it('formats valid ISO into ko-KR', () => {
    expect(formatTimestamp('2026-05-06T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('latestMaintenanceTimestamp', () => {
  it('returns dash for empty/undefined logs', () => {
    expect(latestMaintenanceTimestamp(undefined)).toBe('-');
    expect(latestMaintenanceTimestamp([])).toBe('-');
  });

  it('returns the latest timestamp formatted', () => {
    const result = latestMaintenanceTimestamp([
      { timestamp: '2025-01-01T00:00:00.000Z' },
      { timestamp: '2026-05-06T00:00:00.000Z' },
      { timestamp: '2025-06-01T00:00:00.000Z' },
    ]);
    expect(result).toMatch(/2026/);
  });

  it('treats undefined timestamps as 0 (lowest)', () => {
    const result = latestMaintenanceTimestamp([
      { description: 'no-ts' },
      { timestamp: '2026-05-06T00:00:00.000Z' },
    ]);
    expect(result).toMatch(/2026/);
  });
});
