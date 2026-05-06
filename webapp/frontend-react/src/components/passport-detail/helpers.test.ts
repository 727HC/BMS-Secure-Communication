import { describe, expect, it } from 'vitest';
import {
  GBA_21_FIELDS,
  complianceGrade,
  computeGbaCompliance,
  fieldFilled,
  formatDate,
  parseTempRange,
  parseVoltageRange,
} from './helpers';
import type { Passport } from './types';

describe('fieldFilled', () => {
  it('returns false for null passport', () => {
    expect(fieldFilled(null, 'passportId')).toBe(false);
  });

  it('rejects null/undefined/empty string', () => {
    expect(fieldFilled({} as Passport, 'passportId')).toBe(false);
    expect(fieldFilled({ passportId: '' } as Passport, 'passportId')).toBe(false);
  });

  it('rejects empty objects/arrays', () => {
    expect(fieldFilled({ physicalHistoryVerification: {} } as any, 'physicalHistoryVerification')).toBe(false);
    expect(fieldFilled({ tags: [] } as any, 'tags')).toBe(false);
  });

  it('accepts 0 (treated as filled per current spec) and non-empty strings', () => {
    expect(fieldFilled({ cellCount: 0 } as any, 'cellCount')).toBe(true);
    expect(fieldFilled({ passportId: 'P1' } as any, 'passportId')).toBe(true);
  });
});

describe('computeGbaCompliance', () => {
  it('returns zero state for null passport', () => {
    const result = computeGbaCompliance(null);
    expect(result).toEqual({ filled: 0, total: 21, pct: 0, allFilled: false, groups: [] });
  });

  it('counts filled fields and groups them', () => {
    const passport = {
      passportId: 'P1', model: 'X', serialNumber: 'SN', status: 'ACTIVE',
      evManufacturer: 'Tesla', evAssemblyCountry: 'US',
      manufacturerName: 'LG', manufactureCountry: 'KR',
    } as any;
    const result = computeGbaCompliance(passport);
    expect(result.filled).toBe(8);
    expect(result.total).toBe(21);
    expect(result.pct).toBe(Math.round((8 / 21) * 100));
    expect(result.allFilled).toBe(false);
    expect(result.groups.map((g) => g.name)).toEqual(['기본정보', '제조정보', '기술사양', 'EV정보']);
  });

  it('marks allFilled=true when all 21 fields present', () => {
    const passport: Record<string, string | number> = {};
    GBA_21_FIELDS.forEach((f) => { passport[f.key] = 'x'; });
    const result = computeGbaCompliance(passport as any);
    expect(result.filled).toBe(21);
    expect(result.allFilled).toBe(true);
    expect(result.pct).toBe(100);
  });
});

describe('complianceGrade', () => {
  it('uses 90/75/50 thresholds', () => {
    expect(complianceGrade(100)).toBe('A');
    expect(complianceGrade(90)).toBe('A');
    expect(complianceGrade(89)).toBe('B');
    expect(complianceGrade(75)).toBe('B');
    expect(complianceGrade(74)).toBe('C');
    expect(complianceGrade(50)).toBe('C');
    expect(complianceGrade(49)).toBe('D');
    expect(complianceGrade(0)).toBe('D');
  });
});

describe('formatDate', () => {
  it('returns dash for missing input', () => {
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate('')).toBe('-');
  });

  it('formats valid ISO timestamp', () => {
    expect(formatDate('2026-05-06T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('parseVoltageRange', () => {
  it('returns default for missing input', () => {
    expect(parseVoltageRange(undefined)).toEqual({ min: '--', nom: '--', max: '--' });
  });

  it('parses 3-part dash/tilde/comma separated', () => {
    expect(parseVoltageRange('3.0-3.7-4.2V')).toEqual({ min: '3.0', nom: '3.7', max: '4.2' });
    expect(parseVoltageRange('3.0~3.7~4.2')).toEqual({ min: '3.0', nom: '3.7', max: '4.2' });
    expect(parseVoltageRange('3.0,3.7,4.2')).toEqual({ min: '3.0', nom: '3.7', max: '4.2' });
  });

  it('parses 2-part as min-max with nom blank', () => {
    expect(parseVoltageRange('3.0-4.2')).toEqual({ min: '3.0', nom: '--', max: '4.2' });
  });

  it('falls back to single value as nom', () => {
    expect(parseVoltageRange('3.7')).toEqual({ min: '--', nom: '3.7', max: '--' });
  });
});

describe('parseTempRange', () => {
  it('returns default for missing input', () => {
    expect(parseTempRange(undefined)).toEqual({ min: '--', max: '--' });
  });

  it('parses range with negative min', () => {
    expect(parseTempRange('-20 ~ 60°C')).toEqual({ min: '-20', max: '60' });
  });

  it('falls back to whole trimmed string for max when no range pattern', () => {
    // Note: fallback uses str.trim() (not the °C-stripped version)
    expect(parseTempRange('60°C')).toEqual({ min: '--', max: '60°C' });
  });
});
