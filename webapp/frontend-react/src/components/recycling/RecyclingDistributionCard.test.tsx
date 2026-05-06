import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import RecyclingDistributionCard from './RecyclingDistributionCard';

function build(overrides: Partial<ComponentProps<typeof RecyclingDistributionCard>> = {}) {
  return {
    lifecycleBreakdown: [
      { label: '회수 가능', value: 12, color: '#0a0' },
      { label: '재활용 진행', value: 5, color: '#aa0' },
      { label: '폐기', value: 3, color: '#a00' },
    ],
    avgRates: [
      { element: 'Li', avg: 80 },
      { element: 'Co', avg: 65 },
    ],
    ...overrides,
  };
}

describe('RecyclingDistributionCard', () => {
  it('renders lifecycle bar labels', () => {
    const { getByText } = render(<RecyclingDistributionCard {...build()} />);
    expect(getByText('회수 가능')).not.toBeNull();
    expect(getByText('재활용 진행')).not.toBeNull();
    expect(getByText('폐기')).not.toBeNull();
  });

  it('renders 회수 단계 분포 heading', () => {
    const { getByText } = render(<RecyclingDistributionCard {...build()} />);
    expect(getByText('회수 단계 분포')).not.toBeNull();
  });

  it('renders avg rate element labels with % hint when avgRates non-empty', () => {
    const { getByText, getAllByText } = render(<RecyclingDistributionCard {...build()} />);
    expect(getByText('Li')).not.toBeNull();
    expect(getByText('Co')).not.toBeNull();
    expect(getAllByText('%').length).toBeGreaterThanOrEqual(2);
    expect(getByText('원소별 평균 회수율')).not.toBeNull();
  });

  it('omits avg rate section when avgRates is empty', () => {
    const { queryByText } = render(<RecyclingDistributionCard {...build({ avgRates: [] })} />);
    expect(queryByText('원소별 평균 회수율')).toBeNull();
  });

  it('renders only one section when avgRates is empty', () => {
    const { container } = render(<RecyclingDistributionCard {...build({ avgRates: [] })} />);
    expect(container.querySelectorAll('.sn-section-card').length).toBe(1);
  });

  it('renders two sections when avgRates is non-empty', () => {
    const { container } = render(<RecyclingDistributionCard {...build()} />);
    expect(container.querySelectorAll('.sn-section-card').length).toBe(2);
  });
});
