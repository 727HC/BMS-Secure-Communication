import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import PageHead from './PageHead';

describe('PageHead', () => {
  it('renders title only with minimal props', () => {
    const { container, getByText } = render(<PageHead title="대시보드" />);
    expect(getByText('대시보드')).not.toBeNull();
    expect(container.querySelector('.sn-eyebrow')).toBeNull();
    expect(container.querySelector('.sn-page-subtitle')).toBeNull();
    expect(container.querySelector('.sn-page-actions')).toBeNull();
  });

  it('renders eyebrow when provided', () => {
    const { getByText, container } = render(<PageHead eyebrow="섹션" title="대시보드" />);
    expect(getByText('섹션')).not.toBeNull();
    expect(container.querySelector('.sn-eyebrow')).not.toBeNull();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(<PageHead title="대시보드" subtitle="실시간 모니터링" />);
    expect(getByText('실시간 모니터링')).not.toBeNull();
  });

  it('renders actions slot when provided', () => {
    const { container, getByText } = render(<PageHead title="X" actions={<button>새로고침</button>} />);
    expect(container.querySelector('.sn-page-actions')).not.toBeNull();
    expect(getByText('새로고침')).not.toBeNull();
  });

  it('renders subtitle as ReactNode (allows JSX)', () => {
    const { getByText } = render(<PageHead title="X" subtitle={<span data-testid="sub">JSX</span>} />);
    expect(getByText('JSX')).not.toBeNull();
  });
});
