import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import PassportDetailModalRouter, { type ModalHandlers, type ModalKey } from './PassportDetailModalRouter';

const stub = (name: string) => ({
  default: (props: Record<string, unknown>) => (
    <div
      data-testid={name}
      data-credential-id={String(props.credentialId ?? '')}
      data-passport-did={String(props.passportDid ?? '')}
    />
  ),
});

vi.mock('../modals/passport-detail/BindModal', () => stub('BindModal'));
vi.mock('../modals/passport-detail/MaintenanceRequestModal', () => stub('MaintenanceRequestModal'));
vi.mock('../modals/passport-detail/MaintenanceLogModal', () => stub('MaintenanceLogModal'));
vi.mock('../modals/passport-detail/AnalysisRequestModal', () => stub('AnalysisRequestModal'));
vi.mock('../modals/passport-detail/AnalysisResultModal', () => stub('AnalysisResultModal'));
vi.mock('../modals/passport-detail/DisposeModal', () => stub('DisposeModal'));
vi.mock('../modals/passport-detail/CorrectionModal', () => stub('CorrectionModal'));
vi.mock('../modals/passport-detail/VcIssueModal', () => stub('VcIssueModal'));
vi.mock('../modals/passport-detail/VcVerifyModal', () => stub('VcVerifyModal'));
vi.mock('../modals/passport-detail/VcRevokeModal', () => stub('VcRevokeModal'));
vi.mock('../modals/passport-detail/VcRequestModal', () => stub('VcRequestModal'));
vi.mock('../modals/passport-detail/VcApproveModal', () => stub('VcApproveModal'));
vi.mock('../modals/passport-detail/VcRejectModal', () => stub('VcRejectModal'));
vi.mock('../modals/passport-detail/RegulatoryVerificationModal', () => stub('RegulatoryVerificationModal'));
vi.mock('../modals/passport-detail/PhysicalVerificationModal', () => stub('PhysicalVerificationModal'));

const noop = () => {};
const handlers: ModalHandlers = {
  onBind: noop,
  onMaintenanceRequest: noop,
  onMaintenanceLog: noop,
  onAnalysisRequest: noop,
  onAnalysisResult: noop,
  onDispose: noop,
  onCorrect: noop,
  onVcIssue: noop,
  onVcRequest: noop,
  onVcApprove: noop,
  onVcReject: noop,
  onVcRevoke: noop,
  onRegulatoryVerification: noop,
  onPhysicalVerification: noop,
};

function renderWith(openModal: ModalKey, selectedVcId: string | null = null) {
  return render(
    <Suspense fallback={null}>
      <PassportDetailModalRouter
        openModal={openModal}
        submitting={false}
        selectedVcId={selectedVcId}
        passportDid="did:web:bms:P1"
        onClose={vi.fn()}
        handlers={handlers}
      />
    </Suspense>,
  );
}

describe('PassportDetailModalRouter', () => {
  const cases: Array<[ModalKey, string]> = [
    ['bind', 'BindModal'],
    ['mRequest', 'MaintenanceRequestModal'],
    ['mLog', 'MaintenanceLogModal'],
    ['aRequest', 'AnalysisRequestModal'],
    ['aResult', 'AnalysisResultModal'],
    ['dispose', 'DisposeModal'],
    ['correct', 'CorrectionModal'],
    ['vcIssue', 'VcIssueModal'],
    ['vcRequest', 'VcRequestModal'],
    ['vcApprove', 'VcApproveModal'],
    ['vcReject', 'VcRejectModal'],
    ['regVerify', 'RegulatoryVerificationModal'],
    ['physicalVerify', 'PhysicalVerificationModal'],
  ];

  for (const [key, expected] of cases) {
    it(`maps ${key} → ${expected}`, async () => {
      const { findByTestId } = renderWith(key);
      expect(await findByTestId(expected)).not.toBeNull();
    });
  }

  it('passes credentialId to VcVerifyModal', async () => {
    const { findByTestId } = renderWith('vcVerify', 'VC-1');
    expect((await findByTestId('VcVerifyModal')).getAttribute('data-credential-id')).toBe('VC-1');
  });

  it('passes credentialId to VcRevokeModal', async () => {
    const { findByTestId } = renderWith('vcRevoke', 'VC-2');
    expect((await findByTestId('VcRevokeModal')).getAttribute('data-credential-id')).toBe('VC-2');
  });

  it('passes passportDid to VcIssueModal', async () => {
    const { findByTestId } = renderWith('vcIssue');
    expect((await findByTestId('VcIssueModal')).getAttribute('data-passport-did')).toBe('did:web:bms:P1');
  });

  it('returns null when openModal is null', () => {
    const { container } = renderWith(null);
    expect(container.firstChild).toBeNull();
  });
});
