import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AnalysisResultModal from './AnalysisResultModal';

describe('AnalysisResultModal (passport-detail)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AnalysisResultModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SOH/SOCE/잔여 사이클 inputs and checkbox', () => {
    const { getByText, container } = render(<AnalysisResultModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(getByText('SOH (%)')).not.toBeNull();
    expect(getByText('SOCE (%)')).not.toBeNull();
    expect(getByText('잔여 사이클')).not.toBeNull();
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
  });

  it('submits form with all 4 fields', () => {
    const onSubmit = vi.fn();
    const { getByText, getByPlaceholderText, container } = render(<AnalysisResultModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    const sohInput = container.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
    const soceInput = container.querySelectorAll('input[type="number"]')[1] as HTMLInputElement;
    fireEvent.change(sohInput, { target: { value: '85' } });
    fireEvent.change(soceInput, { target: { value: '80' } });
    fireEvent.change(getByPlaceholderText('예: 1200'), { target: { value: '1500' } });
    fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLInputElement);
    fireEvent.click(getByText('제출'));
    expect(onSubmit).toHaveBeenCalledWith({ soh: '85', soce: '80', remainingLifeCycle: '1500', recycleAvailable: true });
  });

  it('submits empty defaults when no input', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<AnalysisResultModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('제출'));
    expect(onSubmit).toHaveBeenCalledWith({ soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false });
  });

  it('shows 처리 중... while submitting', () => {
    const { getByText } = render(<AnalysisResultModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<AnalysisResultModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });
});
