import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PassportsPage from './PassportsPage';
import { AuthProvider } from '../contexts/AuthContext';
import type { Passport } from '../components/passports/lib';

const apiPostMock = vi.fn();
const apiGetMock = vi.fn();
vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, post: (...a: unknown[]) => apiPostMock(...a), get: (...a: unknown[]) => apiGetMock(...a) },
  };
});

const dataState = {
  passports: [] as Passport[],
  setPassports: vi.fn(),
  filteredPassports: [] as Passport[],
  paginatedPassports: [] as Passport[],
  loading: false,
  currentPage: 1,
  setCurrentPage: vi.fn(),
  totalPages: 1,
};

const analyticsState = {
  totalCount: 0,
  activeCount: 0,
  maintenanceCount: 0,
  endOfLifeCount: 0,
  avgGba: 0,
  vinPendingCount: 0,
  reviewReadyCount: 0,
  statusDistSegments: [],
  statusLegendItems: [],
  manufacturerBarItems: [],
  chemistryBarItems: [],
};

const labelsState = {
  registerScopeLabel: '제조사 등록부',
  registerSummary: '요약',
};

vi.mock('../components/passports/usePassportsData', () => ({
  usePassportsData: () => dataState,
}));
vi.mock('../components/passports/usePassportsAnalytics', () => ({
  usePassportsAnalytics: () => analyticsState,
}));
vi.mock('../components/passports/usePassportsLabels', () => ({
  usePassportsLabels: () => labelsState,
}));

let lastPath = '';
function NavSpy() {
  const loc = useLocation();
  lastPath = loc.pathname;
  return null;
}

function reset() {
  dataState.passports = [];
  dataState.filteredPassports = [];
  dataState.paginatedPassports = [];
  dataState.loading = false;
  dataState.currentPage = 1;
  dataState.totalPages = 1;
  dataState.setPassports.mockReset();
  dataState.setCurrentPage.mockReset();
  apiPostMock.mockReset();
  apiGetMock.mockReset();
  lastPath = '';
}

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<><PassportsPage /><NavSpy /></>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('PassportsPage', () => {
  beforeEach(() => {
    reset();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it('renders LoadingSkeleton when loading', () => {
    dataState.loading = true;
    const { container } = renderPage();
    expect(container.querySelector('[data-page="passports"]')).not.toBeNull();
    // skeleton has Skeleton blocks
    expect(container.querySelectorAll('.sn-skeleton').length).toBeGreaterThan(0);
  });

  it('renders main content when not loading', () => {
    const { getByText } = renderPage();
    expect(getByText('배터리 여권 등록부')).not.toBeNull();
    expect(getByText('등록부 검색과 정렬')).not.toBeNull();
  });

  it('hides 발급 접수 button for non-Mfg org', () => {
    const { queryByText } = renderPage();
    expect(queryByText('발급 접수')).toBeNull();
  });

  it('shows 발급 접수 button for Mfg org', () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { getByText } = renderPage();
    expect(getByText('발급 접수')).not.toBeNull();
  });

  it('opens create modal when 발급 접수 clicked', () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { container, getByText } = renderPage();
    fireEvent.click(getByText('발급 접수'));
    expect(container.querySelector('.sn-modal')?.textContent).toContain('배터리 여권 발급');
  });

  it('on successful create, navigates to /passports/:id and refreshes list', async () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    apiPostMock.mockResolvedValue({ passportId: 'P-NEW' });
    apiGetMock.mockResolvedValue({ records: [{ passportId: 'P-NEW' } as Passport] });
    const { container, getByText, getByPlaceholderText } = renderPage();
    fireEvent.click(getByText('발급 접수'));
    fireEvent.change(getByPlaceholderText('예: BMU-DEVICE-001'), { target: { value: 'SN1' } });
    fireEvent.change(getByPlaceholderText('예: did:sov:abc123'), { target: { value: 'did:x' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/passports', expect.any(Object)));
    expect(apiPostMock.mock.calls[0][1]).not.toHaveProperty('extensionInfo');
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/passports/P-NEW/bms-binding', {
      reason: 'initial BMS binding',
    }));
    expect(apiPostMock).toHaveBeenCalledWith('/passports/P-NEW/source-verification', expect.objectContaining({
      sourceType: 'BMS_BINDING',
      sourceId: 'did:battery:001#BMS-MGMT-001',
      dataHash: 'b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178',
      result: true,
    }));
    await waitFor(() => expect(lastPath).toBe('/passports/P-NEW'));
    await waitFor(() => expect(apiGetMock).toHaveBeenCalledWith('/passports'));
  });

  it('applies 3rd-year extension fields via SetPassportExtendedAttributes endpoint after create', async () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    apiPostMock.mockResolvedValue({ passportId: 'P-NEW' });
    apiGetMock.mockResolvedValue({ records: [{ passportId: 'P-NEW' } as Passport] });
    const { container, getByText, getByPlaceholderText } = renderPage();
    fireEvent.click(getByText('발급 접수'));
    fireEvent.change(getByPlaceholderText('예: BMU-DEVICE-001'), { target: { value: 'SN1' } });
    fireEvent.change(getByPlaceholderText('예: did:sov:abc123'), { target: { value: 'did:x' } });
    fireEvent.click(getByText('+ 상세 사양 입력 (GBA 필드)'));
    fireEvent.change(getByPlaceholderText('예: formation-inspection-sealing'), { target: { value: ' formation ' } });
    fireEvent.change(getByPlaceholderText('예: certified-recycler-transfer'), { target: { value: ' certified ' } });
    fireEvent.change(getByPlaceholderText('예: {"cobalt":12.5,"lithium":8.1}'), { target: { value: '{ "cobalt": 12.5 }' } });
    fireEvent.change(getByPlaceholderText('예: {"bmsProfile":"BMS-v3","oracle":"verified"}'), { target: { value: '{ "bmsProfile": "BMS-v3" }' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/passports', expect.any(Object)));
    await waitFor(() => expect(apiPostMock).toHaveBeenCalledWith('/passports/P-NEW/extended-attributes', {
      manufacturingProcess: 'formation',
      disposalMethod: 'certified',
      recycledElementContent: '{"cobalt":12.5}',
      extensionInfo: '{"bmsProfile":"BMS-v3"}',
      reason: '초기 발급 시 3차년도 확장 속성 등록',
    }));
    expect(apiPostMock).toHaveBeenCalledWith('/passports/P-NEW/bms-binding', { reason: 'initial BMS binding' });
    expect(apiPostMock).toHaveBeenCalledWith('/passports/P-NEW/source-verification', expect.objectContaining({
      details: {
        bmsManagementId: 'BMS-MGMT-001',
        bmsBindingId: 'did:battery:001#BMS-MGMT-001',
        bmsBindingCode32: '0x2c9a0e0c',
      },
    }));
  });
});
