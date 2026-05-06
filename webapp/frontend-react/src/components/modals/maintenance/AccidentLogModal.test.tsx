import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import AccidentLogModal from './AccidentLogModal';

describe('AccidentLogModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<AccidentLogModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 3 severity buttons (경미·보통·심각)', () => {
    const { getByText } = render(<AccidentLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(getByText('경미')).not.toBeNull();
    expect(getByText('보통')).not.toBeNull();
    expect(getByText('심각')).not.toBeNull();
  });

  it('initializes with initialReporter', () => {
    const { container } = render(<AccidentLogModal open={true} submitting={false} initialReporter="검사관A" onClose={vi.fn()} onSubmit={vi.fn()} />);
    const reporterInput = container.querySelector('input.sn-input') as HTMLInputElement;
    expect(reporterInput.value).toBe('검사관A');
  });

  it('changes severity on button click', () => {
    const onSubmit = vi.fn();
    const utils = render(<AccidentLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(utils.getByText('심각'));
    fireEvent.click(document.querySelector('button.sn-btn-danger') as HTMLButtonElement);
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ severity: 'severe' }));
  });

  it('submits all 3 fields including default severity=minor', () => {
    const onSubmit = vi.fn();
    render(<AccidentLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(document.querySelector('button.sn-btn-danger') as HTMLButtonElement);
    expect(onSubmit).toHaveBeenCalledWith({ severity: 'minor', description: '', reporter: '' });
  });

  it('updates description and reporter and submits', () => {
    const onSubmit = vi.fn();
    const { container } = render(<AccidentLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    const reporterInput = container.querySelector('input.sn-input') as HTMLInputElement;
    const descTextarea = container.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(reporterInput, { target: { value: 'A' } });
    fireEvent.change(descTextarea, { target: { value: 'B' } });
    fireEvent.click(document.querySelector('button.sn-btn-danger') as HTMLButtonElement);
    expect(onSubmit).toHaveBeenCalledWith({ severity: 'minor', description: 'B', reporter: 'A' });
  });

  it('resets form when modal reopens', () => {
    const { container, rerender } = render(<AccidentLogModal open={true} submitting={false} initialReporter="A" onClose={vi.fn()} onSubmit={vi.fn()} />);
    const reporterInput = () => container.querySelector('input.sn-input') as HTMLInputElement;
    fireEvent.change(reporterInput(), { target: { value: 'changed' } });
    expect(reporterInput().value).toBe('changed');
    rerender(<AccidentLogModal open={false} submitting={false} initialReporter="A" onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<AccidentLogModal open={true} submitting={false} initialReporter="A" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(reporterInput().value).toBe('A');
  });

  it('shows 등록 중... while submitting', () => {
    const { getByText } = render(<AccidentLogModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('등록 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<AccidentLogModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });
});
