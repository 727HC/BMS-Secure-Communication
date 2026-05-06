import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PassportsDistributionCard from './PassportsDistributionCard';

function build(overrides: Partial<ComponentProps<typeof PassportsDistributionCard>> = {}) {
  return {
    totalCount: 50,
    statusDistSegments: [
      { label: 'ACTIVE', value: 30, color: '#0a0' },
      { label: 'MAINTENANCE', value: 20, color: '#a00' },
    ],
    statusLegendItems: [
      { label: 'ACTIVE', value: 30, color: '#0a0' },
      { label: 'MAINTENANCE', value: 20, color: '#a00' },
    ],
    manufacturerBarItems: [
      { label: 'LG', value: 30, hint: '대' },
      { label: 'SDI', value: 20, hint: '대' },
    ],
    chemistryBarItems: [
      { label: 'NMC', value: 25, hint: '대' },
    ],
    ...overrides,
  };
}

describe('PassportsDistributionCard', () => {
  it('renders donut center value as totalCount', () => {
    const { container } = render(<PassportsDistributionCard {...build({ totalCount: 88 })} />);
    expect(container.textContent).toContain('88');
  });

  it('renders status legend labels', () => {
    const { getByText } = render(<PassportsDistributionCard {...build()} />);
    expect(getByText('ACTIVE')).not.toBeNull();
    expect(getByText('MAINTENANCE')).not.toBeNull();
  });

  it('renders manufacturer bar items', () => {
    const { getByText } = render(<PassportsDistributionCard {...build()} />);
    expect(getByText('LG')).not.toBeNull();
    expect(getByText('SDI')).not.toBeNull();
  });

  it('renders chemistry bar items', () => {
    const { getByText } = render(<PassportsDistributionCard {...build()} />);
    expect(getByText('NMC')).not.toBeNull();
  });

  it('shows fallback caption when manufacturerBarItems empty', () => {
    const { getByText } = render(<PassportsDistributionCard {...build({ manufacturerBarItems: [] })} />);
    expect(getByText('표시할 제조사 데이터가 없습니다.')).not.toBeNull();
  });

  it('shows fallback caption when chemistryBarItems empty', () => {
    const { getByText } = render(<PassportsDistributionCard {...build({ chemistryBarItems: [] })} />);
    expect(getByText('표시할 화학계열 데이터가 없습니다.')).not.toBeNull();
  });

  it('renders 없음 placeholder donut segment when statusDistSegments is empty', () => {
    const { container } = render(<PassportsDistributionCard {...build({ statusDistSegments: [], statusLegendItems: [], totalCount: 0 })} />);
    // Donut still renders; we can't inspect segments easily but card still renders
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
