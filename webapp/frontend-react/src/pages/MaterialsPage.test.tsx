import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MaterialsPage from './MaterialsPage';
import { AuthProvider } from '../contexts/AuthContext';
import type { Material } from '../components/modals/materials';

const apiPostMock = vi.fn();
vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, post: (...args: unknown[]) => apiPostMock(...args) },
  };
});

const dataState = {
  materials: [] as Material[],
  filteredMaterials: [] as Material[],
  paginatedMaterials: [] as Material[],
  loading: false,
  currentPage: 1,
  setCurrentPage: vi.fn(),
  totalPages: 1,
  certifiedCount: 0,
  originUniqueCount: 0,
  categoryDist: {} as Record<string, number>,
  fetchMaterials: vi.fn(),
};

vi.mock('../components/materials/useMaterialsData', () => ({
  useMaterialsData: () => dataState,
}));

function reset() {
  dataState.materials = [];
  dataState.filteredMaterials = [];
  dataState.paginatedMaterials = [];
  dataState.loading = false;
  dataState.currentPage = 1;
  dataState.totalPages = 1;
  dataState.certifiedCount = 0;
  dataState.originUniqueCount = 0;
  dataState.categoryDist = {};
  dataState.setCurrentPage.mockReset();
  dataState.fetchMaterials.mockReset();
  apiPostMock.mockReset();
}

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter><MaterialsPage /></MemoryRouter>
    </AuthProvider>,
  );
}

describe('MaterialsPage', () => {
  beforeEach(() => {
    reset();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it('renders root with data-page="materials"', () => {
    const { container } = renderPage();
    expect(container.querySelector('[data-page="materials"]')).not.toBeNull();
  });

  it('renders title and FilterBar', () => {
    const { getByText } = renderPage();
    expect(getByText('공급망 등록부')).not.toBeNull();
    expect(getByText('공급망 검색')).not.toBeNull();
  });

  it('shows StateView empty caption when no materials', () => {
    const { getByText } = renderPage();
    expect(getByText('등재된 공급망 파일이 없습니다.')).not.toBeNull();
  });

  it('hides 등재 button for non-manufacturer org', () => {
    const { queryByText } = renderPage();
    // No org → not manufacturer → button not rendered in PageHead actions
    const headerBtns = Array.from(document.querySelectorAll('h1 ~ * button')).filter((b) => b.textContent?.includes('공급망 자재 등재'));
    expect(headerBtns.length).toBe(0);
    expect(queryByText('공급망 자재 등재')).toBeNull();
  });

  it('shows 등재 button for manufacturer org', () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { queryAllByText } = renderPage();
    expect(queryAllByText('공급망 자재 등재').length).toBeGreaterThanOrEqual(1);
  });

  it('renders SummaryCard + Table when filtered materials exist', () => {
    const m: Material = { materialId: 'M1', name: 'Li', origin: 'AU', supplier: 'X', quantity: 100, unit: 'kg' } as unknown as Material;
    dataState.materials = [m];
    dataState.filteredMaterials = [m];
    dataState.paginatedMaterials = [m];
    const { getByText } = renderPage();
    expect(getByText('등록부 요약')).not.toBeNull();
    expect(getByText('Li')).not.toBeNull();
  });

  it('opens create modal when Manufacturer clicks 공급망 자재 등재', () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { container, queryAllByText } = renderPage();
    const btn = queryAllByText('공급망 자재 등재')[0].closest('button') as HTMLButtonElement;
    fireEvent.click(btn);
    // Modal title appears
    expect(container.querySelector('.sn-modal')?.textContent).toContain('원자재 등록');
  });

  it('submitMaterial calls api.post with quantity coerced to Number', async () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    apiPostMock.mockResolvedValue(null);
    const { queryAllByText, container, getByPlaceholderText } = renderPage();
    fireEvent.click(queryAllByText('공급망 자재 등재')[0].closest('button') as HTMLButtonElement);
    fireEvent.change(getByPlaceholderText('예: 리튬, 코발트, 니켈'), { target: { value: 'Li' } });
    fireEvent.change(getByPlaceholderText('예: 호주'), { target: { value: 'AU' } });
    fireEvent.change(getByPlaceholderText('예: ABC Mining'), { target: { value: 'AusMin' } });
    fireEvent.change(getByPlaceholderText('0'), { target: { value: '50' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    await waitFor(() => expect(apiPostMock).toHaveBeenCalled());
    const arg = apiPostMock.mock.calls[0][1];
    expect(arg.quantity).toBe(50);
    expect(typeof arg.quantity).toBe('number');
    await waitFor(() => expect(dataState.fetchMaterials).toHaveBeenCalled());
  });
});
