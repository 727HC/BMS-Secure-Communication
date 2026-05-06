import { describe, expect, it } from 'vitest';
import {
  errorMessage,
  isPermissionError,
  isRecord,
  normalizeAuditRecord,
  normalizeBmuRecord,
  normalizeList,
  normalizePassport,
  normalizeStatus,
  normalizedStatus,
  optionalNullableString,
  optionalNumber,
  optionalString,
} from './lib-normalize';

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for arrays, null, primitives', () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord('s')).toBe(false);
    expect(isRecord(42)).toBe(false);
  });
});

describe('optionalString', () => {
  it('trims strings and returns undefined for empty', () => {
    expect(optionalString('  hi  ')).toBe('hi');
    expect(optionalString('   ')).toBeUndefined();
  });

  it('coerces numbers to string', () => {
    expect(optionalString(42)).toBe('42');
  });

  it('returns undefined for non-string non-number', () => {
    expect(optionalString(null)).toBeUndefined();
    expect(optionalString(undefined)).toBeUndefined();
    expect(optionalString({})).toBeUndefined();
  });
});

describe('optionalNullableString', () => {
  it('preserves null', () => {
    expect(optionalNullableString(null)).toBeNull();
  });

  it('delegates non-null to optionalString', () => {
    expect(optionalNullableString('  x ')).toBe('x');
    expect(optionalNullableString(undefined)).toBeUndefined();
  });
});

describe('optionalNumber', () => {
  it('returns finite numbers as-is', () => {
    expect(optionalNumber(3.14)).toBe(3.14);
    expect(optionalNumber(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(optionalNumber('42')).toBe(42);
    expect(optionalNumber('  3.5  ')).toBe(3.5);
  });

  it('returns undefined for non-finite or non-numeric', () => {
    expect(optionalNumber(NaN)).toBeUndefined();
    expect(optionalNumber(Infinity)).toBeUndefined();
    expect(optionalNumber('abc')).toBeUndefined();
    expect(optionalNumber('')).toBeUndefined();
    expect(optionalNumber(null)).toBeUndefined();
  });
});

describe('normalizeList', () => {
  const normalizeNumber = (v: unknown) => (typeof v === 'number' ? v : null);

  it('handles top-level array', () => {
    expect(normalizeList([1, 2, 'x', 3], normalizeNumber)).toEqual([1, 2, 3]);
  });

  it('reads nested records.* shape', () => {
    expect(normalizeList({ records: [1, 2] }, normalizeNumber)).toEqual([1, 2]);
  });

  it('reads nested items.* shape', () => {
    expect(normalizeList({ items: [4, 5] }, normalizeNumber)).toEqual([4, 5]);
  });

  it('returns empty array for unrecognized payload', () => {
    expect(normalizeList(null, normalizeNumber)).toEqual([]);
    expect(normalizeList({ unknown: [1] }, normalizeNumber)).toEqual([]);
  });
});

describe('normalizePassport', () => {
  it('returns null for non-object input', () => {
    expect(normalizePassport(null)).toBeNull();
    expect(normalizePassport('x')).toBeNull();
  });

  it('coalesces currentSoc with soc fallback', () => {
    expect(normalizePassport({ soc: 75 })?.currentSoc).toBe(75);
    expect(normalizePassport({ currentSoc: 80, soc: 70 })?.currentSoc).toBe(80);
  });

  it('coalesces totalDischargeCycles with dischargeCycles fallback', () => {
    expect(normalizePassport({ dischargeCycles: 12 })?.totalDischargeCycles).toBe(12);
  });

  it('preserves physicalHistoryVerification status', () => {
    const input = { physicalHistoryVerification: { status: 'VERIFIED' } };
    expect(normalizePassport(input)?.physicalHistoryVerification?.status).toBe('VERIFIED');
  });
});

describe('normalizeStatus', () => {
  it('handles non-record input as empty', () => {
    expect(normalizeStatus(null)).toEqual({
      fabric: undefined, channel: undefined, contract: undefined, org: undefined,
    });
  });

  it('extracts known fields', () => {
    const result = normalizeStatus({ fabric: 'CONNECTED', extra: 'keep' });
    expect(result.fabric).toBe('CONNECTED');
    expect((result as Record<string, unknown>).extra).toBe('keep');
  });
});

describe('normalizeBmuRecord', () => {
  it('returns null for non-object', () => {
    expect(normalizeBmuRecord(null)).toBeNull();
  });

  it('coerces numeric fields', () => {
    const r = normalizeBmuRecord({ soc: '75', voltage: 3.7, statusFlags: '4' });
    expect(r?.soc).toBe(75);
    expect(r?.voltage).toBe(3.7);
    expect(r?.statusFlags).toBe(4);
  });
});

describe('normalizeAuditRecord', () => {
  it('preserves null vs undefined for nullable strings', () => {
    expect(normalizeAuditRecord({ userId: null })?.userId).toBeNull();
    expect(normalizeAuditRecord({ userId: 'op1' })?.userId).toBe('op1');
    expect(normalizeAuditRecord({ })?.userId).toBeUndefined();
  });

  it('preserves boolean success only', () => {
    expect(normalizeAuditRecord({ success: true })?.success).toBe(true);
    expect(normalizeAuditRecord({ success: 'true' })?.success).toBeUndefined();
  });
});

describe('errorMessage', () => {
  it('returns Error.message', () => {
    expect(errorMessage(new Error('boom'), 'fb')).toBe('boom');
  });

  it('returns fallback for non-Error', () => {
    expect(errorMessage('str', 'fb')).toBe('fb');
    expect(errorMessage(null, 'fb')).toBe('fb');
  });
});

describe('isPermissionError', () => {
  it('detects 401/403 codes', () => {
    expect(isPermissionError('Request failed with status 401')).toBe(true);
    expect(isPermissionError('Got 403 from server')).toBe(true);
  });

  it('detects English keywords', () => {
    expect(isPermissionError('Access Denied')).toBe(true);
    expect(isPermissionError('not authorized')).toBe(true);
    expect(isPermissionError('Forbidden resource')).toBe(true);
  });

  it('detects Korean keyword', () => {
    expect(isPermissionError('권한이 없습니다')).toBe(true);
  });

  it('returns false for unrelated text', () => {
    expect(isPermissionError('500 Internal Server Error')).toBe(false);
    expect(isPermissionError('timeout')).toBe(false);
  });
});

describe('normalizedStatus', () => {
  it('returns empty string for undefined', () => {
    expect(normalizedStatus(undefined)).toBe('');
  });

  it('trims and uppercases', () => {
    expect(normalizedStatus('  active  ')).toBe('ACTIVE');
    expect(normalizedStatus('Connected')).toBe('CONNECTED');
  });
});
