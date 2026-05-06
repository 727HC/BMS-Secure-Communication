import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import TraceabilityTab from './TraceabilityTab';
import type { BmuRecord, Passport } from './types';

function basePassport(extra: Record<string, unknown> = {}): Passport {
  return { passportId: 'P1', maintenanceLogs: [], accidentLogs: [], ...extra } as unknown as Passport;
}

describe('TraceabilityTab', () => {
  it('renders 수집 이력 없음 when no BMU records', () => {
    const { getByText } = render(<TraceabilityTab passport={basePassport()} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('수집 이력 없음')).not.toBeNull();
    expect(getByText('0건')).not.toBeNull();
  });

  it('renders 수집 중 stamp when BMU records present and no override', () => {
    const records = [{ recordId: 'R1', soc: 80, timestamp: '2026-05-04T00:00:00Z', dischargeCycles: 100 } as unknown as BmuRecord];
    const { getByText } = render(<TraceabilityTab passport={basePassport()} bmuRecords={records} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('수집 중')).not.toBeNull();
    expect(getByText('1건')).not.toBeNull();
    expect(getByText('100회')).not.toBeNull();
  });

  it('uses passport.physicalHistoryVerification.status when set', () => {
    const passport = basePassport({ physicalHistoryVerification: { status: 'VERIFIED', verifiedAt: '2026-04-01' } });
    const records = [{ recordId: 'R1', soc: 80, timestamp: '2026-05-04T00:00:00Z' } as unknown as BmuRecord];
    const { getAllByText } = render(<TraceabilityTab passport={passport} bmuRecords={records} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getAllByText('VERIFIED').length).toBeGreaterThanOrEqual(2);
  });

  it('renders 일치 (Verified) when latestBmu.soc === passport.currentSoc', () => {
    const passport = basePassport({ currentSoc: 80 });
    const records = [{ recordId: 'R1', soc: 80, timestamp: '2026-05-04T00:00:00Z' } as unknown as BmuRecord];
    const { getByText } = render(<TraceabilityTab passport={passport} bmuRecords={records} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('일치 (Verified)')).not.toBeNull();
  });

  it('renders 불일치 (Pending) when SOC differs', () => {
    const passport = basePassport({ currentSoc: 70 });
    const records = [{ recordId: 'R1', soc: 80, timestamp: '2026-05-04T00:00:00Z' } as unknown as BmuRecord];
    const { getByText } = render(<TraceabilityTab passport={passport} bmuRecords={records} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('불일치 (Pending)')).not.toBeNull();
  });

  it('shows 검증 저장 button only when canVerifyPhysical and emits callback', () => {
    const onVerify = vi.fn();
    const { getByText, queryByText, rerender } = render(<TraceabilityTab passport={basePassport()} bmuRecords={[]} canVerifyPhysical={true} onVerifyPhysical={onVerify} />);
    fireEvent.click(getByText('검증 저장'));
    expect(onVerify).toHaveBeenCalled();
    rerender(<TraceabilityTab passport={basePassport()} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={onVerify} />);
    expect(queryByText('검증 저장')).toBeNull();
  });

  it('renders 정비 이력 count and empty caption when none', () => {
    const { getByText } = render(<TraceabilityTab passport={basePassport()} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('정비 이력 (0건)')).not.toBeNull();
    expect(getByText('정비 이력이 없습니다.')).not.toBeNull();
  });

  it('renders maintenance log entries with type/description/technician', () => {
    const passport = basePassport({
      maintenanceLogs: [
        { timestamp: '2026-04-01', maintenanceType: '셀 교체', description: '#3 셀 교체 완료', technician: '홍길동' },
      ],
    });
    const { getByText } = render(<TraceabilityTab passport={passport} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('셀 교체')).not.toBeNull();
    expect(getByText('#3 셀 교체 완료')).not.toBeNull();
    expect(getByText('담당: 홍길동')).not.toBeNull();
  });

  it('renders accident log entries with severity/description/reporter', () => {
    const passport = basePassport({
      accidentLogs: [
        { timestamp: '2026-04-10', severity: 'HIGH', description: '추돌 사고', reporter: '김검사' },
      ],
    });
    const { getByText } = render(<TraceabilityTab passport={passport} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('HIGH')).not.toBeNull();
    expect(getByText('추돌 사고')).not.toBeNull();
    expect(getByText('보고: 김검사')).not.toBeNull();
  });

  it('omits recyclingRates dossier when undefined or empty', () => {
    const { queryByText } = render(<TraceabilityTab passport={basePassport()} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(queryByText('재활용 원자재 회수율')).toBeNull();
  });

  it('renders recyclingRates rows with element + percent', () => {
    const passport = basePassport({ recyclingRates: { Li: 80, Co: 65 } });
    const { getByText } = render(<TraceabilityTab passport={passport} bmuRecords={[]} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    expect(getByText('Li')).not.toBeNull();
    expect(getByText('80%')).not.toBeNull();
    expect(getByText('Co')).not.toBeNull();
    expect(getByText('65%')).not.toBeNull();
  });

  it('uses latest BMU by timestamp comparison (string max)', () => {
    const records: BmuRecord[] = [
      { recordId: 'a', soc: 80, timestamp: '2026-04-01T00:00:00Z', dischargeCycles: 50 } as unknown as BmuRecord,
      { recordId: 'b', soc: 70, timestamp: '2026-05-04T00:00:00Z', dischargeCycles: 200 } as unknown as BmuRecord,
    ];
    const { getByText } = render(<TraceabilityTab passport={basePassport()} bmuRecords={records} canVerifyPhysical={false} onVerifyPhysical={vi.fn()} />);
    // latest dischargeCycles = 200
    expect(getByText('200회')).not.toBeNull();
  });
});
