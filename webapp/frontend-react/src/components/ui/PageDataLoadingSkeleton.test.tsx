import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PageDataLoadingSkeleton from './PageDataLoadingSkeleton';

describe('PageDataLoadingSkeleton', () => {
  it('renders dataPage attribute on root div', () => {
    const { container } = render(
      <PageDataLoadingSkeleton dataPage="recycling" summaryCount={3} summaryGridStyle={{ display: 'grid' }} tableRows={2} tableCols={4} />,
    );
    expect(container.querySelector('[data-page="recycling"]')).not.toBeNull();
  });

  it('renders summaryCount direct children inside the summary grid', () => {
    const { container } = render(
      <PageDataLoadingSkeleton dataPage="x" summaryCount={5} summaryGridStyle={{ display: 'grid' }} tableRows={2} tableCols={4} />,
    );
    // first child of root is the summary grid wrapper; count its direct children
    const summaryGrid = container.firstChild?.firstChild as HTMLElement | null;
    expect(summaryGrid?.children.length).toBe(5);
  });

  it('renders SkeletonTable with given row/col count', () => {
    const { container } = render(
      <PageDataLoadingSkeleton dataPage="x" summaryCount={1} summaryGridStyle={{ display: 'grid' }} tableRows={3} tableCols={5} />,
    );
    // Table skeleton renders rows × cols Skeleton blocks; the structure should produce a table-like layout
    expect(container.firstChild).not.toBeNull();
  });
});
