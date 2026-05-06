import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import BmuSearchPanel from './BmuSearchPanel';

function build(overrides: Partial<ComponentProps<typeof BmuSearchPanel>> = {}) {
  return {
    passportId: 'P1',
    onPassportIdChange: vi.fn(),
    onSearch: vi.fn(),
    loading: false,
    autoRefresh: false,
    countdown: 10,
    requestPathLabel: 'GET /api/realtime/bmu/P1',
    lastFetchedAt: null as Date | null,
    ...overrides,
  };
}

describe('BmuSearchPanel', () => {
  it('shows Manual pull stamp when autoRefresh=false', () => {
    const { getByText } = render(<BmuSearchPanel {...build()} />);
    expect(getByText('Manual pull')).not.toBeNull();
    expect(getByText('수동 갱신')).not.toBeNull();
  });

  it('shows Live · Ns stamp when autoRefresh=true', () => {
    const { getByText } = render(<BmuSearchPanel {...build({ autoRefresh: true, countdown: 7 })} />);
    expect(getByText('Live · 7s')).not.toBeNull();
    expect(getByText('10초 자동 갱신')).not.toBeNull();
  });

  it('emits onPassportIdChange when input changes', () => {
    const props = build();
    const { container } = render(<BmuSearchPanel {...props} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'P2' } });
    expect(props.onPassportIdChange).toHaveBeenCalledWith('P2');
  });

  it('emits onSearch on Enter key in input', () => {
    const props = build();
    const { container } = render(<BmuSearchPanel {...props} />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.keyUp(input, { key: 'Enter' });
    expect(props.onSearch).toHaveBeenCalled();
  });

  it('does not emit onSearch on non-Enter keys', () => {
    const props = build();
    const { container } = render(<BmuSearchPanel {...props} />);
    fireEvent.keyUp(container.querySelector('input') as HTMLInputElement, { key: 'a' });
    expect(props.onSearch).not.toHaveBeenCalled();
  });

  it('emits onSearch on button click when enabled', () => {
    const props = build();
    const { getByText } = render(<BmuSearchPanel {...props} />);
    fireEvent.click(getByText('Live data 조회'));
    expect(props.onSearch).toHaveBeenCalled();
  });

  it('disables button when passportId is empty/whitespace', () => {
    const { getByText } = render(<BmuSearchPanel {...build({ passportId: '   ' })} />);
    expect((getByText('Live data 조회') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows loading label and disables button when loading', () => {
    const { getByText } = render(<BmuSearchPanel {...build({ loading: true })} />);
    const btn = getByText('조회 중...') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows 대기 중 when lastFetchedAt is null', () => {
    const { getByText } = render(<BmuSearchPanel {...build()} />);
    expect(getByText(/최근 조회 대기 중/)).not.toBeNull();
  });

  it('shows formatted time when lastFetchedAt is a Date', () => {
    const { container } = render(<BmuSearchPanel {...build({ lastFetchedAt: new Date('2026-05-04T03:14:15Z') })} />);
    // "최근 조회 03:14:15" or with locale variation; just assert non-empty time string
    expect(container.textContent).toMatch(/최근 조회 [^대]/);
  });

  it('renders requestPathLabel verbatim', () => {
    const { getByText } = render(<BmuSearchPanel {...build({ requestPathLabel: 'GET /api/realtime/bmu/X' })} />);
    expect(getByText('GET /api/realtime/bmu/X')).not.toBeNull();
  });
});
