import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import VcApproveModal from './VcApproveModal';

describe('VcApproveModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<VcApproveModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('disables 승인 button when requestId is empty/whitespace', () => {
    const { getByText, getByPlaceholderText } = render(<VcApproveModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('승인') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('승인할 요청 ID'), { target: { value: '   ' } });
    expect((getByText('승인') as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables 승인 once requestId is non-empty and emits onSubmit', () => {
    const onSubmit = vi.fn();
    const { getByText, getByPlaceholderText } = render(<VcApproveModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('승인할 요청 ID'), { target: { value: 'REQ-1' } });
    expect((getByText('승인') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(getByText('승인'));
    expect(onSubmit).toHaveBeenCalledWith({ requestId: 'REQ-1' });
  });

  it('shows 처리 중... and disables submit while submitting', () => {
    const { getByText, getByPlaceholderText } = render(<VcApproveModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('승인할 요청 ID'), { target: { value: 'X' } });
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
