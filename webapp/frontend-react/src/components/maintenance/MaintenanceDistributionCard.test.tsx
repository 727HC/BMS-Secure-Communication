import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MaintenanceDistributionCard from './MaintenanceDistributionCard';

function build(overrides: Partial<ComponentProps<typeof MaintenanceDistributionCard>> = {}) {
  return {
    donutSegments: [
      { label: '정비', value: 8, color: '#0a0' },
      { label: '사고', value: 2, color: '#a00' },
    ],
    donutTotal: 10,
    maintenanceTypeBreakdown: [
      { label: '배터리 교체', value: 5, hint: '건' },
      { label: '커넥터 점검', value: 3, hint: '건' },
    ],
    avgIntervalDays: null as number | null,
    ...overrides,
  };
}

describe('MaintenanceDistributionCard', () => {
  it('renders donut center value (donutTotal as string)', () => {
    const { container } = render(<MaintenanceDistributionCard {...build({ donutTotal: 99 })} />);
    expect(container.textContent).toContain('99');
  });

  it('renders donut legend labels', () => {
    const { getByText } = render(<MaintenanceDistributionCard {...build()} />);
    expect(getByText('정비')).not.toBeNull();
    expect(getByText('사고')).not.toBeNull();
  });

  it('renders BarRows entries from maintenanceTypeBreakdown', () => {
    const { getByText } = render(<MaintenanceDistributionCard {...build()} />);
    expect(getByText('배터리 교체')).not.toBeNull();
    expect(getByText('커넥터 점검')).not.toBeNull();
  });

  it('omits avg interval panel when avgIntervalDays is null', () => {
    const { queryByText } = render(<MaintenanceDistributionCard {...build({ avgIntervalDays: null })} />);
    expect(queryByText(/Average service interval/)).toBeNull();
  });

  it('renders avg interval panel with N일 when avgIntervalDays is a number', () => {
    const { getByText } = render(<MaintenanceDistributionCard {...build({ avgIntervalDays: 42 })} />);
    expect(getByText('Average service interval')).not.toBeNull();
    expect(getByText('42일')).not.toBeNull();
  });

  it('renders 0일 (not null) when avgIntervalDays is 0', () => {
    const { getByText } = render(<MaintenanceDistributionCard {...build({ avgIntervalDays: 0 })} />);
    expect(getByText('0일')).not.toBeNull();
  });
});
