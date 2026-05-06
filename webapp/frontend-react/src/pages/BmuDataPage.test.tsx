import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BmuDataPage from './BmuDataPage';
import type { BmuRecord } from '../components/bmu-data/lib';

const fetcherState = {
  records: [] as BmuRecord[],
  loading: false,
  refreshing: false,
  hasSearched: false,
  errorMsg: null as string | null,
  accessDenied: false,
  lastFetchedAt: null as Date | null,
  countdown: 10,
  fetchRecords: vi.fn(),
  resetSearchState: vi.fn(),
};

const analyticsState = {
  sortedRecords: [] as BmuRecord[],
  recentSlice: { soc: [], voltage: [], current: [], temperature: [] },
  eventDistribution: null as unknown as null,
  latestRecord: null as BmuRecord | null,
};

vi.mock('../components/bmu-data/useBmuDataFetcher', () => ({
  useBmuDataFetcher: () => fetcherState,
}));
vi.mock('../components/bmu-data/useBmuAnalytics', () => ({
  useBmuAnalytics: () => analyticsState,
}));

function reset() {
  fetcherState.records = [];
  fetcherState.loading = false;
  fetcherState.refreshing = false;
  fetcherState.hasSearched = false;
  fetcherState.errorMsg = null;
  fetcherState.accessDenied = false;
  fetcherState.lastFetchedAt = null;
  fetcherState.countdown = 10;
  fetcherState.fetchRecords.mockReset();
  fetcherState.resetSearchState.mockReset();
  analyticsState.sortedRecords = [];
  analyticsState.recentSlice = { soc: [], voltage: [], current: [], temperature: [] };
  analyticsState.eventDistribution = null as unknown as null;
  analyticsState.latestRecord = null;
}

function renderPage(initialPath = '/bmu-data') {
  return render(<MemoryRouter initialEntries={[initialPath]}><BmuDataPage /></MemoryRouter>);
}

describe('BmuDataPage', () => {
  it('renders root with data-page="bmu-data"', () => {
    reset();
    const { container } = renderPage();
    expect(container.querySelector('[data-page="bmu-data"]')).not.toBeNull();
  });

  it('renders title + subtitle + Auto refresh toggle', () => {
    reset();
    const { getByText, container } = renderPage();
    expect(getByText('BMS 실시간 데이터')).not.toBeNull();
    expect(getByText('Auto refresh')).not.toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('renders BmuStateView empty initial panel when not searched', () => {
    reset();
    const { getByText } = renderPage();
    expect(getByText('여권 ID를 입력하여 데이터를 조회하세요')).not.toBeNull();
  });

  it('initializes passportId from search params (?id=P1)', () => {
    reset();
    const { container } = renderPage('/bmu-data?id=P1');
    const idInput = container.querySelector('input[placeholder*="여권 ID"]') as HTMLInputElement;
    expect(idInput.value).toBe('P1');
  });

  it('renders BmuSnapshotCard + BmuRecordsTable when records present', () => {
    reset();
    const rec: BmuRecord = { recordId: 'R1', passportId: 'P1', soc: 80, voltage: 3.7, current: 5, temperature: 25, timestamp: '2026-05-04T00:00:00Z', statusFlags: 0 } as unknown as BmuRecord;
    fetcherState.records = [rec];
    fetcherState.hasSearched = true;
    analyticsState.sortedRecords = [rec];
    analyticsState.latestRecord = rec;
    const { container, getByText } = renderPage();
    // Snapshot card markers
    expect(getByText('Latest telemetry snapshot')).not.toBeNull();
    // Records table marker (from BmuRecordsTable)
    expect(getByText('판독 기록')).not.toBeNull();
    // table row
    expect(container.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('toggles autoRefresh checkbox', () => {
    reset();
    const { container } = renderPage();
    const cb = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(cb.checked).toBe(false);
    fireEvent.click(cb);
    expect(cb.checked).toBe(true);
  });

  it('clicking 조회 calls fetchRecords + resetSearchState when passportId set', () => {
    reset();
    const { container, getByText } = renderPage('/bmu-data?id=P1');
    fireEvent.click(getByText('Live data 조회').closest('button') as HTMLElement);
    expect(fetcherState.resetSearchState).toHaveBeenCalled();
    expect(fetcherState.fetchRecords).toHaveBeenCalled();
    // ensure input still has the id
    expect((container.querySelector('input[placeholder*="여권 ID"]') as HTMLInputElement).value).toBe('P1');
  });

  it('does not call fetchRecords when passportId is empty', () => {
    reset();
    const { container } = renderPage();
    const btn = container.querySelector('button.sn-btn-accent') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(fetcherState.fetchRecords).not.toHaveBeenCalled();
  });
});
