import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AuditSummaryCard from './AuditSummaryCard';

function build(overrides: Partial<ComponentProps<typeof AuditSummaryCard>> = {}) {
  return {
    ledgerScopeLabel: '제조사 원장',
    page: 1,
    totalPages: 3,
    total: 42,
    filterWriteOnly: false,
    activeActionLabel: '전체',
    autoRefresh: true,
    newestTimestamp: undefined,
    timeSummary: { last24h: 5, last7d: 20 },
    ...overrides,
  };
}

describe('AuditSummaryCard', () => {
  it('renders eyebrow + page stamp + total', () => {
    const { getByText } = render(<AuditSummaryCard {...build()} />);
    expect(getByText('제조사 원장')).not.toBeNull();
    expect(getByText('page 1/3')).not.toBeNull();
    expect(getByText('42')).not.toBeNull();
  });

  it('shows ON when filterWriteOnly true, ALL otherwise', () => {
    const { getByText, rerender } = render(<AuditSummaryCard {...build({ filterWriteOnly: true })} />);
    expect(getByText('ON')).not.toBeNull();
    expect(getByText('writeOnly=true 적용')).not.toBeNull();
    rerender(<AuditSummaryCard {...build({ filterWriteOnly: false })} />);
    expect(getByText('ALL')).not.toBeNull();
    expect(getByText('writeOnly 조건 해제')).not.toBeNull();
  });

  it('renders activeActionLabel verbatim', () => {
    const { getByText } = render(<AuditSummaryCard {...build({ activeActionLabel: '여권 생성' })} />);
    expect(getByText('여권 생성')).not.toBeNull();
  });

  it('shows 5s when autoRefresh, Manual otherwise', () => {
    const { getByText, rerender } = render(<AuditSummaryCard {...build({ autoRefresh: true })} />);
    expect(getByText('5s')).not.toBeNull();
    rerender(<AuditSummaryCard {...build({ autoRefresh: false })} />);
    expect(getByText('Manual')).not.toBeNull();
  });

  it('shows 대기 중 when newestTimestamp is undefined', () => {
    const { getByText } = render(<AuditSummaryCard {...build({ newestTimestamp: undefined })} />);
    expect(getByText(/대기 중/)).not.toBeNull();
  });

  it('shows formatted time when newestTimestamp provided', () => {
    const { container } = render(<AuditSummaryCard {...build({ newestTimestamp: '2026-05-04T12:00:00Z' })} />);
    // formatTime → toLocaleString ko-KR; should contain a year fragment
    expect(container.textContent).toMatch(/2026/);
  });

  it('renders timeSummary.last24h and last7d', () => {
    const { getByText } = render(<AuditSummaryCard {...build({ timeSummary: { last24h: 13, last7d: 99 } })} />);
    expect(getByText('13')).not.toBeNull();
    expect(getByText('99')).not.toBeNull();
  });
});
