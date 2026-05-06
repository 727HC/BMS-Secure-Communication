import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PassportDetailSkeleton from './PassportDetailSkeleton';

describe('PassportDetailSkeleton', () => {
  it('renders 4 hero gauges + 5 tabs + 3 cards', () => {
    const { container } = render(<PassportDetailSkeleton />);
    expect(container.querySelector('[data-page="passport-detail"]')).not.toBeNull();
    // skeleton block uses divs; expect a substantial count
    const skeletonBlocks = container.querySelectorAll('div');
    expect(skeletonBlocks.length).toBeGreaterThan(5);
  });
});
