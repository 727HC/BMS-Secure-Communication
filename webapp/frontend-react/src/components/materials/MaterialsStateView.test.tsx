import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaterialsStateView from './MaterialsStateView';

function build(overrides: Partial<ComponentProps<typeof MaterialsStateView>> = {}) {
  return {
    loading: false,
    filteredCount: 0,
    hasSearch: false,
    isManufacturer: false,
    onCreateClick: vi.fn(),
    ...overrides,
  };
}

describe('MaterialsStateView', () => {
  it('renders skeleton blocks when loading=true', () => {
    const { container } = render(<MaterialsStateView {...build({ loading: true })} />);
    expect(container.querySelectorAll('.sn-skeleton').length).toBeGreaterThan(0);
  });

  it('renders search-fail copy when filteredCount=0 + hasSearch=true', () => {
    const { getByText } = render(<MaterialsStateView {...build({ hasSearch: true })} />);
    expect(getByText('검색 조건에 맞는 공급망 파일이 없습니다.')).not.toBeNull();
    expect(getByText(/자재 ID, 소재명/)).not.toBeNull();
  });

  it('renders no-files copy when filteredCount=0 + no search', () => {
    const { getByText } = render(<MaterialsStateView {...build()} />);
    expect(getByText('등재된 공급망 파일이 없습니다.')).not.toBeNull();
    expect(getByText(/Manufacturer 조직에서/)).not.toBeNull();
  });

  it('shows 공급망 자재 등재 button only when isManufacturer + filteredCount=0', () => {
    const { queryByText, rerender } = render(<MaterialsStateView {...build({ isManufacturer: true })} />);
    expect(queryByText('공급망 자재 등재')).not.toBeNull();
    rerender(<MaterialsStateView {...build({ isManufacturer: false })} />);
    expect(queryByText('공급망 자재 등재')).toBeNull();
  });

  it('emits onCreateClick when 등재 button clicked', () => {
    const props = build({ isManufacturer: true });
    const { getByText } = render(<MaterialsStateView {...props} />);
    fireEvent.click(getByText('공급망 자재 등재'));
    expect(props.onCreateClick).toHaveBeenCalled();
  });

  it('returns null when not loading + records present', () => {
    const { container } = render(<MaterialsStateView {...build({ filteredCount: 5 })} />);
    expect(container.firstChild).toBeNull();
  });

  it('skips empty panel even with hasSearch when records present', () => {
    const { queryByText } = render(<MaterialsStateView {...build({ filteredCount: 3, hasSearch: true })} />);
    expect(queryByText(/없습니다/)).toBeNull();
  });
});
