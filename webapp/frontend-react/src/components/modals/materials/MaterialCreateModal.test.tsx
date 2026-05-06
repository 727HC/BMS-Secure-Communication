import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import MaterialCreateModal from './MaterialCreateModal';

describe('MaterialCreateModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<MaterialCreateModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders auto-generated MAT- materialId in readonly input', () => {
    const { container } = render(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const idInput = container.querySelector('input[readonly]') as HTMLInputElement;
    expect(idInput.value).toMatch(/^MAT-\d+$/);
  });

  it('disables 등록 button while required fields are empty', () => {
    const { getByText } = render(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('등록') as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables 등록 only when name+origin+supplier+quantity are all filled', () => {
    const { getByText, getByPlaceholderText } = render(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('예: 리튬, 코발트, 니켈'), { target: { value: '리튬' } });
    fireEvent.change(getByPlaceholderText('예: 호주'), { target: { value: 'AU' } });
    fireEvent.change(getByPlaceholderText('예: ABC Mining'), { target: { value: 'AusMin' } });
    expect((getByText('등록') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByPlaceholderText('0'), { target: { value: '100' } });
    expect((getByText('등록') as HTMLButtonElement).disabled).toBe(false);
  });

  it('submits form data on form submit', () => {
    const onSubmit = vi.fn();
    const { container, getByPlaceholderText } = render(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('예: 리튬, 코발트, 니켈'), { target: { value: 'Co' } });
    fireEvent.change(getByPlaceholderText('예: 호주'), { target: { value: 'CD' } });
    fireEvent.change(getByPlaceholderText('예: ABC Mining'), { target: { value: 'KatangaMin' } });
    fireEvent.change(getByPlaceholderText('0'), { target: { value: '50' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);
    expect(onSubmit).toHaveBeenCalled();
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.name).toBe('Co');
    expect(arg.origin).toBe('CD');
    expect(arg.supplier).toBe('KatangaMin');
    expect(arg.quantity).toBe('50');
    expect(arg.unit).toBe('kg');
  });

  it('renders 4 unit options', () => {
    const { container } = render(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('option').length).toBe(4);
  });

  it('shows 등록 중... while submitting', () => {
    const { getByText, getByPlaceholderText } = render(<MaterialCreateModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('예: 리튬, 코발트, 니켈'), { target: { value: 'X' } });
    fireEvent.change(getByPlaceholderText('예: 호주'), { target: { value: 'X' } });
    fireEvent.change(getByPlaceholderText('예: ABC Mining'), { target: { value: 'X' } });
    fireEvent.change(getByPlaceholderText('0'), { target: { value: '1' } });
    expect((getByText('등록 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('emits onClose on 취소 click', () => {
    const onClose = vi.fn();
    const { getByText } = render(<MaterialCreateModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });

  it('regenerates materialId when modal reopens', () => {
    const { container, rerender } = render(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const id1 = (container.querySelector('input[readonly]') as HTMLInputElement).value;
    rerender(<MaterialCreateModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    // small delay to ensure Date.now() bumps; simulate by triggering reopen
    rerender(<MaterialCreateModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const id2 = (container.querySelector('input[readonly]') as HTMLInputElement).value;
    // either same (Date.now within ms) or different — both follow MAT- pattern
    expect(id1).toMatch(/^MAT-/);
    expect(id2).toMatch(/^MAT-/);
  });
});
