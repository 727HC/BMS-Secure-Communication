import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MaintenancePage from './MaintenancePage';
import { AuthProvider } from '../contexts/AuthContext';

const dataState: any = {
  passports: [],
  filteredPassports: [],
  pagedPassports: [],
  loading: false,
  currentPage: 1,
  setCurrentPage: vi.fn(),
  totalPages: 1,
  showingFrom: 0,
  showingTo: 0,
  tabCounts: { all: 0, maintenance: 0, accident: 0 },
  fetchPassports: vi.fn(),
};

const analyticsState = {
  extStats: { totalMaintenance: 0, totalAccident: 0, urgentCount: 0, pendingPassports: 0, avgIntervalDays: null },
  maintenanceTypeBreakdown: [] as { label: string; value: number; hint?: string }[],
  donutSegments: [] as { label: string; value: number; color: string }[],
  donutTotal: 0,
};

const labelsState = { docketScopeLabel: '서비스 데스크', docketSummary: '요약' };

const permsState = {
  isEVManufacturer: false,
  isService: false,
  canRequestMaintenance: false,
  canLogMaintenance: false,
  canLogAccident: false,
};

const mutationsState = {
  submitting: false,
  submitError: null as string | null,
  submitRequest: vi.fn(),
  submitLog: vi.fn(),
  submitAccident: vi.fn(),
};

vi.mock('../components/maintenance/useMaintenanceData', () => ({ useMaintenanceData: () => dataState }));
vi.mock('../components/maintenance/useMaintenanceAnalytics', () => ({ useMaintenanceAnalytics: () => analyticsState }));
vi.mock('../components/maintenance/useMaintenanceLabels', () => ({ useMaintenanceLabels: () => labelsState }));
vi.mock('../components/maintenance/useMaintenancePermissions', () => ({ useMaintenancePermissions: () => permsState }));
vi.mock('../components/maintenance/useMaintenanceMutations', () => ({ useMaintenanceMutations: () => mutationsState }));

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter><MaintenancePage /></MemoryRouter>
    </AuthProvider>,
  );
}

describe('MaintenancePage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    dataState.loading = false;
    dataState.passports = [];
    dataState.filteredPassports = [];
    dataState.pagedPassports = [];
    mutationsState.submitError = null;
  });
  afterEach(() => vi.clearAllMocks());

  it('renders root with data-page attribute', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-page]')).not.toBeNull();
  });

  it('renders 작업 처리 PageHead title', () => {
    const { getByText } = renderPage();
    expect(getByText('작업 처리')).not.toBeNull();
  });

  it('renders SummaryCard with docketScopeLabel from useMaintenanceLabels', () => {
    const { getAllByText } = renderPage();
    expect(getAllByText('서비스 데스크').length).toBeGreaterThanOrEqual(1);
  });

  it('shows loading skeleton when loading=true', () => {
    dataState.loading = true;
    const { container } = renderPage();
    expect(container.querySelectorAll('.sn-skeleton').length).toBeGreaterThan(0);
  });

  it('renders submit error banner when submitError set', () => {
    mutationsState.submitError = '서버 오류';
    const { getByRole } = renderPage();
    expect(getByRole('alert').textContent).toContain('서버 오류');
  });
});
