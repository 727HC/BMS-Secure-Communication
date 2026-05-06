import { describe, expect, it } from 'vitest';
import {
  AUDIT_ALLOWED_ORGS,
  AUDIT_REQUIRED_LABEL,
  DASHBOARD_AUDIT_PATH,
  FLEET_LEGEND,
  SOURCE_IDLE,
  isAuditAvailable,
  isFailedAuditRecord,
  isPassportNormal,
  isPassportVerified,
  passportSoc,
  passportSoh,
  sourceError,
  sourceLoaded,
  sourceLoading,
  type DashboardAuditRecord,
  type DashboardPassport,
  type DashboardSourceState,
} from './lib';

describe('dashboard/lib constants', () => {
  it('exposes AUDIT_ALLOWED_ORGS as a Set with Mfg + Reg', () => {
    expect(AUDIT_ALLOWED_ORGS.has('ManufacturerMSP')).toBe(true);
    expect(AUDIT_ALLOWED_ORGS.has('RegulatorMSP')).toBe(true);
    expect(AUDIT_ALLOWED_ORGS.has('ServiceMSP')).toBe(false);
    expect(AUDIT_ALLOWED_ORGS.has('EVManufacturerMSP')).toBe(false);
  });

  it('exposes AUDIT_REQUIRED_LABEL and DASHBOARD_AUDIT_PATH', () => {
    expect(AUDIT_REQUIRED_LABEL).toBe('권한 필요');
    expect(DASHBOARD_AUDIT_PATH).toContain('/audit?');
  });

  it('exposes FLEET_LEGEND with 4 items', () => {
    expect(FLEET_LEGEND.length).toBe(4);
    expect(FLEET_LEGEND.map((i) => i.label)).toEqual(['Normal', 'Warning', 'Critical', 'No Data']);
  });

  it('exposes SOURCE_IDLE with permission=unknown', () => {
    expect(SOURCE_IDLE.permission).toBe('unknown');
    expect(SOURCE_IDLE.loading).toBe(false);
    expect(SOURCE_IDLE.error).toBeNull();
    expect(SOURCE_IDLE.loadedAt).toBeNull();
  });
});

describe('source state factories', () => {
  it('sourceLoading defaults to allowed permission', () => {
    expect(sourceLoading()).toEqual({ loading: true, error: null, permission: 'allowed', loadedAt: null });
  });

  it('sourceLoading honors override', () => {
    expect(sourceLoading('denied').permission).toBe('denied');
  });

  it('sourceLoaded sets loadedAt to current ISO and clears error', () => {
    const before = new Date().getTime();
    const s = sourceLoaded();
    const after = new Date().getTime();
    const t = new Date(s.loadedAt!).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(after);
    expect(s.error).toBeNull();
    expect(s.loading).toBe(false);
  });

  it('sourceError captures message + permission', () => {
    expect(sourceError('boom', 'denied')).toEqual({ loading: false, error: 'boom', permission: 'denied', loadedAt: null });
  });
});

describe('passportSoh / passportSoc preferred-key fallback', () => {
  it('prefers currentSoh over soh', () => {
    expect(passportSoh({ currentSoh: 90, soh: 80 } as DashboardPassport)).toBe(90);
  });
  it('falls back to soh when currentSoh missing', () => {
    expect(passportSoh({ soh: 80 } as DashboardPassport)).toBe(80);
  });
  it('returns undefined for null passport', () => {
    expect(passportSoh(null)).toBeUndefined();
    expect(passportSoc(undefined)).toBeUndefined();
  });
  it('prefers currentSoc over soc', () => {
    expect(passportSoc({ currentSoc: 70, soc: 60 } as DashboardPassport)).toBe(70);
  });
});

describe('isPassportVerified', () => {
  it('true when regulatoryVerificationStatus is VERIFIED', () => {
    expect(isPassportVerified({ regulatoryVerificationStatus: 'VERIFIED' } as DashboardPassport)).toBe(true);
  });
  it('true when physicalHistoryVerification.status is VERIFIED', () => {
    expect(isPassportVerified({ physicalHistoryVerification: { status: 'VERIFIED' } } as DashboardPassport)).toBe(true);
  });
  it('false when both are absent or non-VERIFIED', () => {
    expect(isPassportVerified({} as DashboardPassport)).toBe(false);
    expect(isPassportVerified({ regulatoryVerificationStatus: 'PENDING' } as DashboardPassport)).toBe(false);
  });
});

describe('isPassportNormal', () => {
  it('true when ACTIVE and SOH >= 80', () => {
    expect(isPassportNormal({ status: 'ACTIVE', currentSoh: 90 } as DashboardPassport)).toBe(true);
  });
  it('true when ACTIVE and SOH missing', () => {
    expect(isPassportNormal({ status: 'ACTIVE' } as DashboardPassport)).toBe(true);
  });
  it('false when SOH < 80', () => {
    expect(isPassportNormal({ status: 'ACTIVE', currentSoh: 70 } as DashboardPassport)).toBe(false);
  });
  it('false when not ACTIVE', () => {
    expect(isPassportNormal({ status: 'MAINTENANCE', currentSoh: 95 } as DashboardPassport)).toBe(false);
  });
});

describe('isAuditAvailable', () => {
  it('true only when allowed + loaded + no error + not loading', () => {
    const s: DashboardSourceState = { loading: false, error: null, permission: 'allowed', loadedAt: '2026-05-04T00:00:00Z' };
    expect(isAuditAvailable(s)).toBe(true);
  });
  it('false on permission denied', () => {
    expect(isAuditAvailable({ loading: false, error: null, permission: 'denied', loadedAt: 't' })).toBe(false);
  });
  it('false while loading', () => {
    expect(isAuditAvailable({ loading: true, error: null, permission: 'allowed', loadedAt: 't' })).toBe(false);
  });
  it('false on error', () => {
    expect(isAuditAvailable({ loading: false, error: 'x', permission: 'allowed', loadedAt: 't' })).toBe(false);
  });
  it('false when never loaded', () => {
    expect(isAuditAvailable({ loading: false, error: null, permission: 'allowed', loadedAt: null })).toBe(false);
  });
});

describe('isFailedAuditRecord', () => {
  it('true when success=false', () => {
    expect(isFailedAuditRecord({ success: false } as DashboardAuditRecord)).toBe(true);
  });
  it('true when statusCode >= 400', () => {
    expect(isFailedAuditRecord({ statusCode: 500 } as DashboardAuditRecord)).toBe(true);
    expect(isFailedAuditRecord({ statusCode: 400 } as DashboardAuditRecord)).toBe(true);
  });
  it('false when statusCode < 400 and not explicitly failed', () => {
    expect(isFailedAuditRecord({ statusCode: 200 } as DashboardAuditRecord)).toBe(false);
    expect(isFailedAuditRecord({} as DashboardAuditRecord)).toBe(false);
  });
});
