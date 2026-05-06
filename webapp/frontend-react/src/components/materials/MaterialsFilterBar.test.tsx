import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaterialsFilterBar from './MaterialsFilterBar';

function build(overrides: Partial<ComponentProps<typeof MaterialsFilterBar>> = {}) {
  return {
    searchQuery: '',
    onSearchChange: vi.fn(),
    filteredCount: 12,
    hasSearch: false,
    currentPage: 1,
    totalPages: 2,
    ...overrides,
  };
}

describe('MaterialsFilterBar', () => {
  it('renders 검색 후보 + 검색 + 페이지 stamps', () => {
    const { getByText } = render(<MaterialsFilterBar {...build({ filteredCount: 7, currentPage: 2, totalPages: 5 })} />);
    expect(getByText('검색 후보 7')).not.toBeNull();
    expect(getByText('검색 전체')).not.toBeNull();
    expect(getByText('페이지 2/5')).not.toBeNull();
  });

  it('shows 적용 stamp when hasSearch=true', () => {
    const { getByText } = render(<MaterialsFilterBar {...build({ hasSearch: true })} />);
    expect(getByText('검색 적용')).not.toBeNull();
  });

  it('emits onSearchChange when input changes', () => {
    const props = build();
    const { container } = render(<MaterialsFilterBar {...props} />);
    fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: 'Li-NMC' } });
    expect(props.onSearchChange).toHaveBeenCalledWith('Li-NMC');
  });

  it('reflects searchQuery prop in input value', () => {
    const { container } = render(<MaterialsFilterBar {...build({ searchQuery: 'CoO' })} />);
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('CoO');
  });
});
