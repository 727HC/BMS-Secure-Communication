import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PassportCreateModal from './PassportCreateModal';

describe('PassportCreateModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<PassportCreateModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('auto-generates passportId + batteryId with timestamp', () => {
    const { container } = render(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const inputs = container.querySelectorAll('input.sn-input') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].value).toMatch(/^PASSPORT-\d+$/);
    expect(inputs[1].value).toMatch(/^BATTERY-\d+$/);
  });

  it('disables 여권 발급 until 4 required fields all filled', () => {
    const { getByText, getByPlaceholderText } = render(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    // Initially passportId + batteryId are auto-filled, but serialNumber + did are empty
    expect((getByText('여권 발급') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('예: BMU-DEVICE-001'), { target: { value: 'SN1' } });
    expect((getByText('여권 발급') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('예: did:sov:abc123'), { target: { value: 'did:sov:x' } });
    expect((getByText('여권 발급') as HTMLButtonElement).disabled).toBe(false);
  });

  it('toggles 상세 사양 panel via button', () => {
    const { getByText, queryByText } = render(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(queryByText('− 상세 사양 닫기')).toBeNull();
    fireEvent.click(getByText('+ 상세 사양 입력 (GBA 필드)'));
    expect(getByText('− 상세 사양 닫기')).not.toBeNull();
    expect(getByText('제조국')).not.toBeNull();
    fireEvent.click(getByText('− 상세 사양 닫기'));
    expect(queryByText('제조국')).toBeNull();
  });

  it('submits trimmed form data on form submit', () => {
    const onSubmit = vi.fn();
    const { container, getByPlaceholderText } = render(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('예: BMU-DEVICE-001'), { target: { value: '  SN1  ' } });
    fireEvent.change(getByPlaceholderText('예: did:sov:abc123'), { target: { value: '  did:x  ' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalled();
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.serialNumber).toBe('SN1');
    expect(arg.did).toBe('did:x');
  });

  it('renders chemistry options including 기타 and cell type options when expanded', () => {
    const { getByText, container } = render(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('+ 상세 사양 입력 (GBA 필드)'));
    const options = container.querySelectorAll('option');
    // 2 selects × placeholder + 7 chemistry + 3 celltype = 2 + 7 + 3 = 12
    expect(options.length).toBe(12);
  });

  it('shows 발급 중... while submitting', () => {
    const { getByText, getByPlaceholderText } = render(<PassportCreateModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('예: BMU-DEVICE-001'), { target: { value: 'X' } });
    fireEvent.change(getByPlaceholderText('예: did:sov:abc123'), { target: { value: 'X' } });
    expect((getByText('발급 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<PassportCreateModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });

  it('resets form + collapses details when modal reopens', () => {
    const { getByText, queryByText, rerender } = render(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('+ 상세 사양 입력 (GBA 필드)'));
    expect(getByText('− 상세 사양 닫기')).not.toBeNull();
    rerender(<PassportCreateModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<PassportCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(queryByText('− 상세 사양 닫기')).toBeNull();
  });
});
