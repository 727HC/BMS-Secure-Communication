import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import VcRevokeModal from './VcRevokeModal';

describe('VcRevokeModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<VcRevokeModal open={false} submitting={false} credentialId="VC-1" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders credentialId in caption', () => {
    const { getByText } = render(<VcRevokeModal open={true} submitting={false} credentialId="VC-X" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(getByText('VC-X')).not.toBeNull();
  });

  it('disables 폐기 확정 when reason is empty', () => {
    const { getByText } = render(<VcRevokeModal open={true} submitting={false} credentialId="VC-1" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('폐기 확정') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onSubmit with reason on form submit', () => {
    const onSubmit = vi.fn();
    const { getByPlaceholderText, container } = render(<VcRevokeModal open={true} submitting={false} credentialId="VC-1" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('예: 정보 오류, 기간 만료 등'), { target: { value: '데이터 오류' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalledWith({ reason: '데이터 오류' });
  });

  it('resets reason state when modal reopens', () => {
    const { rerender, getByPlaceholderText } = render(<VcRevokeModal open={true} submitting={false} credentialId="VC-1" onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('예: 정보 오류, 기간 만료 등'), { target: { value: '사유 A' } });
    rerender(<VcRevokeModal open={false} submitting={false} credentialId="VC-1" onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<VcRevokeModal open={true} submitting={false} credentialId="VC-1" onClose={vi.fn()} onSubmit={vi.fn()} />);
    const input = getByPlaceholderText('예: 정보 오류, 기간 만료 등') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<VcRevokeModal open={true} submitting={false} credentialId="VC-1" onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });
});
