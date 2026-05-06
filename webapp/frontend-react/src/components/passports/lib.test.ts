import { describe, expect, it } from 'vitest';
import { GBA_FIELDS, getGbaPct } from './lib';

describe('getGbaPct', () => {
  it('returns 0 for empty passport', () => {
    expect(getGbaPct({})).toBe(0);
  });

  it('counts non-empty string and number fields out of 21', () => {
    const passport = {
      passportId: 'P1',
      model: 'M1',
      serialNumber: 'SN',
      status: 'ACTIVE',
      cellCount: 10,
    };
    // 5 filled / 21 → 24%
    expect(getGbaPct(passport)).toBe(24);
  });

  it('treats empty string and 0 as unfilled', () => {
    expect(getGbaPct({ model: '', cellCount: 0 })).toBe(0);
  });

  it('saturates to 100 when all 21 declared fields are filled', () => {
    const passport: Record<string, string | number> = {};
    GBA_FIELDS.forEach((k) => { passport[k as string] = 'x'; });
    expect(GBA_FIELDS.length).toBe(21);
    expect(getGbaPct(passport)).toBe(100);
  });
});
