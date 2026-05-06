import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import TrustTab from './TrustTab';
import type { Credential, IssuerCatalogItem, Passport } from './types';

const sampleVcs: Credential[] = [
  { credentialId: 'VC1', credType: 'GBA', status: 'ACTIVE', issuedAt: '2026-05-01' },
  { credentialId: 'VC2', credType: 'CARBON', status: 'REVOKED', issuedAt: '2025-01-01' },
];

const sampleIssuers: IssuerCatalogItem[] = [
  { issuerMsp: 'RegulatorMSP', types: ['GBA', 'CARBON'] },
];

function build(overrides: Partial<ComponentProps<typeof TrustTab>> = {}) {
  return {
    passport: { did: 'did:web:bms:P1' } as unknown as Passport,
    vcList: sampleVcs,
    onVerify: vi.fn(),
    onRevoke: vi.fn(),
    canRequest: false,
    canApproveOrReject: false,
    onRequest: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    issuers: sampleIssuers,
    ...overrides,
  };
}

describe('TrustTab', () => {
  it('hides VC 요청/승인 dossier when both can flags are false', () => {
    const { queryByText } = render(<TrustTab {...build()} />);
    expect(queryByText('VC 요청 / 승인 흐름')).toBeNull();
  });

  it('shows 발급 요청 button only when canRequest', () => {
    const { getByText, queryByText, rerender } = render(<TrustTab {...build({ canRequest: true })} />);
    expect(getByText('발급 요청')).not.toBeNull();
    rerender(<TrustTab {...build({ canRequest: false })} />);
    expect(queryByText('발급 요청')).toBeNull();
  });

  it('shows 요청 승인/거부 buttons when canApproveOrReject', () => {
    const { getByText } = render(<TrustTab {...build({ canApproveOrReject: true })} />);
    expect(getByText('요청 승인')).not.toBeNull();
    expect(getByText('요청 거부')).not.toBeNull();
  });

  it('emits onRequest/onApprove/onReject on respective button click', () => {
    const props = build({ canRequest: true, canApproveOrReject: true });
    const { getByText } = render(<TrustTab {...props} />);
    fireEvent.click(getByText('발급 요청'));
    fireEvent.click(getByText('요청 승인'));
    fireEvent.click(getByText('요청 거부'));
    expect(props.onRequest).toHaveBeenCalled();
    expect(props.onApprove).toHaveBeenCalled();
    expect(props.onReject).toHaveBeenCalled();
  });

  it('renders issuer rows with type stamps', () => {
    const { getByText, getAllByText } = render(<TrustTab {...build()} />);
    expect(getByText('RegulatorMSP')).not.toBeNull();
    // 'GBA' appears in issuer stamp + VC credType
    expect(getAllByText('GBA').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('CARBON').length).toBeGreaterThanOrEqual(2);
  });

  it('omits issuer dossier when issuers is empty', () => {
    const { queryByText } = render(<TrustTab {...build({ issuers: [] })} />);
    expect(queryByText('발급기관 / Credential 타입')).toBeNull();
  });

  it('renders DID value or 미등록 fallback', () => {
    const { getByText, rerender } = render(<TrustTab {...build()} />);
    expect(getByText('did:web:bms:P1')).not.toBeNull();
    rerender(<TrustTab {...build({ passport: {} as unknown as Passport })} />);
    expect(getByText('미등록')).not.toBeNull();
  });

  it('renders VC count in section title', () => {
    const { getByText } = render(<TrustTab {...build()} />);
    expect(getByText('VC 발급 이력 (2건)')).not.toBeNull();
  });

  it('renders empty caption when no VCs', () => {
    const { getByText } = render(<TrustTab {...build({ vcList: [] })} />);
    expect(getByText('발급된 VC가 없습니다.')).not.toBeNull();
  });

  it('emits onVerify with credentialId on 검증 click', () => {
    const props = build();
    const { getAllByText } = render(<TrustTab {...props} />);
    fireEvent.click(getAllByText('검증')[0]);
    expect(props.onVerify).toHaveBeenCalledWith('VC1');
  });

  it('hides 폐기 button when status=REVOKED', () => {
    const { getAllByText } = render(<TrustTab {...build()} />);
    // Only VC1 (ACTIVE) shows 폐기; VC2 REVOKED hides it
    expect(getAllByText('폐기').length).toBe(1);
  });

  it('emits onRevoke on 폐기 click', () => {
    const props = build();
    const { getByText } = render(<TrustTab {...props} />);
    fireEvent.click(getByText('폐기'));
    expect(props.onRevoke).toHaveBeenCalledWith('VC1');
  });
});
