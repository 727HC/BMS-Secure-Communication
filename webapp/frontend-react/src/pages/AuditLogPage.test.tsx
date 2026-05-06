import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AuditLogPage from './AuditLogPage';
import type { LogRecord } from '../components/audit-log/lib';

const fetcherState = {
  logs: [] as LogRecord[],
  total: 0,
  loading: false,
  errorMsg: null as string | null,
  fetchLogs: vi.fn(),
};

const analyticsState = {
  activeActionLabel: '전체',
  actionDistribution: [] as { action: string; count: number }[],
  methodDistribution: [] as { label: string; value: number; color: string }[],
  statusDistribution: [] as { key: string; label: string; value: number; color: string }[],
  timeSummary: { last24h: 0, last7d: 0 },
  statusSummary: null as null | { success: number; fail: number; successPct: number; total: number },
};

vi.mock('../components/audit-log/useAuditLogFetcher', () => ({
  useAuditLogFetcher: () => fetcherState,
}));
vi.mock('../components/audit-log/useAuditLogAnalytics', () => ({
  useAuditLogAnalytics: () => analyticsState,
}));

function reset() {
  fetcherState.logs = [];
  fetcherState.total = 0;
  fetcherState.loading = false;
  fetcherState.errorMsg = null;
  fetcherState.fetchLogs.mockReset();
}

describe('AuditLogPage', () => {
  beforeEach(reset);
  afterEach(() => vi.clearAllMocks());

  it('renders root with data-page="audit-log"', () => {
    const { container } = render(<AuditLogPage />);
    expect(container.querySelector('[data-page="audit-log"]')).not.toBeNull();
  });

  it('renders PageHead title and total count in subtitle', () => {
    fetcherState.total = 42;
    const { getByText } = render(<AuditLogPage />);
    expect(getByText('감사·원장')).not.toBeNull();
    expect(getByText(/총 42건의 API 행위/)).not.toBeNull();
  });

  it('renders Auto refresh toggle and 새로고침 button', () => {
    const { getByText, getAllByText } = render(<AuditLogPage />);
    expect(getByText('Auto refresh')).not.toBeNull();
    expect(getAllByText('새로고침').length).toBeGreaterThanOrEqual(1);
  });

  it('clicking 새로고침 calls fetchLogs', () => {
    const { getAllByText } = render(<AuditLogPage />);
    // Header refresh button is the actual button
    const buttons = getAllByText('새로고침').map((n) => n.closest('button')).filter(Boolean) as HTMLButtonElement[];
    fireEvent.click(buttons[0]);
    expect(fetcherState.fetchLogs).toHaveBeenCalled();
  });

  it('renders AuditSummaryCard with 쓰기 전용 ledger label by default', () => {
    const { getAllByText } = render(<AuditLogPage />);
    expect(getAllByText('쓰기 전용 원장').length).toBeGreaterThanOrEqual(1);
  });

  it('renders AuditFilterBar (filter applies via select)', () => {
    const { getByText } = render(<AuditLogPage />);
    expect(getByText('감사 등록 필터')).not.toBeNull();
  });

  it('does not render AuditDistributionCharts/Table when no records', () => {
    const { queryByText } = render(<AuditLogPage />);
    expect(queryByText('원장 항목')).toBeNull();
  });

  it('renders Distribution + Table when records present', () => {
    fetcherState.logs = [{ id: 'L1', action: 'CREATE_PASSPORT', timestamp: '2026-05-04T00:00:00Z', method: 'POST', path: '/x', statusCode: 200 } as LogRecord];
    fetcherState.total = 1;
    const { getByText } = render(<AuditLogPage />);
    expect(getByText('원장 항목')).not.toBeNull();
    expect(getByText('HTTP 메서드 등록부')).not.toBeNull();
  });
});
