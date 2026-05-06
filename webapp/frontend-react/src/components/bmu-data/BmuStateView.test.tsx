import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BmuStateView from './BmuStateView';

function build(overrides: Partial<ComponentProps<typeof BmuStateView>> = {}) {
  return {
    loading: false,
    autoRefresh: false,
    hasSearched: false,
    errorMsg: null as string | null,
    accessDenied: false,
    recordsCount: 0,
    ...overrides,
  };
}

describe('BmuStateView', () => {
  it('renders skeleton block when loading=true and autoRefresh=false', () => {
    const { container } = render(<BmuStateView {...build({ loading: true, autoRefresh: false })} />);
    const skeletons = container.querySelectorAll('.sn-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('returns null while loading + autoRefresh (no skeleton flicker)', () => {
    const { container } = render(<BmuStateView {...build({ loading: true, autoRefresh: true })} />);
    expect(container.querySelector('.sn-skeleton')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('renders empty initial state when never searched + not loading', () => {
    const { getByText } = render(<BmuStateView {...build({ hasSearched: false })} />);
    expect(getByText('여권 ID를 입력하여 데이터를 조회하세요')).not.toBeNull();
    expect(getByText('물리적 이력 검증')).not.toBeNull();
  });

  it('renders access-denied panel when searched + errorMsg + accessDenied', () => {
    const { getByText } = render(
      <BmuStateView {...build({ hasSearched: true, errorMsg: 'forbidden', accessDenied: true })} />,
    );
    expect(getByText('현재 계정으로는 이 여권의 BMU 기록을 열 수 없습니다')).not.toBeNull();
    expect(getByText(/현재 메시지: forbidden/)).not.toBeNull();
  });

  it('renders empty-result panel when searched + 0 records (no error)', () => {
    const { getByText } = render(
      <BmuStateView {...build({ hasSearched: true, recordsCount: 0 })} />,
    );
    expect(getByText('데이터가 없습니다')).not.toBeNull();
  });

  it('returns null when searched + has records (delegates to record table)', () => {
    const { container } = render(
      <BmuStateView {...build({ hasSearched: true, recordsCount: 5 })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('error path takes priority over empty-result path when accessDenied=true', () => {
    const { getByText, queryByText } = render(
      <BmuStateView {...build({ hasSearched: true, errorMsg: 'denied', accessDenied: true, recordsCount: 0 })} />,
    );
    expect(getByText(/계정으로는/)).not.toBeNull();
    expect(queryByText('데이터가 없습니다')).toBeNull();
  });

  it('errorMsg without accessDenied falls through to empty-result panel', () => {
    const { getByText, queryByText } = render(
      <BmuStateView {...build({ hasSearched: true, errorMsg: 'transient', accessDenied: false, recordsCount: 0 })} />,
    );
    expect(getByText('데이터가 없습니다')).not.toBeNull();
    expect(queryByText(/계정으로는/)).toBeNull();
  });
});
