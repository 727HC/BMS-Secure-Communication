import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/react';
import PassportDetailHero from './PassportDetailHero';
import type { Passport } from './types';

const basePassport = {
  passportId: 'P1',
  status: 'ACTIVE',
  manufacturerName: 'LG',
  chemistry: 'NMC',
  totalEnergy: 80,
  vin: 'VIN123',
  currentSoh: 90,
  currentSoc: 75,
} as unknown as Passport;

function build(overrides: Partial<ComponentProps<typeof PassportDetailHero>> = {}) {
  return {
    passport: basePassport,
    gbaCompliance: { pct: 100, filled: 21 },
    grade: 'A',
    lifecycleLabel: '운행',
    vinLabel: 'VIN123',
    bmuRecordLabel: '125건',
    warningMessages: [],
    roleDeskLabel: '제조사 데스크',
    dossierSummary: '운영 요약',
    filingStateLabel: 'FILED',
    actionContext: '권한별 작업 안내',
    isManufacturer: false,
    isEV: false,
    isService: false,
    isRegulator: false,
    onOpenModal: vi.fn(),
    ...overrides,
  };
}

describe('PassportDetailHero', () => {
  it('renders role label, dossier summary, filing state', () => {
    const { getByText } = render(<PassportDetailHero {...build()} />);
    expect(getByText('제조사 데스크')).not.toBeNull();
    expect(getByText('운영 요약')).not.toBeNull();
    expect(getByText('FILED')).not.toBeNull();
  });

  it('renders SOH ArcGauge label and SOC ArcGauge label when both values present', () => {
    const { container } = render(<PassportDetailHero {...build()} />);
    const text = container.textContent ?? '';
    expect(text).toContain('SOH · 상태');
    expect(text).toContain('SOC · 충전');
  });

  it('renders -- placeholder when SOH is null', () => {
    const passport = { ...basePassport, currentSoh: null } as unknown as Passport;
    const { container } = render(<PassportDetailHero {...build({ passport })} />);
    expect(container.textContent).toContain('--');
  });

  it('shows 요주의 sublabel when SOH < 80', () => {
    const passport = { ...basePassport, currentSoh: 70 } as unknown as Passport;
    const { container } = render(<PassportDetailHero {...build({ passport })} />);
    expect(container.textContent).toContain('요주의');
  });

  it('renders GBA pct + Grade stamp + N/21 filed', () => {
    const { getByText } = render(<PassportDetailHero {...build({ gbaCompliance: { pct: 76, filled: 16 }, grade: 'B' })} />);
    expect(getByText('76')).not.toBeNull();
    expect(getByText('Grade B')).not.toBeNull();
    expect(getByText('16/21 fields filed')).not.toBeNull();
  });

  it('shows lifecycleLabel + status note', () => {
    const { getByText } = render(<PassportDetailHero {...build({ lifecycleLabel: '재활용' })} />);
    expect(getByText('재활용')).not.toBeNull();
    expect(getByText('ACTIVE')).not.toBeNull();
  });

  it('falls back to 상태 미등록 when status is missing', () => {
    const passport = { ...basePassport, status: '' } as unknown as Passport;
    const { getByText } = render(<PassportDetailHero {...build({ passport })} />);
    expect(getByText('상태 미등록')).not.toBeNull();
  });

  it('renders 데이터 정정 button only when isManufacturer', () => {
    const { queryByText, rerender } = render(<PassportDetailHero {...build({ isManufacturer: false })} />);
    expect(queryByText('데이터 정정')).toBeNull();
    rerender(<PassportDetailHero {...build({ isManufacturer: true })} />);
    expect(queryByText('데이터 정정')).not.toBeNull();
  });

  it('renders 차량 연결 only when EV and vin missing; hides when vin present', () => {
    const noVin = { ...basePassport, vin: '' } as unknown as Passport;
    const { queryByText, rerender } = render(<PassportDetailHero {...build({ isEV: true, passport: noVin })} />);
    expect(queryByText('차량 연결')).not.toBeNull();
    rerender(<PassportDetailHero {...build({ isEV: true, passport: basePassport })} />);
    expect(queryByText('차량 연결')).toBeNull();
  });

  it('renders 정비 요청 + 분석 요청 only when EV and status=ACTIVE', () => {
    const { queryByText, rerender } = render(<PassportDetailHero {...build({ isEV: true })} />);
    expect(queryByText('정비 요청')).not.toBeNull();
    expect(queryByText('분석 요청')).not.toBeNull();
    const inactive = { ...basePassport, status: 'MAINTENANCE' } as unknown as Passport;
    rerender(<PassportDetailHero {...build({ isEV: true, passport: inactive })} />);
    expect(queryByText('정비 요청')).toBeNull();
  });

  it('renders 정비 완료 only when service + status=MAINTENANCE', () => {
    const passport = { ...basePassport, status: 'MAINTENANCE' } as unknown as Passport;
    const { queryByText } = render(<PassportDetailHero {...build({ isService: true, passport })} />);
    expect(queryByText('정비 완료')).not.toBeNull();
  });

  it('renders 분석 결과 only when service + status=ANALYSIS', () => {
    const passport = { ...basePassport, status: 'ANALYSIS' } as unknown as Passport;
    const { queryByText } = render(<PassportDetailHero {...build({ isService: true, passport })} />);
    expect(queryByText('분석 결과')).not.toBeNull();
  });

  it('renders 폐기 only when regulator + status != DISPOSED', () => {
    const { queryByText, rerender } = render(<PassportDetailHero {...build({ isRegulator: true })} />);
    expect(queryByText('폐기')).not.toBeNull();
    const disposed = { ...basePassport, status: 'DISPOSED' } as unknown as Passport;
    rerender(<PassportDetailHero {...build({ isRegulator: true, passport: disposed })} />);
    expect(queryByText('폐기')).toBeNull();
  });

  it('renders VC 발급 for manufacturer OR regulator', () => {
    const { queryByText, rerender } = render(<PassportDetailHero {...build({ isManufacturer: true })} />);
    expect(queryByText('VC 발급')).not.toBeNull();
    rerender(<PassportDetailHero {...build({ isRegulator: true })} />);
    expect(queryByText('VC 발급')).not.toBeNull();
    rerender(<PassportDetailHero {...build({ isEV: true })} />);
    expect(queryByText('VC 발급')).toBeNull();
  });

  it('emits onOpenModal with correct key on button click', () => {
    const onOpenModal = vi.fn();
    const { getByText } = render(<PassportDetailHero {...build({ isManufacturer: true, onOpenModal })} />);
    fireEvent.click(getByText('데이터 정정'));
    expect(onOpenModal).toHaveBeenCalledWith('correct');
  });

  it('renders warning messages list when provided', () => {
    const { getByText, queryByText, rerender } = render(<PassportDetailHero {...build({ warningMessages: ['SOH 임계 초과'] })} />);
    expect(getByText('SOH 임계 초과')).not.toBeNull();
    rerender(<PassportDetailHero {...build({ warningMessages: [] })} />);
    expect(queryByText('SOH 임계 초과')).toBeNull();
  });

  it('renders cover meta values (manufacturer, chemistry, energy, vinLabel, bmu)', () => {
    const { getByText } = render(<PassportDetailHero {...build({ vinLabel: 'V-X', bmuRecordLabel: '99건' })} />);
    expect(getByText('LG')).not.toBeNull();
    expect(getByText('NMC')).not.toBeNull();
    expect(getByText('80 kWh')).not.toBeNull();
    expect(getByText('V-X')).not.toBeNull();
    expect(getByText('99건')).not.toBeNull();
  });

  it('cover meta uses dash when fields missing', () => {
    const passport = { ...basePassport, manufacturerName: '', chemistry: '', totalEnergy: 0 } as unknown as Passport;
    const { container } = render(<PassportDetailHero {...build({ passport })} />);
    const meta = container.querySelector('.sn-detail-cover-meta');
    expect(meta).not.toBeNull();
    // manufacturer + chemistry + totalEnergy(0 falsy → dash)
    expect(within(meta as HTMLElement).getAllByText('-').length).toBeGreaterThanOrEqual(3);
  });
});
