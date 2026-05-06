import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaintenanceLogModal from './MaintenanceLogModal';

describe('MaintenanceLogModal (passport-detail)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<MaintenanceLogModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 3 maintenanceType options + technician input + description textarea', () => {
    const { container } = render(<MaintenanceLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('option').length).toBe(3);
    expect(container.querySelector('input')).not.toBeNull();
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('submits 3 fields with empty defaults', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<MaintenanceLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('완료'));
    expect(onSubmit).toHaveBeenCalledWith({ maintenanceType: 'routine', description: '', technician: '' });
  });

  it('submits updated form fields', () => {
    const onSubmit = vi.fn();
    const { container, getByText, getByPlaceholderText } = render(<MaintenanceLogModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'recall' } });
    fireEvent.change(getByPlaceholderText('담당자'), { target: { value: '홍길동' } });
    fireEvent.change(getByPlaceholderText('설명'), { target: { value: '리콜 처리' } });
    fireEvent.click(getByText('완료'));
    expect(onSubmit).toHaveBeenCalledWith({ maintenanceType: 'recall', description: '리콜 처리', technician: '홍길동' });
  });

  it('shows 처리 중... when submitting', () => {
    const { getByText } = render(<MaintenanceLogModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
