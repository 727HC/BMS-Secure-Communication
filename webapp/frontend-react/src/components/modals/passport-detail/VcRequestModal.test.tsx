import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import VcRequestModal from './VcRequestModal';

describe('VcRequestModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<VcRequestModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 5 credType options', () => {
    const { container } = render(<VcRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('option').length).toBe(5);
  });

  it('defaults to BATTERY_PASSPORT and submits that value', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<VcRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('요청'));
    expect(onSubmit).toHaveBeenCalledWith({ credType: 'BATTERY_PASSPORT' });
  });

  it('updates credType on select change and submits new value', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(<VcRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'COMPLIANCE' } });
    fireEvent.click(getByText('요청'));
    expect(onSubmit).toHaveBeenCalledWith({ credType: 'COMPLIANCE' });
  });

  it('shows 처리 중... when submitting', () => {
    const { getByText } = render(<VcRequestModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<VcRequestModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });
});
