import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import DisposeModal from './DisposeModal';

describe('DisposeModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<DisposeModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title, warning, and buttons', () => {
    const { getByText } = render(<DisposeModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(getByText('폐기 처리 확인')).not.toBeNull();
    expect(getByText(/되돌릴 수 없습니다/)).not.toBeNull();
    expect(getByText('취소')).not.toBeNull();
    expect(getByText('폐기 확정')).not.toBeNull();
  });

  it('emits onSubmit on 폐기 확정 click', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<DisposeModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('폐기 확정'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<DisposeModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows 처리 중... and disables submit while submitting', () => {
    const { getByText } = render(<DisposeModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const btn = getByText('처리 중...') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
