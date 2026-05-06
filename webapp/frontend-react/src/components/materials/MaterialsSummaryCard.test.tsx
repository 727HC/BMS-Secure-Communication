import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MaterialsSummaryCard from './MaterialsSummaryCard';

function build(overrides: Partial<ComponentProps<typeof MaterialsSummaryCard>> = {}) {
  return {
    filteredCount: 25,
    certifiedCount: 18,
    certifiedRatio: 72,
    originUniqueCount: 6,
    ...overrides,
  };
}

describe('MaterialsSummaryCard', () => {
  it('renders 3 KPI counts', () => {
    const { getByText } = render(<MaterialsSummaryCard {...build()} />);
    expect(getByText('25')).not.toBeNull();
    expect(getByText('18')).not.toBeNull();
    expect(getByText('6')).not.toBeNull();
  });

  it('renders certifiedRatio percentage label', () => {
    const { getByText } = render(<MaterialsSummaryCard {...build({ certifiedRatio: 88 })} />);
    expect(getByText('88%')).not.toBeNull();
  });

  it('sets progress bar width to certifiedRatio %', () => {
    const { container } = render(<MaterialsSummaryCard {...build({ certifiedRatio: 33 })} />);
    const bar = container.querySelector('.sn-info-tile div div div') as HTMLElement;
    expect(bar.style.width).toBe('33%');
  });

  it('renders 3 info tiles', () => {
    const { container } = render(<MaterialsSummaryCard {...build()} />);
    expect(container.querySelectorAll('.sn-info-tile').length).toBe(3);
  });

  it('renders 0% when certifiedRatio=0', () => {
    const { getByText } = render(<MaterialsSummaryCard {...build({ certifiedRatio: 0 })} />);
    expect(getByText('0%')).not.toBeNull();
  });
});
