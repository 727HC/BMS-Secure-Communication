import { describe, expect, it } from 'vitest';
import { formatTime, getStatusStyle, isWithinHours, relativeTime } from './lib';

describe('formatTime', () => {
  it('returns dash for missing input', () => {
    expect(formatTime(undefined)).toBe('-');
    expect(formatTime('')).toBe('-');
  });

  it('formats valid ISO into ko-KR locale string', () => {
    const result = formatTime('2026-05-06T00:00:00.000Z');
    // ko-KR formatting includes 2026 year and time separators
    expect(result).toMatch(/2026/);
  });
});

describe('relativeTime', () => {
  it('returns empty string for missing input', () => {
    expect(relativeTime(undefined)).toBe('');
  });

  it('returns 방금 for negative diff (future timestamp)', () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    expect(relativeTime(future)).toBe('방금');
  });

  it('formats seconds/minutes/hours/days', () => {
    expect(relativeTime(new Date(Date.now() - 10_000).toISOString())).toBe('10초 전');
    expect(relativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5분 전');
    expect(relativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3시간 전');
    expect(relativeTime(new Date(Date.now() - 4 * 86_400_000).toISOString())).toBe('4일 전');
  });

  it('returns empty string for 30+ days', () => {
    expect(relativeTime(new Date(Date.now() - 60 * 86_400_000).toISOString())).toBe('');
  });
});

describe('getStatusStyle', () => {
  it("returns '상태 없음' for missing code", () => {
    expect(getStatusStyle(undefined).label).toBe('상태 없음');
    expect(getStatusStyle(0).label).toBe('상태 없음');
  });

  it('partitions by code range', () => {
    expect(getStatusStyle(200).label).toBe('성공');
    expect(getStatusStyle(204).label).toBe('성공');
    expect(getStatusStyle(301).label).toBe('전환');
    expect(getStatusStyle(404).label).toBe('클라이언트 오류');
    expect(getStatusStyle(500).label).toBe('서버 오류');
    expect(getStatusStyle(503).label).toBe('서버 오류');
  });
});

describe('isWithinHours', () => {
  it('returns false for missing input', () => {
    expect(isWithinHours(undefined, 24)).toBe(false);
  });

  it('returns true for recent timestamps', () => {
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    expect(isWithinHours(oneHourAgo, 24)).toBe(true);
  });

  it('returns false for older than the window', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(isWithinHours(twoDaysAgo, 24)).toBe(false);
  });
});
