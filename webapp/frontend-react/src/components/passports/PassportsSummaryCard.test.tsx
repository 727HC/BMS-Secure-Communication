import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PassportsSummaryCard from './PassportsSummaryCard';

function build(overrides: Partial<ComponentProps<typeof PassportsSummaryCard>> = {}) {
  return {
    registerScopeLabel: '제조사 등록부',
    totalCount: 42,
    activeCount: 30,
    maintenanceCount: 5,
    endOfLifeCount: 7,
    avgGba: 76,
    reviewReadyCount: 18,
    vinPendingCount: 4,
    ...overrides,
  };
}

describe('PassportsSummaryCard', () => {
  it('renders register scope label', () => {
    const { getByText } = render(<PassportsSummaryCard {...build()} />);
    expect(getByText('제조사 등록부')).not.toBeNull();
  });

  it('renders 4 KPI counts (total, active, maintenance, eol)', () => {
    const { getByText } = render(<PassportsSummaryCard {...build()} />);
    expect(getByText('42')).not.toBeNull();
    expect(getByText('30')).not.toBeNull();
    expect(getByText('5')).not.toBeNull();
    expect(getByText('7')).not.toBeNull();
  });

  it('renders avgGba value (number) with % unit suffix span', () => {
    const { container } = render(<PassportsSummaryCard {...build({ avgGba: 88 })} />);
    expect(container.textContent).toContain('88');
    expect(container.querySelector('.sn-metric-unit')?.textContent).toBe('%');
  });

  it('renders reviewReadyCount in summary grid', () => {
    const { getByText } = render(<PassportsSummaryCard {...build({ reviewReadyCount: 99 })} />);
    expect(getByText('99')).not.toBeNull();
  });

  it('renders bottom stamp row with vinPending / GBA avg / review ready', () => {
    const { getByText } = render(<PassportsSummaryCard {...build({ vinPendingCount: 11, avgGba: 73, reviewReadyCount: 21 })} />);
    expect(getByText('VIN 대기 11')).not.toBeNull();
    expect(getByText('GBA 평균 73%')).not.toBeNull();
    expect(getByText('검토 가능 21')).not.toBeNull();
  });

  it('renders 4 info tiles', () => {
    const { container } = render(<PassportsSummaryCard {...build()} />);
    expect(container.querySelectorAll('.sn-info-tile').length).toBe(4);
  });
});
