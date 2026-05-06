import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MaintenanceRequestModal, { type MaintenanceRequestFormData } from './MaintenanceRequestModal';

const baseForm: MaintenanceRequestFormData = { maintenanceType: 'routine', description: '' };

describe('MaintenanceRequestModal', () => {
  it('does not render when closed', () => {
    render(<MaintenanceRequestModal open={false} submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('Service task 접수')).toBeNull();
  });

  it('renders title and labeled inputs when open', () => {
    render(<MaintenanceRequestModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('Service task 접수')).not.toBeNull();
    expect(screen.getByText('작업 유형')).not.toBeNull();
    expect(screen.getByText('작업 설명')).not.toBeNull();
  });

  it('renders 4 maintenance type options in select', () => {
    render(<MaintenanceRequestModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(4);
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['routine', 'repair', 'recall', 'emergency']);
  });

  it('emits onChange merging select value', () => {
    const onChange = vi.fn();
    render(<MaintenanceRequestModal open submitting={false} form={baseForm} onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'emergency' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseForm, maintenanceType: 'emergency' });
  });

  it('emits onChange when textarea changes', () => {
    const onChange = vi.fn();
    render(<MaintenanceRequestModal open submitting={false} form={baseForm} onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oil leak' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseForm, description: 'oil leak' });
  });

  it('disables submit while submitting and shows progress label', () => {
    render(<MaintenanceRequestModal open submitting={true} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /등록 중/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('fires onSubmit/onClose for action buttons', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<MaintenanceRequestModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '접수 등록' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });
});
