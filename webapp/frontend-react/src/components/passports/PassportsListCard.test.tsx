import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PassportsListCard from './PassportsListCard';
import type { Passport } from './lib';

const samplePassports: Passport[] = [
  {
    passportId: 'P1', model: 'X100', serialNumber: 'SN-1', status: 'ACTIVE',
    manufacturerName: 'LG', chemistry: 'NMC', vin: 'V123',
    currentSoh: 95, currentSoc: 70,
    updatedAt: '2026-05-04T00:00:00Z',
  } as unknown as Passport,
  {
    passportId: 'P2', model: '', serialNumber: '', status: 'MAINTENANCE',
    manufacturerName: '', chemistry: '', vin: '',
    currentSoh: 70, currentSoc: null,
    recycleAvailable: true,
  } as unknown as Passport,
];

function build(overrides: Partial<ComponentProps<typeof PassportsListCard>> = {}) {
  return {
    filteredPassports: samplePassports,
    paginatedPassports: samplePassports,
    showingFrom: 1,
    showingTo: 2,
    currentPage: 1,
    totalPages: 1,
    onPageChange: vi.fn(),
    onView: vi.fn(),
    hasActiveFilters: false,
    isManufacturer: false,
    ...overrides,
  };
}

describe('PassportsListCard', () => {
  it('renders empty state with filter-specific copy when hasActiveFilters', () => {
    const { getByText } = render(<PassportsListCard {...build({ filteredPassports: [], paginatedPassports: [], hasActiveFilters: true })} />);
    expect(getByText('표시할 등록 파일이 없습니다.')).not.toBeNull();
    expect(getByText(/검색어, 상태, GBA 필터/)).not.toBeNull();
  });

  it('renders empty state with manufacturer-specific copy when isManufacturer + no filters', () => {
    const { getByText } = render(<PassportsListCard {...build({ filteredPassports: [], paginatedPassports: [], isManufacturer: true })} />);
    expect(getByText(/아직 등재된 배터리 여권이 없습니다/)).not.toBeNull();
  });

  it('renders empty state with viewer copy otherwise', () => {
    const { getByText } = render(<PassportsListCard {...build({ filteredPassports: [], paginatedPassports: [] })} />);
    expect(getByText(/제조사가 여권을 발급하면 이 등록부에서 열람/)).not.toBeNull();
  });

  it('renders one row per paginated passport with passportId', () => {
    const { getByText } = render(<PassportsListCard {...build()} />);
    expect(getByText('P1')).not.toBeNull();
    expect(getByText('P2')).not.toBeNull();
  });

  it('renders fallback labels when fields missing', () => {
    const { getByText } = render(<PassportsListCard {...build()} />);
    expect(getByText('시리얼 정보 없음')).not.toBeNull();
    expect(getByText('미등록 모델')).not.toBeNull();
    expect(getByText('제조사 미기록 · 화학 정보 없음')).not.toBeNull();
    expect(getByText('VIN 등록 대기')).not.toBeNull();
  });

  it('shows VIN N when vin is present', () => {
    const { getByText } = render(<PassportsListCard {...build()} />);
    expect(getByText('VIN V123')).not.toBeNull();
  });

  it('emits onView with passportId on row click', () => {
    const props = build();
    const { getByText } = render(<PassportsListCard {...props} />);
    fireEvent.click(getByText('P1'));
    expect(props.onView).toHaveBeenCalledWith('P1');
  });

  it('emits onView on Enter key when row focused', () => {
    const props = build();
    const { getAllByRole } = render(<PassportsListCard {...props} />);
    const rows = getAllByRole('button');
    fireEvent.keyDown(rows[0], { key: 'Enter' });
    expect(props.onView).toHaveBeenCalledWith('P1');
  });

  it('emits onView on Space key when row focused', () => {
    const props = build();
    const { getAllByRole } = render(<PassportsListCard {...props} />);
    fireEvent.keyDown(getAllByRole('button')[1], { key: ' ' });
    expect(props.onView).toHaveBeenCalledWith('P2');
  });

  it('shows 우선 점검 필요 when SOH < 80', () => {
    const { getByText } = render(<PassportsListCard {...build()} />);
    expect(getByText('우선 점검 필요')).not.toBeNull(); // P2 SOH=70
  });

  it('shows 회수 검토 대상 when recycleAvailable=true', () => {
    const { getByText } = render(<PassportsListCard {...build()} />);
    expect(getByText('회수 검토 대상')).not.toBeNull(); // P2
  });

  it('shows showing N개 중 from-to caption (twice — header + footer)', () => {
    const { getAllByText } = render(<PassportsListCard {...build({ filteredPassports: samplePassports, showingFrom: 1, showingTo: 2 })} />);
    expect(getAllByText('2개 중 1-2 표시').length).toBe(2);
  });

  it('disables 이전 on page=1 and 다음 on last page', () => {
    const { getByText } = render(<PassportsListCard {...build({ currentPage: 1, totalPages: 1 })} />);
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onPageChange with clamped value on click', () => {
    const props = build({ currentPage: 1, totalPages: 5 });
    const { getByText } = render(<PassportsListCard {...props} />);
    fireEvent.click(getByText('다음'));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });
});
