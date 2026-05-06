import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import RecycleToggleModal from './RecycleToggleModal';

describe('RecycleToggleModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<RecycleToggleModal open={false} initialValue={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('initializes checkbox to initialValue', () => {
    const { container, rerender } = render(<RecycleToggleModal open={true} initialValue={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true);
    rerender(<RecycleToggleModal open={false} initialValue={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<RecycleToggleModal open={true} initialValue={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((container.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(false);
  });

  it('toggles checkbox state and submits boolean', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(<RecycleToggleModal open={true} initialValue={false} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);
    fireEvent.click(getByText('저장'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it('shows 저장 중... while submitting', () => {
    const { getByText } = render(<RecycleToggleModal open={true} initialValue={false} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('저장 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<RecycleToggleModal open={true} initialValue={false} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });
});
