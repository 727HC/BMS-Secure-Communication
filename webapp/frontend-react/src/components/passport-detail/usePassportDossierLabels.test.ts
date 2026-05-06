import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePassportDossierLabels } from './usePassportDossierLabels';
import type { GbaCompliance, Passport } from './types';

const fullCompliance: GbaCompliance = {
  pct: 100,
  filled: 21,
  total: 21,
  allFilled: true,
  groups: [],
};

const partialCompliance: GbaCompliance = {
  pct: 50,
  filled: 10,
  total: 21,
  allFilled: false,
  groups: [],
};

const baseRoles = { isManufacturer: false, isEV: false, isService: false, isRegulator: false };

describe('usePassportDossierLabels — warningMessages', () => {
  it('returns empty for healthy passport', () => {
    const passport: Passport = { passportId: 'P', vin: 'V', status: 'ACTIVE', currentSoh: 90 };
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 5,
        ...baseRoles,
      })
    );
    expect(result.current.warningMessages).toEqual([]);
  });

  it('flags MAINTENANCE/ANALYSIS status', () => {
    const passport: Passport = { passportId: 'P', vin: 'V', status: 'MAINTENANCE', currentSoh: 90 };
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport, gbaCompliance: fullCompliance, bmuRecordsCount: 0, ...baseRoles,
      })
    );
    expect(result.current.warningMessages.some((m) => m.includes('정비'))).toBe(true);
  });

  it('reports the GBA gap count', () => {
    const passport: Passport = { passportId: 'P', vin: 'V', status: 'ACTIVE', currentSoh: 90 };
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport, gbaCompliance: partialCompliance, bmuRecordsCount: 0, ...baseRoles,
      })
    );
    const msg = result.current.warningMessages.find((m) => m.includes('GBA'));
    expect(msg).toContain('11개');
  });

  it('flags low SOH (<80)', () => {
    const passport: Passport = { passportId: 'P', vin: 'V', status: 'ACTIVE', currentSoh: 70 };
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport, gbaCompliance: fullCompliance, bmuRecordsCount: 0, ...baseRoles,
      })
    );
    expect(result.current.warningMessages.some((m) => m.includes('SOH'))).toBe(true);
  });

  it('flags missing VIN', () => {
    const passport: Passport = { passportId: 'P', status: 'ACTIVE', currentSoh: 90 };
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport, gbaCompliance: fullCompliance, bmuRecordsCount: 0, ...baseRoles,
      })
    );
    expect(result.current.warningMessages.some((m) => m.includes('VIN'))).toBe(true);
  });
});

describe('usePassportDossierLabels — lifecycleLabel', () => {
  it('uses status-driven labels with priority', () => {
    const cases: [Partial<Passport>, string][] = [
      [{ status: 'MAINTENANCE', vin: 'V' }, '정비 진행 중'],
      [{ status: 'ANALYSIS', vin: 'V' }, '점검 결과 대기'],
      [{ status: 'RECYCLING', vin: 'V' }, '회수·재활용 검토 중'],
      [{ status: 'ACTIVE' }, 'VIN 등록 대기'],
      [{ status: 'ACTIVE', vin: 'V' }, '운행 중'],
    ];
    for (const [p, expected] of cases) {
      const { result } = renderHook(() =>
        usePassportDossierLabels({
          passport: p as Passport,
          gbaCompliance: fullCompliance,
          bmuRecordsCount: 0,
          ...baseRoles,
        })
      );
      expect(result.current.lifecycleLabel).toBe(expected);
    }
  });
});

describe('usePassportDossierLabels — role labels', () => {
  it('returns Manufacturer-specific labels', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: { vin: 'V', status: 'ACTIVE' } as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
        isManufacturer: true,
      })
    );
    expect(result.current.roleDeskLabel).toContain('제조사');
    expect(result.current.actionContext).toContain('VC 발급');
  });

  it('returns EV-specific labels', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: { vin: 'V', status: 'ACTIVE' } as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
        isEV: true,
      })
    );
    expect(result.current.roleDeskLabel).toContain('EV');
  });

  it('returns Regulator-specific labels', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: { vin: 'V', status: 'ACTIVE' } as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
        isRegulator: true,
      })
    );
    expect(result.current.roleDeskLabel).toContain('규제기관');
  });
});

describe('usePassportDossierLabels — filing/bmu/vin labels', () => {
  it('reports 문서 보완 필요 when GBA < 100', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: { vin: 'V' } as Passport,
        gbaCompliance: partialCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
      })
    );
    expect(result.current.filingStateLabel).toBe('문서 보완 필요');
  });

  it('reports VIN 연결 대기 when full GBA but missing VIN', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: {} as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
      })
    );
    expect(result.current.filingStateLabel).toBe('VIN 연결 대기');
  });

  it('reports 검토 준비 when fully filed', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: { vin: 'V' } as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
      })
    );
    expect(result.current.filingStateLabel).toBe('검토 준비');
  });

  it('formats bmuRecordLabel and vinLabel', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: { vin: 'V123' } as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 7,
        ...baseRoles,
      })
    );
    expect(result.current.bmuRecordLabel).toBe('7건 수집');
    expect(result.current.vinLabel).toBe('V123');
  });

  it('falls back when bmu records empty / vin missing', () => {
    const { result } = renderHook(() =>
      usePassportDossierLabels({
        passport: {} as Passport,
        gbaCompliance: fullCompliance,
        bmuRecordsCount: 0,
        ...baseRoles,
      })
    );
    expect(result.current.bmuRecordLabel).toBe('수집 이력 없음');
    expect(result.current.vinLabel).toBe('미바인딩');
  });
});
