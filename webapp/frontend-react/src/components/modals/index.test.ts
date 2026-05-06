import { describe, expect, it } from 'vitest';
import * as Modals from './index';

describe('modals/index barrel exports', () => {
  it('exposes BaseModal + 4 namespaced sub-bundles', () => {
    expect(Modals.BaseModal).toBeTypeOf('function');
    expect(Modals.PassportDetailModals).toBeTypeOf('object');
    expect(Modals.MaintenanceModals).toBeTypeOf('object');
    expect(Modals.RecyclingModals).toBeTypeOf('object');
    expect(Modals.MaterialsModals).toBeTypeOf('object');
  });

  it('PassportDetailModals namespace contains all 15 modals', () => {
    const names = [
      'BindModal', 'MaintenanceRequestModal', 'MaintenanceLogModal',
      'AnalysisRequestModal', 'AnalysisResultModal', 'DisposeModal',
      'CorrectionModal', 'VcIssueModal', 'VcVerifyModal', 'VcRevokeModal',
      'RegulatoryVerificationModal', 'PhysicalVerificationModal',
      'VcRequestModal', 'VcApproveModal', 'VcRejectModal',
    ];
    for (const n of names) {
      expect(Modals.PassportDetailModals[n as keyof typeof Modals.PassportDetailModals]).toBeDefined();
    }
  });

  it('RecyclingModals contains 4 modals', () => {
    expect(Modals.RecyclingModals.ExtractModal).toBeDefined();
    expect(Modals.RecyclingModals.RecycleToggleModal).toBeDefined();
    expect(Modals.RecyclingModals.AnalysisResultModal).toBeDefined();
    expect(Modals.RecyclingModals.DisposeConfirmModal).toBeDefined();
  });

  it('MaintenanceModals contains 3 modals', () => {
    expect(Modals.MaintenanceModals.AccidentLogModal).toBeDefined();
    expect(Modals.MaintenanceModals.MaintenanceRequestModal).toBeDefined();
    expect(Modals.MaintenanceModals.MaintenanceLogModal).toBeDefined();
  });

  it('MaterialsModals contains 2 modals', () => {
    expect(Modals.MaterialsModals.MaterialCreateModal).toBeDefined();
    expect(Modals.MaterialsModals.MaterialDetailModal).toBeDefined();
  });
});
