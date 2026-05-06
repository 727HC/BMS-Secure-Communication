import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PassportsLoadingSkeleton from './PassportsLoadingSkeleton';

describe('PassportsLoadingSkeleton', () => {
  it('renders root data-page="passports" attribute', () => {
    const { container } = render(<PassportsLoadingSkeleton />);
    expect(container.querySelector('[data-page="passports"]')).not.toBeNull();
  });

  it('renders 4 info tile placeholders', () => {
    const { container } = render(<PassportsLoadingSkeleton />);
    expect(container.querySelectorAll('.sn-info-tile').length).toBe(4);
  });

  it('renders skeleton blocks (page head + tiles + table)', () => {
    const { container } = render(<PassportsLoadingSkeleton />);
    const skeletons = container.querySelectorAll('.sn-skeleton');
    // 3 (head) + 2 (section head) + 4 tiles × 2 = 13 + table cells (5×5 + 5 header = 30) = 43
    expect(skeletons.length).toBeGreaterThan(13);
  });
});
