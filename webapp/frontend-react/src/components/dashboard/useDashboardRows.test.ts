import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardRows } from './useDashboardRows';
import type { DashboardPassport, DashboardSourceState } from './lib';

const idle: DashboardSourceState = { loading: false, error: null, permission: 'unknown', loadedAt: null };
const allowed = (loadedAt = '2026-05-06T10:00:00.000Z'): DashboardSourceState =>
  ({ loading: false, error: null, permission: 'allowed', loadedAt });

const baseArgs = {
  passports: [] as DashboardPassport[],
  bmuRecords: [],
  auditRecords: [],
  platformStatus: null,
  statusSource: idle,
  auditSource: idle,
  selectedPassportId: null,
  passportSource: idle,
};

describe('useDashboardRows — selectedPassport', () => {
  it('returns null when selectedPassportId is null', () => {
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs }));
    expect(result.current.selectedPassport).toBeNull();
  });

  it('finds passport by passportId', () => {
    const passports: DashboardPassport[] = [
      { passportId: 'P1' }, { passportId: 'P2', model: 'M2' },
    ];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports, selectedPassportId: 'P2' }));
    expect(result.current.selectedPassport?.model).toBe('M2');
  });

  it('returns null when selectedPassportId not found', () => {
    const passports: DashboardPassport[] = [{ passportId: 'P1' }];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports, selectedPassportId: 'X' }));
    expect(result.current.selectedPassport).toBeNull();
  });
});

describe('useDashboardRows — selectedPassportLabel', () => {
  it("returns 'loading' label while passportSource is loading", () => {
    const { result } = renderHook(() => useDashboardRows({
      ...baseArgs,
      passportSource: { ...idle, loading: true },
    }));
    expect(result.current.selectedPassportLabel).toBe('여권 조회 중');
  });

  it("returns 'no batteries' when passports is empty and not loading", () => {
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs }));
    expect(result.current.selectedPassportLabel).toBe('등록된 배터리 없음');
  });

  it("returns 'pending selection' when batteries exist but none selected", () => {
    const passports: DashboardPassport[] = [{ passportId: 'P1' }];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports }));
    expect(result.current.selectedPassportLabel).toBe('배터리 선택 대기');
  });

  it('appends model/serial detail when selected', () => {
    const passports: DashboardPassport[] = [{ passportId: 'P1', model: 'X1' }];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports, selectedPassportId: 'P1' }));
    expect(result.current.selectedPassportLabel).toBe('P1 · X1');
  });
});

describe('useDashboardRows — taskRows/totalTaskCount', () => {
  it('returns 4 task rows summing to totalTaskCount', () => {
    const passports: DashboardPassport[] = [
      { passportId: 'P1' }, // VIN 미연결, 검증 미, BMU 미
      { passportId: 'P2', vin: 'V', status: 'MAINTENANCE', currentSoh: 90, regulatoryVerificationStatus: 'VERIFIED', physicalHistoryVerification: { status: 'VERIFIED' } },
    ];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports }));
    expect(result.current.taskRows).toHaveLength(4);
    const sum = result.current.taskRows.reduce((acc, r) => acc + Number(r.value), 0);
    expect(result.current.totalTaskCount).toBe(sum);
  });
});

describe('useDashboardRows — passportOptions', () => {
  it('skips passports without passportId', () => {
    const passports: DashboardPassport[] = [
      { passportId: 'P1' },
      { serialNumber: 'SN' }, // no passportId
      { passportId: 'P2', model: 'M2' },
    ];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports }));
    expect(result.current.passportOptions.map((o) => o.id)).toEqual(['P1', 'P2']);
  });

  it("uses '상태 없음' fallback when status missing", () => {
    const passports: DashboardPassport[] = [{ passportId: 'P1' }];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, passports }));
    expect(result.current.passportOptions[0].status).toBe('상태 없음');
  });
});

describe('useDashboardRows — ledgerFallback', () => {
  it("returns '권한 필요' when audit source denied", () => {
    const denied: DashboardSourceState = { loading: false, error: null, permission: 'denied', loadedAt: null };
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, auditSource: denied }));
    expect(result.current.ledgerFallback).toBe('권한 필요');
  });

  it("returns '감사 조회 중' while audit loading", () => {
    const loadingSrc: DashboardSourceState = { loading: true, error: null, permission: 'allowed', loadedAt: null };
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, auditSource: loadingSrc }));
    expect(result.current.ledgerFallback).toBe('감사 조회 중');
  });

  it("returns error fallback when audit errored", () => {
    const erroredSrc: DashboardSourceState = { loading: false, error: 'down', permission: 'allowed', loadedAt: null };
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, auditSource: erroredSrc }));
    expect(result.current.ledgerFallback).toBe('감사 기록 조회 실패');
  });

  it("returns '원장 로그가 없습니다' when allowed but no records", () => {
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, auditSource: allowed() }));
    expect(result.current.ledgerFallback).toBe('원장 로그가 없습니다');
  });

  it('returns null when records exist', () => {
    const auditRecords = [{ id: 'a1', success: true, statusCode: 200, timestamp: '2026-05-06T00:00:00Z' }];
    const { result } = renderHook(() => useDashboardRows({ ...baseArgs, auditRecords, auditSource: allowed() }));
    expect(result.current.ledgerFallback).toBeNull();
    expect(result.current.ledgerRows).toHaveLength(1);
  });
});
