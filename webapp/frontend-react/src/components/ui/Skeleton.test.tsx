import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonRows, SkeletonTable } from './Skeleton';

describe('Skeleton', () => {
  it('renders a span with sn-skeleton class', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('.sn-skeleton') as HTMLSpanElement;
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('SPAN');
  });

  it('applies width/height/radius via inline style', () => {
    const { container } = render(<Skeleton width={120} height={20} radius={4} />);
    const el = container.querySelector('.sn-skeleton') as HTMLSpanElement;
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('20px');
    expect(el.style.borderRadius).toBe('4px');
  });

  it('passes string units through', () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);
    const el = container.querySelector('.sn-skeleton') as HTMLSpanElement;
    expect(el.style.width).toBe('50%');
    expect(el.style.height).toBe('2rem');
  });
});

describe('SkeletonRows', () => {
  it('renders the requested number of skeleton rows', () => {
    const { container } = render(<SkeletonRows rows={5} />);
    const els = container.querySelectorAll('.sn-skeleton');
    expect(els.length).toBe(5);
  });

  it('shrinks the last row to 72% width', () => {
    const { container } = render(<SkeletonRows rows={3} />);
    const els = container.querySelectorAll('.sn-skeleton');
    const last = els[els.length - 1] as HTMLElement;
    expect(last.style.width).toBe('72%');
  });
});

describe('SkeletonCard', () => {
  it('renders title + lines by default (showTitle=true → 1 + lines skeletons)', () => {
    const { container } = render(<SkeletonCard lines={3} />);
    // 1 title + 3 rows = 4
    expect(container.querySelectorAll('.sn-skeleton').length).toBe(4);
  });

  it('omits title when showTitle=false', () => {
    const { container } = render(<SkeletonCard lines={2} showTitle={false} />);
    expect(container.querySelectorAll('.sn-skeleton').length).toBe(2);
  });
});

describe('SkeletonTable', () => {
  it('renders cols header + rows × cols body skeletons', () => {
    const { container } = render(<SkeletonTable rows={4} cols={3} />);
    // header: 3, body: 4 * 3 = 12, total 15
    expect(container.querySelectorAll('.sn-skeleton').length).toBe(15);
  });

  it('default rows=5, cols=4 → 4 + 20 = 24 skeletons', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.querySelectorAll('.sn-skeleton').length).toBe(24);
  });
});
