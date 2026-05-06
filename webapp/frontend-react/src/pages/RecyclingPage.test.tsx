import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecyclingPage from './RecyclingPage';
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
  tabCounts: { all: 0, recyclable: 0, recycling: 0, disposed: 0 },
  fetchPassports: vi.fn(),
};

const analyticsState = {
  avgSoh: null as number | null,
  avgRemaining: null as number | null,
  avgRates: [] as { element: string; avg: number }[],
  lifecycleMetrics: { lifecycleFiles: [], analysisQueue: 0, activeCandidates: 0, extractionEvidence: 0, readyRatio: 0 },
  lifecycleBreakdown: [] as { label: string; value: number; color: string }[],
};

const labelsState = { deskLabel: '재활용 데스크', pageSummary: '요약' };

const permsState = {
  isEVManufacturer: false,
  isService: false,
  isRegulator: false,
  canRequestAnalysis: false,
  canSubmitAnalysis: false,
  canToggleRecycle: false,
  canExtract: false,
  canDispose: false,
};

const mutationsState = {
  submitting: false,
  submitError: null as string | null,
  requestAnalysis: vi.fn(),
  submitAnalysisResult: vi.fn(),
  submitRecycleToggle: vi.fn(),
  submitExtract: vi.fn(),
  submitDispose: vi.fn(),
};

vi.mock('../components/recycling/useRecyclingData', () => ({ useRecyclingData: () => dataState }));
vi.mock('../components/recycling/useRecyclingAnalytics', () => ({ useRecyclingAnalytics: () => analyticsState }));
vi.mock('../components/recycling/useRecyclingLabels', () => ({ useRecyclingLabels: () => labelsState }));
vi.mock('../components/recycling/useRecyclingPermissions', () => ({ useRecyclingPermissions: () => permsState }));
vi.mock('../components/recycling/useRecyclingMutations', () => ({ useRecyclingMutations: () => mutationsState }));

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter><RecyclingPage /></MemoryRouter>
    </AuthProvider>,
  );
}

describe('RecyclingPage', () => {
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

  it('renders title and subtitle', () => {
    const { getByText } = renderPage();
    // PageHead title is exact '재활용·ESG'
    expect(getByText('재활용·ESG')).not.toBeNull();
  });

  it('renders SummaryCard with deskLabel from useRecyclingLabels', () => {
    const { getByText } = renderPage();
    expect(getByText('재활용 데스크')).not.toBeNull();
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
