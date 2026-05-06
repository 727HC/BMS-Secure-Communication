import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import LedgerCard from './LedgerCard';
import type { LedgerRowViewModel } from './lib';

const sampleRows: LedgerRowViewModel[] = [
  { key: '1', tx: '0xabc', block: '#100', organization: 'MfgMSP', eventType: 'CREATE_PASSPORT', timestamp: '5분 전', status: 'COMMITTED' },
  { key: '2', tx: '0xdef', block: '#101', organization: 'RegMSP', eventType: 'BIND_VEHICLE', timestamp: '3분 전', status: 'COMMITTED' },
];

function build(overrides: Partial<ComponentProps<typeof LedgerCard>> = {}) {
  return {
    ledgerRows: sampleRows,
    ledgerFallback: null as string | null,
    canReadAudit: true,
    onNavigate: vi.fn(),
    ...overrides,
  };
}

describe('LedgerCard', () => {
  it('renders one row per ledgerRows entry', () => {
    const { container } = render(<LedgerCard {...build()} />);
    expect(container.querySelectorAll('tbody tr').length).toBe(2);
  });

  it('renders tx hash + organization + event type per row', () => {
    const { getByText } = render(<LedgerCard {...build()} />);
    expect(getByText('0xabc')).not.toBeNull();
    expect(getByText('MfgMSP')).not.toBeNull();
    expect(getByText('CREATE_PASSPORT')).not.toBeNull();
  });

  it('renders fallback row instead of ledger rows when ledgerFallback is set', () => {
    const { container, getByText } = render(<LedgerCard {...build({ ledgerFallback: '권한 부족' })} />);
    expect(getByText('권한 부족')).not.toBeNull();
    expect(container.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('disables 전체 보기 + shows 권한 필요 when canReadAudit=false', () => {
    const { getByText } = render(<LedgerCard {...build({ canReadAudit: false })} />);
    const btn = getByText('권한 필요').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows 전체 보기 when canReadAudit=true', () => {
    const { getByText } = render(<LedgerCard {...build()} />);
    expect(getByText('전체 보기')).not.toBeNull();
  });

  it('emits onNavigate(/audit-log) when 전체 보기 clicked', () => {
    const props = build();
    const { getByText } = render(<LedgerCard {...props} />);
    fireEvent.click(getByText('전체 보기').closest('button') as HTMLButtonElement);
    expect(props.onNavigate).toHaveBeenCalledWith('/audit-log');
  });

  it('renders 6 column headers', () => {
    const { container } = render(<LedgerCard {...build()} />);
    expect(container.querySelectorAll('thead th').length).toBe(6);
  });
});
