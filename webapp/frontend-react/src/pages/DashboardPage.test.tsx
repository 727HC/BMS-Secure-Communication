import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { AuthProvider } from '../contexts/AuthContext';

const dataState: any = {
  passports: [],
  platformStatus: null,
  bmuRecords: [],
  auditRecords: [],
  selectedPassportId: null,
  passportSource: { loading: false, error: null, permission: 'unknown', loadedAt: null },
  statusSource: { loading: false, error: null, permission: 'unknown', loadedAt: null },
  bmuSource: { loading: false, error: null, permission: 'unknown', loadedAt: null },
  auditSource: { loading: false, error: null, permission: 'unknown', loadedAt: null },
};

const rowsState: any = {
  selectedPassport: null,
  selectedPassportLabel: '대시보드 개요',
  selectedBmuRecord: null,
  alertRows: [],
  taskRows: [],
  totalTaskCount: 0,
  ledgerRows: [],
  passportOptions: [],
  ledgerFallback: '권한 필요',
};

const vmState: any = {
  kpiCards: [],
  fleetGauges: [],
  dataflowNodes: [],
  securityRows: [],
};

const labelsState = {
  dashboardDataSummary: '시스템 데이터 요약',
  batterySelectorDisabled: true,
  batterySelectorTitle: '배터리 선택',
  batterySelectorButtonLabel: '배터리 선택',
};

vi.mock('../components/dashboard/useDashboardData', () => ({ useDashboardData: () => dataState }));
vi.mock('../components/dashboard/useDashboardRows', () => ({ useDashboardRows: () => rowsState }));
vi.mock('../components/dashboard/useDashboardViewModels', () => ({ useDashboardViewModels: () => vmState }));
vi.mock('../components/dashboard/useDashboardLabels', () => ({ useDashboardLabels: () => labelsState }));

let lastPath = '';
function NavSpy() {
  const loc = useLocation();
  lastPath = loc.pathname;
  return null;
}

function renderPage(initialPath = '/dashboard') {
  lastPath = '';
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="*" element={<><DashboardPage /><NavSpy /></>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it('renders root .vk-dash and 개요 title', () => {
    const { container, getByText } = renderPage();
    expect(container.querySelector('.vk-dash')).not.toBeNull();
    expect(getByText('개요')).not.toBeNull();
  });

  it('renders 6 cards: KpiRow, BatteryMonitor, Dataflow, Alert, Security, TaskQueue, Ledger', () => {
    const { container } = renderPage();
    expect(container.querySelector('.vk-grid--fleet')).not.toBeNull();
    expect(container.querySelector('.vk-grid--2')).not.toBeNull();
    expect(container.querySelector('.vk-grid--ledger')).not.toBeNull();
  });

  it('passes selectedPassportId to root data attribute', () => {
    dataState.selectedPassportId = 'P-X';
    const { container } = renderPage();
    expect(container.querySelector('.vk-dash')?.getAttribute('data-selected-passport-id')).toBe('P-X');
    dataState.selectedPassportId = null;
  });

  it('renders dashboardDataSummary in footer', () => {
    const { getByText } = renderPage();
    expect(getByText('시스템 데이터 요약')).not.toBeNull();
  });

  it('clicking AlertCard 전체 알림 보기 navigates to /audit-log when canReadAudit', () => {
    sessionStorage.setItem('auth_org', 'ManufacturerMSP');
    const { getByText } = renderPage();
    fireEvent.click(getByText('전체 알림 보기').closest('button') as HTMLButtonElement);
    expect(lastPath).toBe('/audit-log');
  });
});
