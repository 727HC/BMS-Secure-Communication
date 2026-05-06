import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import RecyclingSummaryCard from './RecyclingSummaryCard';

function build(overrides: Partial<ComponentProps<typeof RecyclingSummaryCard>> = {}) {
  return {
    deskLabel: '재활용 데스크',
    tabCounts: { all: 100, recyclable: 30, recycling: 12, disposed: 8 },
    avgSoh: 75 as number | null,
    avgRemaining: 1200 as number | null,
    lifecycleMetrics: { lifecycleFiles: [], analysisQueue: 5, activeCandidates: 3, extractionEvidence: 7, readyRatio: 42 },
    ...overrides,
  };
}

describe('RecyclingSummaryCard', () => {
  it('renders deskLabel + GET /api/passports stamp', () => {
    const { getByText } = render(<RecyclingSummaryCard {...build()} />);
    expect(getByText('재활용 데스크')).not.toBeNull();
    expect(getByText('GET /api/passports')).not.toBeNull();
  });

  it('renders tabCounts.recyclable + recycling + disposed', () => {
    const { getByText } = render(<RecyclingSummaryCard {...build()} />);
    expect(getByText('30')).not.toBeNull();
    expect(getByText('12')).not.toBeNull();
    expect(getByText('8')).not.toBeNull();
  });

  it('renders avgSoh as N% when present, dash when null', () => {
    const { getByText, rerender, getAllByText } = render(<RecyclingSummaryCard {...build()} />);
    expect(getByText('75%')).not.toBeNull();
    rerender(<RecyclingSummaryCard {...build({ avgSoh: null, avgRemaining: null })} />);
    expect(getAllByText('-').length).toBeGreaterThanOrEqual(2);
  });

  it('formats avgRemaining with ko-KR thousands separator', () => {
    const { getByText } = render(<RecyclingSummaryCard {...build({ avgRemaining: 12345 })} />);
    expect(getByText('12,345')).not.toBeNull();
  });

  it('shows readyRatio % in 회수 준비도 lead', () => {
    const { getByText } = render(<RecyclingSummaryCard {...build({ lifecycleMetrics: { lifecycleFiles: [], analysisQueue: 0, activeCandidates: 0, extractionEvidence: 0, readyRatio: 88 } })} />);
    expect(getByText(/회수 준비율 88%/)).not.toBeNull();
  });

  it('renders extractionEvidence count', () => {
    const { getByText } = render(<RecyclingSummaryCard {...build({ lifecycleMetrics: { lifecycleFiles: [], analysisQueue: 0, activeCandidates: 0, extractionEvidence: 17, readyRatio: 0 } })} />);
    expect(getByText('17')).not.toBeNull();
  });

  it('renders 4 info tiles', () => {
    const { container } = render(<RecyclingSummaryCard {...build()} />);
    expect(container.querySelectorAll('.sn-info-tile').length).toBe(4);
  });
});
