import { describe, expect, it } from 'vitest';
import { decodeStatusFlags, formatNumber, formatTimestamp } from './lib';

describe('decodeStatusFlags', () => {
  it('returns empty for undefined or NaN', () => {
    expect(decodeStatusFlags(undefined)).toEqual([]);
    expect(decodeStatusFlags(NaN)).toEqual([]);
  });

  it('decodes single bits', () => {
    expect(decodeStatusFlags(0x01).map((b) => b.label)).toEqual(['충전중']);
    expect(decodeStatusFlags(0x02).map((b) => b.label)).toEqual(['밸런싱']);
    expect(decodeStatusFlags(0x04).map((b) => b.label)).toEqual(['결함']);
  });

  it('decodes multiple bits in order', () => {
    expect(decodeStatusFlags(0x07).map((b) => b.label)).toEqual(['충전중', '밸런싱', '결함']);
  });

  it('ignores unrecognized higher bits', () => {
    // 0x08 alone has no badge
    expect(decodeStatusFlags(0x08)).toEqual([]);
    // 0x09 = 0x08 | 0x01 → only 충전중
    expect(decodeStatusFlags(0x09).map((b) => b.label)).toEqual(['충전중']);
  });

  it('parses string-encoded numbers', () => {
    // @ts-expect-error: production callers occasionally pass strings via JSON
    expect(decodeStatusFlags('5').map((b) => b.label)).toEqual(['충전중', '결함']);
  });
});

describe('formatTimestamp', () => {
  it('returns dash for missing input', () => {
    expect(formatTimestamp(undefined)).toBe('-');
    expect(formatTimestamp('')).toBe('-');
  });

  it('returns localized string for valid ISO', () => {
    expect(formatTimestamp('2026-05-06T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('formatNumber', () => {
  it('returns dash for null/undefined', () => {
    expect(formatNumber(null)).toBe('-');
    expect(formatNumber(undefined)).toBe('-');
  });

  it('formats with default 1 decimal', () => {
    expect(formatNumber(3.146)).toBe('3.1');
    expect(formatNumber(3)).toBe('3.0');
  });

  it('honors custom decimals argument', () => {
    expect(formatNumber(3.14159, 3)).toBe('3.142');
    expect(formatNumber(3.14, 0)).toBe('3');
  });

  it('coerces numeric strings', () => {
    expect(formatNumber('2.5')).toBe('2.5');
  });
});
