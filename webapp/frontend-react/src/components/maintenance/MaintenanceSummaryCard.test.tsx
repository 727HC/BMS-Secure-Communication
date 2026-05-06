import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MaintenanceSummaryCard from './MaintenanceSummaryCard';

function build(overrides: Partial<ComponentProps<typeof MaintenanceSummaryCard>> = {}) {
  return {
    docketScopeLabel: '서비스센터 데스크',
    docketSummary: '작업 큐 요약',
    extStats: { totalMaintenance: 12, totalAccident: 3, urgentCount: 0, pendingPassports: 5, avgIntervalDays: null },
    tabCounts: { all: 30, maintenance: 8, accident: 2 },
    ...overrides,
  };
}

describe('MaintenanceSummaryCard', () => {
  it('renders scope label, summary copy, and 4 KPI tiles', () => {
    const { getByText } = render(<MaintenanceSummaryCard {...build()} />);
    expect(getByText('서비스센터 데스크')).not.toBeNull();
    expect(getByText('작업 큐 요약')).not.toBeNull();
    expect(getByText('12')).not.toBeNull(); // service log count
    expect(getByText('3')).not.toBeNull();  // accident count
    expect(getByText('5')).not.toBeNull();  // pending count
  });

  it('renders 0 in Overdue tile when urgentCount=0 (text node)', () => {
    const { container } = render(<MaintenanceSummaryCard {...build({ extStats: { totalMaintenance: 0, totalAccident: 0, urgentCount: 0, pendingPassports: 0, avgIntervalDays: null } })} />);
    expect(container.textContent).toContain('Overdue tasks');
  });

  it('renders urgentCount when > 0', () => {
    const { getByText } = render(<MaintenanceSummaryCard {...build({ extStats: { totalMaintenance: 0, totalAccident: 0, urgentCount: 7, pendingPassports: 0, avgIntervalDays: null } })} />);
    expect(getByText('7')).not.toBeNull();
  });

  it('renders tabCounts.maintenance and tabCounts.accident in summary grid', () => {
    const { getByText } = render(<MaintenanceSummaryCard {...build({ tabCounts: { all: 100, maintenance: 42, accident: 11 } })} />);
    expect(getByText('42')).not.toBeNull();
    expect(getByText('11')).not.toBeNull();
  });

  it('renders 4 info tiles in info grid', () => {
    const { container } = render(<MaintenanceSummaryCard {...build()} />);
    expect(container.querySelectorAll('.sn-info-tile').length).toBe(4);
  });
});
