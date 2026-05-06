import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import Spinner from './Spinner';

describe('Spinner', () => {
  it('renders an outer flex wrapper and an inner spinning div', () => {
    const { container } = render(<Spinner />);
    const outer = container.firstChild as HTMLElement;
    expect(outer).not.toBeNull();
    expect(outer.style.display).toBe('flex');
    const inner = outer.firstChild as HTMLElement;
    expect(inner.style.borderRadius).toBe('50%');
    // default size 28
    expect(inner.style.width).toBe('28px');
    expect(inner.style.height).toBe('28px');
  });

  it('respects size prop', () => {
    const { container } = render(<Spinner size={48} />);
    const inner = container.firstChild?.firstChild as HTMLElement;
    expect(inner.style.width).toBe('48px');
    expect(inner.style.height).toBe('48px');
  });

  it('respects minHeight prop', () => {
    const { container } = render(<Spinner minHeight="200px" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.style.minHeight).toBe('200px');
  });
});
