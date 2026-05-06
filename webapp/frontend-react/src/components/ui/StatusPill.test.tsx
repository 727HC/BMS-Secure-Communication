import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import StatusPill from './StatusPill';

describe('StatusPill', () => {
  it('renders Korean label for known status', () => {
    const { getByText } = render(<StatusPill status="ACTIVE" />);
    expect(getByText('운행중')).not.toBeNull();
  });

  it('falls back to DISPOSED label when status is undefined', () => {
    const { getByText } = render(<StatusPill />);
    expect(getByText('폐기')).not.toBeNull();
  });

  it('falls back to DISPOSED label for unknown status', () => {
    const { getByText } = render(<StatusPill status="UNKNOWN" />);
    expect(getByText('폐기')).not.toBeNull();
  });

  it('renders an indicator dot before the label', () => {
    const { container } = render(<StatusPill status="ACTIVE" />);
    // The pill has nested span: outer pill > [dot, label text]
    const outer = container.querySelector('span');
    expect(outer).not.toBeNull();
    const dot = outer?.querySelector('span');
    expect(dot).not.toBeNull();
    expect((dot as HTMLElement).style.borderRadius).toBe('50%');
  });
});
