import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AnalysisResultModal, { type AnalysisFormData } from './AnalysisResultModal';

const baseForm: AnalysisFormData = { soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false };

describe('AnalysisResultModal', () => {
  it('does not render when closed', () => {
    render(<AnalysisResultModal open={false} submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('분석 결과 제출')).toBeNull();
  });

  it('renders title + four input fields when open', () => {
    render(<AnalysisResultModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('분석 결과 제출')).not.toBeNull();
    expect(screen.getByText('SOH (%)')).not.toBeNull();
    expect(screen.getByText('SOCE (%)')).not.toBeNull();
    expect(screen.getByText('잔여 사이클')).not.toBeNull();
    expect(screen.getByText(/재활용 가능 판정/)).not.toBeNull();
  });

  it('emits onChange with merged form when SOH input changes', () => {
    const onChange = vi.fn();
    render(<AnalysisResultModal open submitting={false} form={baseForm} onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // SOH is the first numeric input in DOM order
    fireEvent.change(inputs[0], { target: { value: '85' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseForm, soh: '85' });
  });

  it('emits onChange with checkbox toggle for recycleAvailable', () => {
    const onChange = vi.fn();
    render(<AnalysisResultModal open submitting={false} form={baseForm} onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith({ ...baseForm, recycleAvailable: true });
  });

  it('disables submit button while submitting and shows progress label', () => {
    render(<AnalysisResultModal open submitting={true} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /제출 중/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('fires onSubmit/onClose for action buttons', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<AnalysisResultModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '제출' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });
});
