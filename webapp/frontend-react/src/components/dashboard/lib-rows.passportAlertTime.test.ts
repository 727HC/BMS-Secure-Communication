import { describe, expect, it } from 'vitest';
import { passportAlertTime } from './lib-rows';
import type { DashboardPassport } from './lib';

describe('passportAlertTime', () => {
  it('prefers updatedAt over createdAt', () => {
    const passport = {
      updatedAt: '2022-03-04T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
    } as DashboardPassport;
    // Both old enough that formatRelativeTime returns 'YYYY-MM-DD'
    expect(passportAlertTime(passport)).toBe('2022-03-04');
  });

  it('falls back to createdAt when updatedAt is missing', () => {
    const passport = { createdAt: '2024-06-15T00:00:00.000Z' } as DashboardPassport;
    expect(passportAlertTime(passport)).toBe('2024-06-15');
  });

  it('returns 현재 when both are missing', () => {
    expect(passportAlertTime({} as DashboardPassport)).toBe('현재');
  });
});
