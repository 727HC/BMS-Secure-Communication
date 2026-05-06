import { describe, expect, it } from 'vitest';
import * as M from './index';

describe('modals/passport-detail/index barrel', () => {
  it('exports all 15 modals as functions', () => {
    const names = [
      'BindModal', 'MaintenanceRequestModal', 'MaintenanceLogModal',
      'AnalysisRequestModal', 'AnalysisResultModal', 'DisposeModal',
      'CorrectionModal', 'VcIssueModal', 'VcVerifyModal', 'VcRevokeModal',
      'RegulatoryVerificationModal', 'PhysicalVerificationModal',
      'VcRequestModal', 'VcApproveModal', 'VcRejectModal',
    ] as const;
    for (const n of names) {
      expect(M[n as keyof typeof M], `missing modal: ${n}`).toBeTypeOf('function');
    }
    expect(names.length).toBe(15);
  });
});
