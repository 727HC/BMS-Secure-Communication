import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import PassportDetailTabRouter from './PassportDetailTabRouter';
import type { GbaCompliance, Passport } from './types';

vi.mock('./IdentityTab', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="IdentityTab" data-passport-id={(props.passport as Passport)?.passportId} />
  ),
}));
vi.mock('./ComplianceTab', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="ComplianceTab" data-can-update={String(props.canUpdateRegulatory)} />
  ),
}));
vi.mock('./TraceabilityTab', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="TraceabilityTab" data-can-verify={String(props.canVerifyPhysical)} />
  ),
}));
vi.mock('./DataTab', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="DataTab" data-passport-id={(props.passportId as string) || ''} />
  ),
}));
vi.mock('./TrustTab', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="TrustTab" data-can-request={String(props.canRequest)} data-can-approve={String(props.canApproveOrReject)} />
  ),
}));

function renderRouter(overrides: Partial<React.ComponentProps<typeof PassportDetailTabRouter>> = {}) {
  const props = {
    activeTab: 'identity' as const,
    passport: { passportId: 'P1' } as unknown as Passport,
    gbaCompliance: { filled: 0, total: 21, pct: 0, allFilled: false, groups: [] } as GbaCompliance,
    grade: 'A' as const,
    vcList: [],
    bmuRecords: [],
    issuers: [],
    org: null,
    isManufacturer: false,
    isEV: false,
    isService: false,
    isRegulator: false,
    onUpdateRegulatory: vi.fn(),
    onVerifyPhysical: vi.fn(),
    onVerifyVc: vi.fn(),
    onRevokeVc: vi.fn(),
    onRequestVc: vi.fn(),
    onApproveVc: vi.fn(),
    onRejectVc: vi.fn(),
    ...overrides,
  };
  return render(<Suspense fallback={null}><PassportDetailTabRouter {...props} /></Suspense>);
}

describe('PassportDetailTabRouter', () => {
  it('renders IdentityTab when activeTab=identity', async () => {
    const { findByTestId } = renderRouter({ activeTab: 'identity' });
    const el = await findByTestId('IdentityTab');
    expect(el.getAttribute('data-passport-id')).toBe('P1');
  });

  it('renders ComplianceTab and forwards canUpdateRegulatory=isRegulator', async () => {
    const { findByTestId } = renderRouter({ activeTab: 'compliance', isRegulator: true });
    const el = await findByTestId('ComplianceTab');
    expect(el.getAttribute('data-can-update')).toBe('true');
  });

  it('renders TraceabilityTab with canVerifyPhysical = isManufacturer || isRegulator', async () => {
    const { findByTestId, rerender } = renderRouter({ activeTab: 'traceability', isManufacturer: true });
    expect((await findByTestId('TraceabilityTab')).getAttribute('data-can-verify')).toBe('true');
    rerender(
      <Suspense fallback={null}>
        <PassportDetailTabRouter
          activeTab="traceability"
          passport={{ passportId: 'P1' } as Passport}
          gbaCompliance={{ filled: 0, total: 21, pct: 0, allFilled: false, groups: [] }}
          grade="A" vcList={[]} bmuRecords={[]} issuers={[]} org={null}
          isManufacturer={false} isEV={false} isService={false} isRegulator={false}
          onUpdateRegulatory={vi.fn()} onVerifyPhysical={vi.fn()}
          onVerifyVc={vi.fn()} onRevokeVc={vi.fn()}
          onRequestVc={vi.fn()} onApproveVc={vi.fn()} onRejectVc={vi.fn()}
        />
      </Suspense>,
    );
    expect((await findByTestId('TraceabilityTab')).getAttribute('data-can-verify')).toBe('false');
  });

  it('renders DataTab with passport.passportId', async () => {
    const { findByTestId } = renderRouter({ activeTab: 'data', passport: { passportId: 'P-XYZ' } as Passport });
    expect((await findByTestId('DataTab')).getAttribute('data-passport-id')).toBe('P-XYZ');
  });

  it('renders TrustTab with canRequest=Mfg||EV||Service', async () => {
    const { findByTestId } = renderRouter({ activeTab: 'trust', isEV: true });
    expect((await findByTestId('TrustTab')).getAttribute('data-can-request')).toBe('true');
  });

  it('TrustTab canApproveOrReject = isRegulator || org===ManufacturerMSP', async () => {
    const { findByTestId } = renderRouter({ activeTab: 'trust', org: 'ManufacturerMSP' });
    expect((await findByTestId('TrustTab')).getAttribute('data-can-approve')).toBe('true');
  });

  it('returns null for unknown tab', () => {
    const { container } = renderRouter({ activeTab: 'unknown' as never });
    expect(container.firstChild).toBeNull();
  });
});
