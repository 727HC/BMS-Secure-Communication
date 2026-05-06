import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import ExtractModal from './ExtractModal';

describe('ExtractModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<ExtractModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 2 default entries (리튬, 코발트)', () => {
    const { container } = render(<ExtractModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const inputs = container.querySelectorAll('input.sn-input') as NodeListOf<HTMLInputElement>;
    expect(inputs.length).toBe(4); // 2 entries × 2 inputs
    expect(inputs[0].value).toBe('리튬');
    expect(inputs[2].value).toBe('코발트');
  });

  it('adds new entry on + 추가 click', () => {
    const { container, getByText } = render(<ExtractModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('+ 추가'));
    expect(container.querySelectorAll('input.sn-input').length).toBe(6); // 3 entries × 2
  });

  it('removes entry on 삭제 click', () => {
    const { container, getAllByText } = render(<ExtractModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(getAllByText('삭제')[0]);
    expect(container.querySelectorAll('input.sn-input').length).toBe(2); // 1 entry × 2
  });

  it('submits all current entries', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(<ExtractModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    const inputs = container.querySelectorAll('input.sn-input') as NodeListOf<HTMLInputElement>;
    fireEvent.change(inputs[1], { target: { value: '85' } });
    fireEvent.change(inputs[3], { target: { value: '70' } });
    fireEvent.click(getByText('기록'));
    expect(onSubmit).toHaveBeenCalledWith([
      { key: '리튬', value: '85' },
      { key: '코발트', value: '70' },
    ]);
  });

  it('resets to default entries when modal reopens', () => {
    const { container, getByText, rerender } = render(<ExtractModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('+ 추가'));
    expect(container.querySelectorAll('input.sn-input').length).toBe(6);
    rerender(<ExtractModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    rerender(<ExtractModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('input.sn-input').length).toBe(4);
  });

  it('shows 저장 중... while submitting', () => {
    const { getByText } = render(<ExtractModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('저장 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
