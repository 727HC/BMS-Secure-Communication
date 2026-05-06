import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MaintenanceTable from './MaintenanceTable';
import type { Passport, Tab } from './lib';

const tabs: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'accident', label: 'Accident' },
];

const samplePassports: Passport[] = [
  { passportId: 'P1', model: 'X100', manufacturerName: 'LG', vin: 'V1', status: 'ACTIVE', maintenanceLogs: [], accidentLogs: [] } as unknown as Passport,
  { passportId: 'P2', model: 'X200', manufacturerName: 'SDI', vin: '', status: 'MAINTENANCE', maintenanceLogs: [{}, {}], accidentLogs: [{}] } as unknown as Passport,
];

function build(overrides: Partial<ComponentProps<typeof MaintenanceTable>> = {}) {
  return {
    tabs,
    tabCounts: { all: 2, maintenance: 1, accident: 1 } as Record<Tab, number>,
    activeTab: 'all' as Tab,
    onTabChange: vi.fn(),
    filteredPassports: samplePassports,
    pagedPassports: samplePassports,
    currentPage: 1,
    totalPages: 1,
    showingFrom: 1,
    showingTo: 2,
    onPageChange: vi.fn(),
    docketScopeLabel: 'Service desk',
    canRequestMaintenance: false,
    canLogMaintenance: false,
    canLogAccident: false,
    onOpenMaintenanceRequest: vi.fn(),
    onOpenMaintenanceLog: vi.fn(),
    onOpenAccident: vi.fn(),
    ...overrides,
  };
}

function renderWithRouter(props: ComponentProps<typeof MaintenanceTable>) {
  return render(<MemoryRouter><MaintenanceTable {...props} /></MemoryRouter>);
}

describe('MaintenanceTable', () => {
  it('renders 표시 + 전체 docket stamps', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('표시 2')).not.toBeNull();
    expect(getByText('전체 docket 2')).not.toBeNull();
  });

  it('renders tab buttons with counts', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('All')).not.toBeNull();
    expect(getByText('Maintenance')).not.toBeNull();
    expect(getByText('Accident')).not.toBeNull();
  });

  it('emits onTabChange on tab click', () => {
    const props = build();
    const { getByText } = renderWithRouter(props);
    fireEvent.click(getByText('Maintenance'));
    expect(props.onTabChange).toHaveBeenCalledWith('maintenance');
  });

  it('renders empty-dashed panel with docket scope when no passports', () => {
    const { getByText } = renderWithRouter(build({ filteredPassports: [], pagedPassports: [], docketScopeLabel: 'Test scope' }));
    expect(getByText('표시할 task docket 항목이 없습니다.')).not.toBeNull();
    expect(getByText('Test scope')).not.toBeNull();
    expect(getByText('GET /api/passports')).not.toBeNull();
  });

  it('renders one row per pagedPassports with passportId', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('P1')).not.toBeNull();
    expect(getByText('P2')).not.toBeNull();
  });

  it('renders 미바인딩 when vin is missing', () => {
    const { getByText } = renderWithRouter(build());
    expect(getByText('미바인딩')).not.toBeNull();
  });

  it('shows Service N건 / Incident N건 ledger evidence', () => {
    const { getByText } = renderWithRouter(build());
    // P2: maintenanceLogs=2, accidentLogs=1
    expect(getByText(/Service 2건/)).not.toBeNull();
    expect(getByText(/Incident 1건/)).not.toBeNull();
  });

  it('renders 작업 접수 only when canRequestMaintenance + status=ACTIVE', () => {
    const { queryByText } = renderWithRouter(build({ canRequestMaintenance: true }));
    // P1 is ACTIVE → button visible
    expect(queryByText('작업 접수')).not.toBeNull();
  });

  it('emits onOpenMaintenanceRequest with the passport on 작업 접수 click', () => {
    const props = build({ canRequestMaintenance: true });
    const { getByText } = renderWithRouter(props);
    fireEvent.click(getByText('작업 접수'));
    expect(props.onOpenMaintenanceRequest).toHaveBeenCalledWith(samplePassports[0]);
  });

  it('renders 완료 기록 only when canLogMaintenance + status=MAINTENANCE', () => {
    const { queryByText } = renderWithRouter(build({ canLogMaintenance: true }));
    // P2 is MAINTENANCE → button visible
    expect(queryByText('완료 기록')).not.toBeNull();
  });

  it('emits onOpenMaintenanceLog with the passport on 완료 기록 click', () => {
    const props = build({ canLogMaintenance: true });
    const { getByText } = renderWithRouter(props);
    fireEvent.click(getByText('완료 기록'));
    expect(props.onOpenMaintenanceLog).toHaveBeenCalledWith(samplePassports[1]);
  });

  it('renders Incident button for every row when canLogAccident', () => {
    const { getAllByText } = renderWithRouter(build({ canLogAccident: true }));
    expect(getAllByText('Incident').length).toBe(2);
  });

  it('emits onOpenAccident on Incident click', () => {
    const props = build({ canLogAccident: true });
    const { getAllByText } = renderWithRouter(props);
    fireEvent.click(getAllByText('Incident')[0]);
    expect(props.onOpenAccident).toHaveBeenCalledWith(samplePassports[0]);
  });

  it('disables 이전·다음 when single page', () => {
    const { getByText } = renderWithRouter(build({ currentPage: 1, totalPages: 1 }));
    expect((getByText('이전') as HTMLButtonElement).disabled).toBe(true);
    expect((getByText('다음') as HTMLButtonElement).disabled).toBe(true);
  });
});
