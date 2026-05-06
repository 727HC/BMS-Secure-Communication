import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import VcIssueModal from './VcIssueModal';

describe('VcIssueModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<VcIssueModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 4 credType options', () => {
    const { container } = render(<VcIssueModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.querySelectorAll('option').length).toBe(4);
  });

  it('submits default credType + form values', () => {
    const onSubmit = vi.fn();
    const { getByText, getByPlaceholderText } = render(<VcIssueModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(getByPlaceholderText('Holder DID'), { target: { value: 'did:web:owner' } });
    fireEvent.click(getByText('발급'));
    expect(onSubmit).toHaveBeenCalledWith({
      credType: 'BATTERY_PASSPORT',
      holderDid: 'did:web:owner',
      expiresAt: '',
    });
  });

  it('updates credType on select change', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(<VcIssueModal open={true} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'RECYCLE' } });
    fireEvent.click(getByText('발급'));
    expect(onSubmit).toHaveBeenCalledWith({ credType: 'RECYCLE', holderDid: '', expiresAt: '' });
  });

  it('shows 처리 중... while submitting', () => {
    const { getByText } = render(<VcIssueModal open={true} submitting={true} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });
});
