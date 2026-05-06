import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import BmuRecordsTable from './BmuRecordsTable';
import type { BmuRecord } from './lib';

const records: BmuRecord[] = Array.from({ length: 12 }, (_, i) => ({
  recordId: `R${i}`,
  passportId: 'P1',
  timestamp: `2026-05-04T0${i}:00:00Z`,
  soc: 75,
  voltage: 3.7,
  current: 5,
  temperature: 25,
  dischargeCycles: i,
  statusFlags: i === 0 ? 0x01 : 0,
} as unknown as BmuRecord));

function build(overrides: Partial<ComponentProps<typeof BmuRecordsTable>> = {}) {
  return {
    records,
    pagedRecords: records.slice(0, 10),
    passportId: 'P1',
    refreshing: false,
    autoRefresh: false,
    countdown: 10,
    currentPage: 1,
    totalPages: 2,
    showingFrom: 1,
    showingTo: 10,
    onPageChange: vi.fn(),
    ...overrides,
  };
}

describe('BmuRecordsTable', () => {
  it('renders total count badge', () => {
    const { getByText } = render(<BmuRecordsTable {...build()} />);
    expect(getByText('12건')).not.toBeNull();
  });

  it('renders passport id chip', () => {
    const { getByText } = render(<BmuRecordsTable {...build({ passportId: 'BAT-X' })} />);
    expect(getByText('BAT-X')).not.toBeNull();
  });

  it('shows refreshing label only when refreshing=true', () => {
    const { getByText, rerender, queryByText } = render(<BmuRecordsTable {...build({ refreshing: true })} />);
    expect(getByText('갱신 중...')).not.toBeNull();
    rerender(<BmuRecordsTable {...build({ refreshing: false })} />);
    expect(queryByText('갱신 중...')).toBeNull();
  });

  it('renders one row per pagedRecords entry (not records.length)', () => {
    const { container } = render(<BmuRecordsTable {...build({ pagedRecords: records.slice(0, 5) })} />);
    expect(container.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('first row gets the visual marker on td:first-child div', () => {
    const { container } = render(<BmuRecordsTable {...build({ pagedRecords: records.slice(0, 3) })} />);
    const rows = container.querySelectorAll('tbody tr');
    // first row should have a div inside the marker td
    expect(rows[0].querySelector('td:first-child div')).not.toBeNull();
    expect(rows[1].querySelector('td:first-child div')).toBeNull();
  });

  it('renders 정상 badge when statusFlags=0 and decoded badge when set', () => {
    const { getAllByText, getByText } = render(<BmuRecordsTable {...build()} />);
    // R1..R9 have flags=0 → '정상'
    expect(getAllByText('정상').length).toBeGreaterThan(0);
    // R0 has 0x01 → 충전중
    expect(getByText('충전중')).not.toBeNull();
  });

  it('renders dash when dischargeCycles is null', () => {
    const recs = [{ recordId: 'R0', passportId: 'P', timestamp: 't', soc: 50, voltage: 3.7, current: 1, temperature: 25, dischargeCycles: null, statusFlags: 0 } as unknown as BmuRecord];
    const { getAllByText } = render(<BmuRecordsTable {...build({ records: recs, pagedRecords: recs })} />);
    expect(getAllByText('-').length).toBeGreaterThan(0);
  });

  it('renders summary footer with showingFrom-showingTo', () => {
    const { getByText } = render(<BmuRecordsTable {...build({ showingFrom: 11, showingTo: 12 })} />);
    expect(getByText(/총 12개 레코드 · 11-12 표시/)).not.toBeNull();
  });

  it('disables 이전 on currentPage=1, 다음 on last page', () => {
    const { getByText, rerender } = render(<BmuRecordsTable {...build({ currentPage: 1, totalPages: 2 })} />);
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(false);
    rerender(<BmuRecordsTable {...build({ currentPage: 2, totalPages: 2 })} />);
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(false);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onPageChange with clamped value on 이전/다음 click', () => {
    const props = build({ currentPage: 1, totalPages: 5 });
    const { getByText } = render(<BmuRecordsTable {...props} />);
    fireEvent.click(getByText('다음'));
    expect(props.onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows live countdown footer only when autoRefresh=true', () => {
    const { getByText, queryByText, rerender } = render(<BmuRecordsTable {...build({ autoRefresh: true, countdown: 5 })} />);
    expect(getByText(/실시간 모니터링 활성 · 5s 후 갱신/)).not.toBeNull();
    rerender(<BmuRecordsTable {...build({ autoRefresh: false })} />);
    expect(queryByText(/실시간 모니터링 활성/)).toBeNull();
  });
});
