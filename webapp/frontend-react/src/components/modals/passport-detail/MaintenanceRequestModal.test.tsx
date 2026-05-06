import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaintenanceRequestModal from './MaintenanceRequestModal';

describe('MaintenanceRequestModal (passport-detail)', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<MaintenanceRequestModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 4 maintenanceType options + textarea', () => {
    const { container } = render(<MaintenanceRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('option').length).toBe(4);
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('submits routine + empty description by default', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<MaintenanceRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('요청'));
    expect(onSubmit).toHaveBeenCalledWith({ maintenanceType: 'routine', description: '' });
  });

  it('updates fields and submits the new values', () => {
    const onSubmit = vi.fn();
    const { container, getByText, getByPlaceholderText } = render(<MaintenanceRequestModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'emergency' } });
    fireEvent.change(getByPlaceholderText('설명'), { target: { value: '긴급' } });
    fireEvent.click(getByText('요청'));
    expect(onSubmit).toHaveBeenCalledWith({ maintenanceType: 'emergency', description: '긴급' });
  });

  it('shows 처리 중... when submitting', () => {
    const { getByText } = render(<MaintenanceRequestModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
