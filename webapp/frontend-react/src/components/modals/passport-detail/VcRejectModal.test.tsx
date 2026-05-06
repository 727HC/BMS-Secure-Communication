import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import VcRejectModal from './VcRejectModal';

describe('VcRejectModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<VcRejectModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('disables 거부 button when either field is empty', () => {
    const { getByText, getByPlaceholderText } = render(<VcRejectModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('거부') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('거부할 요청 ID'), { target: { value: 'REQ-1' } });
    // still disabled — reason missing
    expect((getByText('거부') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('거부 사유'), { target: { value: '검토 미완료' } });
    expect((getByText('거부') as HTMLButtonElement).disabled).toBe(false);
  });

  it('emits onSubmit with both fields when 거부 clicked', () => {
    const onSubmit = vi.fn();
    const { getByText, getByPlaceholderText } = render(<VcRejectModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('거부할 요청 ID'), { target: { value: 'REQ-2' } });
    fireEvent.change(getByPlaceholderText('거부 사유'), { target: { value: '서류 부족' } });
    fireEvent.click(getByText('거부'));
    expect(onSubmit).toHaveBeenCalledWith({ requestId: 'REQ-2', reason: '서류 부족' });
  });

  it('shows 처리 중... while submitting', () => {
    const { getByText, getByPlaceholderText } = render(<VcRejectModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('거부할 요청 ID'), { target: { value: 'X' } });
    fireEvent.change(getByPlaceholderText('거부 사유'), { target: { value: 'Y' } });
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
