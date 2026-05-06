import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import RegulatoryVerificationModal from './RegulatoryVerificationModal';

describe('RegulatoryVerificationModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<RegulatoryVerificationModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 4 status options', () => {
    const { container } = render(<RegulatoryVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('option').length).toBe(4);
  });

  it('submits PENDING + empty evidence by default', () => {
    const onSubmit = vi.fn();
    const { getByText } = render(<RegulatoryVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(getByText('업데이트'));
    expect(onSubmit).toHaveBeenCalledWith({ status: 'PENDING', evidenceIds: '' });
  });

  it('submits VERIFIED + comma-separated evidence ids', () => {
    const onSubmit = vi.fn();
    const { container, getByText, getByPlaceholderText } = render(<RegulatoryVerificationModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'VERIFIED' } });
    fireEvent.change(getByPlaceholderText('증빙 VC ID를 쉼표로 구분해 입력'), { target: { value: 'VC1,VC2' } });
    fireEvent.click(getByText('업데이트'));
    expect(onSubmit).toHaveBeenCalledWith({ status: 'VERIFIED', evidenceIds: 'VC1,VC2' });
  });

  it('shows 처리 중... while submitting', () => {
    const { getByText } = render(<RegulatoryVerificationModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
