import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import VcIssueModal from './VcIssueModal';

describe('VcIssueModal', () => {
  const passportDid = 'did:web:bms:P1';

  it('renders nothing when closed', () => {
    const { container } = render(<VcIssueModal open={false} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders chaincode-supported credType options', () => {
    const { container } = render(<VcIssueModal open={true} submitting={false} passportDid={passportDid} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(Array.from(container.querySelectorAll('option')).map((node) => node.value)).toEqual([
      'BATTERY_PASSPORT',
      'BATTERY_HEALTH',
      'MAINTENANCE',
      'COMPLIANCE',
      'RECYCLING',
    ]);
  });

  it('submits default credType with passport DID as holder', () => {
    const onSubmit = vi.fn();
    const { getByText, getByLabelText } = render(<VcIssueModal open={true} submitting={false} passportDid={passportDid} onClose={vi.fn()} onSubmit={onSubmit} />);
    const didInput = getByLabelText('Passport DID') as HTMLInputElement;
    expect(didInput.readOnly).toBe(true);
    expect(didInput.value).toBe(passportDid);
    fireEvent.click(getByText('발급'));
    expect(onSubmit).toHaveBeenCalledWith({
      credType: 'BATTERY_PASSPORT',
      holderDid: passportDid,
      expiresAt: '',
    });
  });

  it('updates credType on select change', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(<VcIssueModal open={true} submitting={false} passportDid={passportDid} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('select') as HTMLSelectElement, { target: { value: 'RECYCLING' } });
    fireEvent.click(getByText('발급'));
    expect(onSubmit).toHaveBeenCalledWith({ credType: 'RECYCLING', holderDid: passportDid, expiresAt: '' });
  });

  it('keeps date input as date-only form value for the mutation layer to normalize', () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(<VcIssueModal open={true} submitting={false} passportDid={passportDid} onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2026-05-08' } });
    fireEvent.click(getByText('발급'));
    expect(onSubmit).toHaveBeenCalledWith({ credType: 'BATTERY_PASSPORT', holderDid: passportDid, expiresAt: '2026-05-08' });
  });

  it('shows 처리 중... while submitting', () => {
    const { getByText } = render(<VcIssueModal open={true} submitting={true} passportDid={passportDid} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('처리 중...') as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables issue when passport DID is missing', () => {
    const { getByText } = render(<VcIssueModal open={true} submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect((getByText('발급') as HTMLButtonElement).disabled).toBe(true);
  });
});
