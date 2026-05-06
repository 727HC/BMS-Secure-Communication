import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PassportDetailPage from './PassportDetailPage';
import { AuthProvider } from '../contexts/AuthContext';
import type { Passport } from '../components/passport-detail/types';

const dataState: any = {
  passport: null as Passport | null,
  bmuRecords: [],
  vcList: [],
  issuers: [],
  loading: false,
  fetchError: null as string | null,
  refetch: vi.fn(),
};

const labelsState = {
  warningMessages: [],
  lifecycleLabel: '운행',
  roleDeskLabel: '제조사 데스크',
  dossierSummary: '요약',
  filingStateLabel: 'FILED',
  actionContext: '컨텍스트',
  bmuRecordLabel: '0건',
  vinLabel: '미바인딩',
};

const mutationsState = {
  submitting: false,
  submitError: null as string | null,
  onBind: vi.fn(),
  onMaintenanceRequest: vi.fn(),
  onMaintenanceLog: vi.fn(),
  onAnalysisRequest: vi.fn(),
  onAnalysisResult: vi.fn(),
  onDispose: vi.fn(),
  onCorrect: vi.fn(),
  onVcIssue: vi.fn(),
  onVcRequest: vi.fn(),
  onVcApprove: vi.fn(),
  onVcReject: vi.fn(),
  onVcRevoke: vi.fn(),
  onRegulatoryVerification: vi.fn(),
  onPhysicalVerification: vi.fn(),
};

vi.mock('../components/passport-detail/usePassportDetailData', () => ({
  usePassportDetailData: () => dataState,
}));
vi.mock('../components/passport-detail/usePassportDossierLabels', () => ({
  usePassportDossierLabels: () => labelsState,
}));
vi.mock('../components/passport-detail/usePassportMutations', () => ({
  usePassportMutations: () => mutationsState,
}));

// Stub heavy lazy children to avoid Suspense fallback flakiness
vi.mock('../components/passport-detail/PassportDetailTabRouter', () => ({
  __esModule: true,
  default: () => <div data-testid="TabRouter" />,
}));
vi.mock('../components/passport-detail/PassportDetailModalRouter', () => ({
  __esModule: true,
  default: () => <div data-testid="ModalRouter" />,
}));

function reset() {
  dataState.passport = null;
  dataState.bmuRecords = [];
  dataState.vcList = [];
  dataState.issuers = [];
  dataState.loading = false;
  dataState.fetchError = null;
  dataState.refetch.mockReset();
  mutationsState.submitting = false;
  mutationsState.submitError = null;
}

function renderPage(initialPath = '/passports/P1') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/passports/:id" element={<PassportDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('PassportDetailPage', () => {
  beforeEach(() => {
    reset();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it('renders skeleton when loading', () => {
    dataState.loading = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-page="passport-detail"]')).not.toBeNull();
  });

  it('renders NotFound when passport missing and not loading', () => {
    const { getByText } = renderPage();
    expect(getByText('Dossier unavailable')).not.toBeNull();
  });

  it('NotFound shows fetchError as subtitle when present', () => {
    dataState.fetchError = '권한 없음';
    const { getByText } = renderPage();
    expect(getByText('권한 없음')).not.toBeNull();
  });

  it('renders Hero + tabs + ModalRouter when passport present', () => {
    dataState.passport = { passportId: 'P1', status: 'ACTIVE' } as unknown as Passport;
    const { getByTestId, container } = renderPage();
    // Hero rendered (PassportDetailHero contains '권한별 작업' heading)
    expect(container.textContent).toContain('Dossier control sheet');
    // TabRouter and ModalRouter stubs render
    expect(getByTestId('ModalRouter')).not.toBeNull();
  });

  it('renders submitError banner when set', () => {
    dataState.passport = { passportId: 'P1', status: 'ACTIVE' } as unknown as Passport;
    mutationsState.submitError = '실패 메시지';
    const { getByText } = renderPage();
    expect(getByText('실패 메시지')).not.toBeNull();
  });
});
