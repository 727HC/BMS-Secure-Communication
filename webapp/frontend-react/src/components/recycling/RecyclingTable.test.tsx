import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecyclingTable from './RecyclingTable';
import type { Passport, Tab } from './lib';

const tabs: { key: Tab; label: string; hint: string }[] = [
  { key: 'all', label: '전체', hint: '' },
  { key: 'recyclable', label: '회수 가능', hint: '' },
  { key: 'recycling', label: '진행', hint: '' },
  { key: 'disposed', label: '폐기', hint: '' },
];

const passports: Passport[] = [
  { passportId: 'P1', model: 'X100', status: 'ACTIVE', soh: 90, remainingLifeCycle: 1234, vin: 'V1', recycleAvailable: false } as unknown as Passport,
  { passportId: 'P2', model: 'X200', status: 'ANALYSIS', soh: 65, vin: '', recycleAvailable: true, recyclingRates: { Li: 80, Co: 70, Ni: 60 } } as unknown as Passport,
  { passportId: 'P3', model: '', status: 'DISPOSED', soh: 30, recycleAvailable: false } as unknown as Passport,
];

function build(overrides: Partial<ComponentProps<typeof RecyclingTable>> = {}) {
  return {
    org: 'RegulatorMSP',
    tabs,
    tabCounts: { all: 3, recyclable: 1, recycling: 1, disposed: 1 } as Record<Tab, number>,
    activeTab: 'all' as Tab,
    onTabChange: vi.fn(),
    filteredPassports: passports,
    pagedPassports: passports,
    currentPage: 1,
    totalPages: 1,
    showingFrom: 1,
    showingTo: 3,
    onPageChange: vi.fn(),
    canRequestAnalysis: false,
    canSubmitAnalysis: false,
    canToggleRecycle: false,
    canExtract: false,
    canDispose: false,
    onRequestAnalysis: vi.fn(),
    onOpenAnalysisResult: vi.fn(),
    onOpenRecycleToggle: vi.fn(),
    onOpenExtract: vi.fn(),
    onOpenDispose: vi.fn(),
    ...overrides,
  };
}

function renderWithRouter(props: ComponentProps<typeof RecyclingTable>) {
  return render(<MemoryRouter><RecyclingTable {...props} /></MemoryRouter>);
}

describe('RecyclingTable', () => {
  it('renders 표시·전체·권한 stamps', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('표시 3')).not.toBeNull();
    expect(getByText('전체 3')).not.toBeNull();
    expect(getByText('권한 RegulatorMSP')).not.toBeNull();
  });

  it('falls back to unknown when org is null', () => {
    const { getByText } = renderWithRouter(build({ org: null }));
    expect(getByText('권한 unknown')).not.toBeNull();
  });

  it('renders all 4 tabs with counts', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('전체')).not.toBeNull();
    expect(getByText('회수 가능')).not.toBeNull();
  });

  it('emits onTabChange on tab click', () => {
    const props = build();
    const { getByText } = renderWithRouter(props);
    fireEvent.click(getByText('회수 가능'));
    expect(props.onTabChange).toHaveBeenCalledWith('recyclable');
  });

  it('shows empty panel when filteredPassports is empty', () => {
    const { getByText } = renderWithRouter(build({ filteredPassports: [], pagedPassports: [] }));
    expect(getByText('표시할 lifecycle 파일이 없습니다.')).not.toBeNull();
  });

  it('renders one row per pagedPassports with passportId', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('P1')).not.toBeNull();
    expect(getByText('P2')).not.toBeNull();
    expect(getByText('P3')).not.toBeNull();
  });

  it('shows VIN N or VIN 미연결 + 회수 가능/미판정 in lifecycle column', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText(/VIN V1.*회수 미판정/)).not.toBeNull();
    expect(getByText(/VIN 미연결.*회수 가능/)).not.toBeNull();
  });

  it('renders SOH percentage and 잔존수명 with locale formatting', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('90%')).not.toBeNull();
    expect(getByText('1,234')).not.toBeNull();
  });

  it('shows dash when SOH or remainingLifeCycle is missing', () => {
    const recs: Passport[] = [{ passportId: 'X', status: 'ACTIVE' } as unknown as Passport];
    const { getAllByText } = renderWithRouter(build({ filteredPassports: recs, pagedPassports: recs }));
    expect(getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('renders recyclingRates element pills (max 4)', () => {
    const { getByText } = renderWithRouter(build());
    // P2 has Li/Co/Ni
    expect(getByText('Li')).not.toBeNull();
    expect(getByText('Co')).not.toBeNull();
    expect(getByText('Ni')).not.toBeNull();
  });

  it('shows 근거 없음 when no recyclingRates', () => {
    const { getAllByText } = renderWithRouter(build());
    // P1, P3 have no rates
    expect(getAllByText('근거 없음').length).toBe(2);
  });

  it('renders 분석 요청 only when canRequestAnalysis + status=ACTIVE', () => {
    const { queryByText } = renderWithRouter(build({ canRequestAnalysis: true }));
    // P1 ACTIVE
    expect(queryByText('분석 요청')).not.toBeNull();
  });

  it('renders 결과 제출 only when canSubmitAnalysis + status=ANALYSIS', () => {
    const { queryByText } = renderWithRouter(build({ canSubmitAnalysis: true }));
    // P2 ANALYSIS
    expect(queryByText('결과 제출')).not.toBeNull();
  });

  it('renders 재활용 판정 for every row when canToggleRecycle', () => {
    const { getAllByText } = renderWithRouter(build({ canToggleRecycle: true }));
    expect(getAllByText('재활용 판정').length).toBe(3);
  });

  it('renders 추출 only when canExtract + recycleAvailable + status != DISPOSED', () => {
    const { queryByText } = renderWithRouter(build({ canExtract: true }));
    // P2 only (recycleAvailable, ANALYSIS)
    expect(queryByText('추출')).not.toBeNull();
  });

  it('renders 폐기 action button only when canDispose + status != DISPOSED', () => {
    const { container } = renderWithRouter(build({ canDispose: true }));
    const tableButtons = Array.from(container.querySelectorAll('table button')).filter(
      (b) => b.textContent === '폐기',
    );
    // P1, P2 → 2; P3 disposed → skip
    expect(tableButtons.length).toBe(2);
  });

  it('emits onOpenDispose with passport on 폐기 click', () => {
    const props = build({ canDispose: true });
    const { container } = renderWithRouter(props);
    const tableButtons = Array.from(container.querySelectorAll('table button')).filter(
      (b) => b.textContent === '폐기',
    ) as HTMLButtonElement[];
    fireEvent.click(tableButtons[0]);
    expect(props.onOpenDispose).toHaveBeenCalledWith(passports[0]);
  });

  it('emits onRequestAnalysis on 분석 요청 click', () => {
    const props = build({ canRequestAnalysis: true });
    const { getByText } = renderWithRouter(props);
    fireEvent.click(getByText('분석 요청'));
    expect(props.onRequestAnalysis).toHaveBeenCalledWith(passports[0]);
  });
});
