import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DisposeConfirmModal from './DisposeConfirmModal';

describe('DisposeConfirmModal', () => {
  it('does not render when open=false', () => {
    render(<DisposeConfirmModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('폐기 처리 확인')).toBeNull();
  });

  it('renders title and warning copy when open', () => {
    render(<DisposeConfirmModal open submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('폐기 처리 확인')).not.toBeNull();
    expect(screen.getByText(/되돌릴 수 없습니다/)).not.toBeNull();
  });

  it('disables submit button while submitting and shows progress label', () => {
    render(<DisposeConfirmModal open submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /처리 중/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('fires onClose when 취소 clicked', () => {
    const onClose = vi.fn();
    render(<DisposeConfirmModal open submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('fires onSubmit when 폐기 확정 clicked', () => {
    const onSubmit = vi.fn();
    render(<DisposeConfirmModal open submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '폐기 확정' }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
