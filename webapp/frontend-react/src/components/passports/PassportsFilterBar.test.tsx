import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PassportsFilterBar from './PassportsFilterBar';

function build(overrides: Partial<ComponentProps<typeof PassportsFilterBar>> = {}) {
  return {
    searchQuery: '',
    onSearchChange: vi.fn(),
    filterStatus: '',
    onFilterStatusChange: vi.fn(),
    gbaFilter: 'all' as const,
    onGbaFilterChange: vi.fn(),
    sortBy: 'latest' as const,
    onSortByChange: vi.fn(),
    filteredCount: 25,
    hasActiveFilters: false,
    currentPage: 1,
    totalPages: 3,
    ...overrides,
  };
}

describe('PassportsFilterBar', () => {
  it('renders 3 stamps with current state', () => {
    const { getByText } = render(<PassportsFilterBar {...build({ filteredCount: 17, currentPage: 2, totalPages: 5 })} />);
    expect(getByText('검색 후보 17')).not.toBeNull();
    expect(getByText('필터 전체')).not.toBeNull();
    expect(getByText('페이지 2/5')).not.toBeNull();
  });

  it('shows 적용 stamp when hasActiveFilters', () => {
    const { getByText } = render(<PassportsFilterBar {...build({ hasActiveFilters: true })} />);
    expect(getByText('필터 적용')).not.toBeNull();
  });

  it('emits onSearchChange when input changes', () => {
    const props = build();
    const { container } = render(<PassportsFilterBar {...props} />);
    fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: 'BAT-X' } });
    expect(props.onSearchChange).toHaveBeenCalledWith('BAT-X');
  });

  it('emits onGbaFilterChange with typed value', () => {
    const props = build();
    const { container } = render(<PassportsFilterBar {...props} />);
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[1], { target: { value: 'complete' } });
    expect(props.onGbaFilterChange).toHaveBeenCalledWith('complete');
  });

  it('emits onFilterStatusChange when status select changes', () => {
    const props = build();
    const { container } = render(<PassportsFilterBar {...props} />);
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'ACTIVE' } });
    expect(props.onFilterStatusChange).toHaveBeenCalledWith('ACTIVE');
  });

  it('emits onSortByChange on sort button click', () => {
    const props = build({ sortBy: 'latest' });
    const { getByText } = render(<PassportsFilterBar {...props} />);
    fireEvent.click(getByText('보완 우선'));
    expect(props.onSortByChange).toHaveBeenCalledWith('gba');
  });

  it('marks active sort button with surface-alt background', () => {
    const { getByText } = render(<PassportsFilterBar {...build({ sortBy: 'gba' })} />);
    const active = getByText('보완 우선') as HTMLButtonElement;
    const inactive = getByText('최근 갱신') as HTMLButtonElement;
    expect(active.style.background).toContain('var(--color-surface-alt)');
    expect(inactive.style.background).toBe('none');
  });

  it('renders 3 GBA filter options (전체, 충족, 보완)', () => {
    const { container } = render(<PassportsFilterBar {...build()} />);
    const gbaSelect = container.querySelectorAll('select')[1];
    expect(gbaSelect.querySelectorAll('option').length).toBe(3);
  });
});
