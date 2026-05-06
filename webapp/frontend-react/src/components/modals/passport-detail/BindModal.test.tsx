import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import BindModal from './BindModal';

describe('BindModal', () => {
  it('does not render when closed', () => {
    const { container } = render(<BindModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and 4 input fields', () => {
    const { getByText, getByPlaceholderText } = render(<BindModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(getByText('차대번호 연결')).not.toBeNull();
    expect(getByPlaceholderText('17자리 VIN')).not.toBeNull();
    expect(getByPlaceholderText('EV 제조사')).not.toBeNull();
    expect(getByPlaceholderText('조립 국가')).not.toBeNull();
  });

  it('updates form state when inputs change and submits the data', () => {
    const onSubmit = vi.fn();
    const { getByPlaceholderText, getByText } = render(<BindModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('17자리 VIN'), { target: { value: 'V123' } });
    fireEvent.change(getByPlaceholderText('EV 제조사'), { target: { value: 'Tesla' } });
    fireEvent.change(getByPlaceholderText('조립 국가'), { target: { value: 'US' } });
    fireEvent.click(getByText('연결'));
    expect(onSubmit).toHaveBeenCalledWith({
      vin: 'V123',
      installDate: '',
      evManufacturer: 'Tesla',
      evAssemblyCountry: 'US',
    });
  });

  it('shows loading label and disables submit button while submitting', () => {
    const { getByText } = render(<BindModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    const btn = getByText('처리 중...') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('emits onClose and resets form on 취소 click', () => {
    const onClose = vi.fn();
    const { getByPlaceholderText, getByText } = render(<BindModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.change(getByPlaceholderText('17자리 VIN'), { target: { value: 'X' } });
    fireEvent.click(getByText('취소'));
    expect(onClose).toHaveBeenCalled();
  });

  it('emits onClose on backdrop overlay click', () => {
    const onClose = vi.fn();
    const { container } = render(<BindModal open={true} submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    fireEvent.click(container.querySelector('.sn-overlay') as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('submits empty form when no input given', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<BindModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('연결'));
    expect(onSubmit).toHaveBeenCalledWith({ vin: '', installDate: '', evManufacturer: '', evAssemblyCountry: '' });
  });
});
