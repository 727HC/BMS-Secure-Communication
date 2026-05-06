import { describe, expect, it } from 'vitest';
import {
  auditBlockTarget,
  auditStatusLabel,
  buildAlertRows,
  buildLedgerRows,
  buildTaskRows,
  formatRelativeTime,
  hasBmuSnapshotFields,
  passportOptionLabel,
  passportReference,
  requiresVerificationAttention,
  verificationAlertMessage,
  verificationAlertSeverity,
} from './lib-rows';
import type { DashboardAuditRecord, DashboardPassport, DashboardSourceState } from './lib';

const idleSource: DashboardSourceState = { loading: false, error: null, permission: 'unknown', loadedAt: null };
const allowedSource = (loadedAt = '2026-05-06T10:00:00.000Z'): DashboardSourceState =>
  ({ loading: false, error: null, permission: 'allowed', loadedAt });

describe('formatRelativeTime', () => {
  it("returns '현재' for null/undefined", () => {
    expect(formatRelativeTime(null)).toBe('현재');
    expect(formatRelativeTime(undefined)).toBe('현재');
  });

  it('returns the input for unparseable strings', () => {
    expect(formatRelativeTime('not-a-date')).toBe('not-a-date');
  });

  it("returns '방금' for sub-minute differences", () => {
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    expect(formatRelativeTime(tenSecondsAgo)).toBe('방금');
  });

  it('formats minutes/hours/days within the past week', () => {
    const minutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatRelativeTime(minutesAgo)).toBe('5분 전');

    const hoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(formatRelativeTime(hoursAgo)).toBe('3시간 전');

    const daysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(formatRelativeTime(daysAgo)).toBe('2일 전');
  });

  it('falls back to ISO date for week+ old timestamps', () => {
    expect(formatRelativeTime('2024-01-01T00:00:00.000Z')).toBe('2024-01-01');
  });
});

describe('passportReference', () => {
  it('prefers passportId, falls through to alternates, then passport-N', () => {
    expect(passportReference({ passportId: 'P1' }, 0)).toBe('P1');
    expect(passportReference({ serialNumber: 'SN' }, 0)).toBe('SN');
    expect(passportReference({ batteryId: 'B' }, 0)).toBe('B');
    expect(passportReference({ did: 'd' }, 0)).toBe('d');
    expect(passportReference({}, 4)).toBe('passport-5');
  });
});

describe('passportOptionLabel', () => {
  it('appends detail when distinct from reference', () => {
    expect(passportOptionLabel({ passportId: 'P1', model: 'X' }, 0)).toBe('P1 · X');
  });

  it('omits detail when equal to reference', () => {
    expect(passportOptionLabel({ passportId: 'P1', model: 'P1' }, 0)).toBe('P1');
  });
});

describe('requiresVerificationAttention', () => {
  it('flags non-VERIFIED regulatory status', () => {
    expect(requiresVerificationAttention({ regulatoryVerificationStatus: 'PENDING' })).toBe(true);
  });

  it('passes when both regulatory + physical are verified', () => {
    expect(requiresVerificationAttention({
      regulatoryVerificationStatus: 'VERIFIED',
      physicalHistoryVerification: { status: 'VERIFIED' },
    })).toBe(false);
  });

  it('passes when regulatory is VERIFIED even if physical lags (regulatory is the gate)', () => {
    expect(requiresVerificationAttention({
      regulatoryVerificationStatus: 'VERIFIED',
      physicalHistoryVerification: { status: 'PENDING' },
    })).toBe(false);
  });

  it('passes when physical alone is VERIFIED but regulatory is not', () => {
    // regulatory !== VERIFIED triggers attention even though isPassportVerified returns true
    expect(requiresVerificationAttention({
      regulatoryVerificationStatus: 'PENDING',
      physicalHistoryVerification: { status: 'VERIFIED' },
    })).toBe(true);
  });
});

describe('verificationAlertMessage', () => {
  it('returns specific message per status', () => {
    expect(verificationAlertMessage({ regulatoryVerificationStatus: 'FAILED' })).toBe('규제 검증 실패');
    expect(verificationAlertMessage({ regulatoryVerificationStatus: 'PARTIAL' })).toBe('규제 검증 부분 완료');
    expect(verificationAlertMessage({})).toBe('규제 검증 대기');
  });
});

describe('verificationAlertSeverity', () => {
  it('FAILED → High, others → Medium', () => {
    expect(verificationAlertSeverity({ regulatoryVerificationStatus: 'FAILED' })).toBe('High');
    expect(verificationAlertSeverity({ regulatoryVerificationStatus: 'PENDING' })).toBe('Medium');
  });
});

describe('hasBmuSnapshotFields', () => {
  it('returns false for empty passport', () => {
    expect(hasBmuSnapshotFields({})).toBe(false);
  });

  it('returns true when any snapshot field is present', () => {
    expect(hasBmuSnapshotFields({ currentSoc: 50 })).toBe(true);
    expect(hasBmuSnapshotFields({ currentSoh: 90 })).toBe(true);
    expect(hasBmuSnapshotFields({ soh: 90 })).toBe(true);
    expect(hasBmuSnapshotFields({ totalDischargeCycles: 100 })).toBe(true);
  });
});

describe('buildAlertRows', () => {
  it('emits status-error row when statusSource has error', () => {
    const rows = buildAlertRows([], null, { ...idleSource, error: 'down' }, [], idleSource);
    expect(rows[0]).toMatchObject({ key: 'status-error', severity: 'High' });
  });

  it('emits status-disconnected when fabric is not CONNECTED', () => {
    const rows = buildAlertRows([], { fabric: 'DOWN' }, allowedSource(), [], idleSource);
    expect(rows.find((r) => r.key === 'status-disconnected')).toBeTruthy();
  });

  it('emits VIN row for passports without vin', () => {
    const rows = buildAlertRows(
      [{ passportId: 'P1', regulatoryVerificationStatus: 'VERIFIED', physicalHistoryVerification: { status: 'VERIFIED' } }],
      { fabric: 'CONNECTED' }, allowedSource(), [], idleSource,
    );
    expect(rows.find((r) => r.key === 'vin-P1')).toBeTruthy();
  });

  it('emits MAINTENANCE/ANALYSIS status rows', () => {
    const rows = buildAlertRows(
      [
        { passportId: 'M', vin: 'V', status: 'MAINTENANCE', regulatoryVerificationStatus: 'VERIFIED', physicalHistoryVerification: { status: 'VERIFIED' } },
        { passportId: 'A', vin: 'V', status: 'ANALYSIS', regulatoryVerificationStatus: 'VERIFIED', physicalHistoryVerification: { status: 'VERIFIED' } },
      ],
      { fabric: 'CONNECTED' }, allowedSource(), [], idleSource,
    );
    expect(rows.find((r) => r.key === 'status-M')?.severity).toBe('Medium');
    expect(rows.find((r) => r.key === 'status-A')?.severity).toBe('Low');
  });

  it('skips audit rows when audit source not available', () => {
    const failed: DashboardAuditRecord[] = [{ id: 'a1', success: false, statusCode: 500 }];
    const rows = buildAlertRows([], null, allowedSource(), failed, idleSource);
    expect(rows.find((r) => r.key === 'audit-a1')).toBeUndefined();
  });

  it('emits audit row for failed records when audit source is allowed', () => {
    const failed: DashboardAuditRecord[] = [{ id: 'a1', success: false, statusCode: 503 }];
    const rows = buildAlertRows([], null, allowedSource(), failed, allowedSource());
    expect(rows.find((r) => r.key === 'audit-a1')?.severity).toBe('High');
  });
});

describe('buildTaskRows', () => {
  it('returns 4 rows in fixed order with computed counts', () => {
    const passports: DashboardPassport[] = [
      { passportId: 'P1' },
      { passportId: 'P2', vin: 'V', status: 'MAINTENANCE', currentSoh: 80, regulatoryVerificationStatus: 'VERIFIED', physicalHistoryVerification: { status: 'VERIFIED' } },
    ];
    const rows = buildTaskRows(passports);
    expect(rows.map((r) => r.label)).toEqual([
      'VIN 연결 대기', '검증 대기', '정비 필요', 'BMU 데이터 업로드 대기',
    ]);
    expect(rows[0].value).toBe('1');
    expect(rows[2].value).toBe('1');
  });
});

describe('audit helpers', () => {
  it('auditBlockTarget falls through block → blockNumber → targetId', () => {
    expect(auditBlockTarget({ block: 'B' })).toBe('B');
    expect(auditBlockTarget({ blockNumber: 'BN' })).toBe('BN');
    expect(auditBlockTarget({ targetId: 'T' })).toBe('T');
    expect(auditBlockTarget({})).toBe('—');
  });

  it('auditStatusLabel reflects success+statusCode combinations', () => {
    expect(auditStatusLabel({ success: true, statusCode: 200 })).toBe('Success 200');
    expect(auditStatusLabel({ success: false, statusCode: 500 })).toBe('Failed 500');
    expect(auditStatusLabel({ success: false })).toBe('Failed');
    expect(auditStatusLabel({ statusCode: 304 })).toBe('HTTP 304');
    expect(auditStatusLabel({})).toBe('Unknown');
  });
});

describe('buildLedgerRows', () => {
  it('maps audit records into ledger rows preserving fallbacks', () => {
    const rows = buildLedgerRows([{ id: 'tx1', orgMsp: 'MfgMSP', action: 'CREATE', timestamp: '2026-05-06T00:00:00.000Z', success: true, statusCode: 201, block: '42' }]);
    expect(rows[0]).toMatchObject({
      key: 'tx1', tx: 'tx1', block: '42', organization: 'MfgMSP', eventType: 'CREATE', status: 'Success 201',
    });
  });
});
