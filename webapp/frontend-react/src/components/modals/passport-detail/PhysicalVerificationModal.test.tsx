import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import PhysicalVerificationModal from './PhysicalVerificationModal';

describe('PhysicalVerificationModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<PhysicalVerificationModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 4 checkboxes (initially all checked) + textarea', () => {
    const { container, getByPlaceholderText } = render(<PhysicalVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    expect(checkboxes.length).toBe(4);
    checkboxes.forEach((c) => expect(c.checked).toBe(true));
    expect(getByPlaceholderText('검증 근거를 입력하세요')).not.toBeNull();
  });

  it('disables 검증 저장 until reason entered', () => {
    const { getByText, getByPlaceholderText } = render(<PhysicalVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('검증 저장') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('검증 근거를 입력하세요'), { target: { value: '점검 완료' } });
    expect((getByText('검증 저장') as HTMLButtonElement).disabled).toBe(false);
  });

  it('toggles checkbox state on click', () => {
    const { container } = render(<PhysicalVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const first = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(first.checked).toBe(true);
    fireEvent.click(first);
    expect(first.checked).toBe(false);
  });

  it('submits all 5 fields with toggled state', () => {
    const onSubmit = vi.fn();
    const { container, getByText, getByPlaceholderText } = render(<PhysicalVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    const cbs = container.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    fireEvent.click(cbs[1]); // didMatched off
    fireEvent.change(getByPlaceholderText('검증 근거를 입력하세요'), { target: { value: '검증' } });
    fireEvent.click(getByText('검증 저장'));
    expect(onSubmit).toHaveBeenCalledWith({
      socMatched: true, didMatched: false, vinMatched: true, fcMatched: true, reason: '검증',
    });
  });

  it('shows 처리 중... while submitting (with reason filled)', () => {
    const { getByText, getByPlaceholderText } = render(<PhysicalVerificationModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('검증 근거를 입력하세요'), { target: { value: 'X' } });
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
