import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MaintenanceLogModal, { type MaintenanceLogFormData } from './MaintenanceLogModal';

const baseForm: MaintenanceLogFormData = { maintenanceType: 'routine', description: '', technician: '' };

describe('MaintenanceLogModal', () => {
  it('does not render when closed', () => {
    render(<MaintenanceLogModal open={false} submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.queryByText('Service task 완료 기록')).toBeNull();
  });

  it('renders three labeled fields when open', () => {
    render(<MaintenanceLogModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('Service task 완료 기록')).not.toBeNull();
    expect(screen.getByText('작업 유형')).not.toBeNull();
    expect(screen.getByText('서비스 담당자')).not.toBeNull();
    expect(screen.getByText('완료 설명')).not.toBeNull();
  });

  it('emits onChange when technician input changes', () => {
    const onChange = vi.fn();
    render(<MaintenanceLogModal open submitting={false} form={baseForm} onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const techInput = screen.getAllByRole('textbox')[0]; // technician is first textbox (input)
    fireEvent.change(techInput, { target: { value: 'kim' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseForm, technician: 'kim' });
  });

  it('emits onChange merging type select', () => {
    const onChange = vi.fn();
    render(<MaintenanceLogModal open submitting={false} form={baseForm} onChange={onChange} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'recall' } });
    expect(onChange).toHaveBeenCalledWith({ ...baseForm, maintenanceType: 'recall' });
  });

  it('disables submit during submitting and shows progress label', () => {
    render(<MaintenanceLogModal open submitting={true} form={baseForm} onChange={vi.fn()} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const submit = screen.getByRole('button', { name: /등록 중/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('fires onClose/onSubmit for action buttons', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(<MaintenanceLogModal open submitting={false} form={baseForm} onChange={vi.fn()} onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(screen.getByRole('button', { name: '완료 기록' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });
});
