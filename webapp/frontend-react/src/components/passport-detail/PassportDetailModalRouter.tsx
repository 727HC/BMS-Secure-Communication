import { lazy } from 'react';
import type { BindFormData } from '../modals/passport-detail/BindModal';
import type { MaintenanceRequestFormData } from '../modals/passport-detail/MaintenanceRequestModal';
import type { MaintenanceLogFormData } from '../modals/passport-detail/MaintenanceLogModal';
import type { AnalysisResultFormData } from '../modals/passport-detail/AnalysisResultModal';
import type { CorrectionFormData } from '../modals/passport-detail/CorrectionModal';
import type { VcIssueFormData } from '../modals/passport-detail/VcIssueModal';
import type { VcRevokeFormData } from '../modals/passport-detail/VcRevokeModal';
import type { VcRequestFormData } from '../modals/passport-detail/VcRequestModal';
import type { VcApproveFormData } from '../modals/passport-detail/VcApproveModal';
import type { VcRejectFormData } from '../modals/passport-detail/VcRejectModal';
import type { RegulatoryVerificationFormData } from '../modals/passport-detail/RegulatoryVerificationModal';
import type { PhysicalVerificationFormData } from '../modals/passport-detail/PhysicalVerificationModal';

const BindModal = lazy(() => import('../modals/passport-detail/BindModal'));
const MaintenanceRequestModal = lazy(() => import('../modals/passport-detail/MaintenanceRequestModal'));
const MaintenanceLogModal = lazy(() => import('../modals/passport-detail/MaintenanceLogModal'));
const AnalysisRequestModal = lazy(() => import('../modals/passport-detail/AnalysisRequestModal'));
const AnalysisResultModal = lazy(() => import('../modals/passport-detail/AnalysisResultModal'));
const DisposeModal = lazy(() => import('../modals/passport-detail/DisposeModal'));
const CorrectionModal = lazy(() => import('../modals/passport-detail/CorrectionModal'));
const VcIssueModal = lazy(() => import('../modals/passport-detail/VcIssueModal'));
const VcVerifyModal = lazy(() => import('../modals/passport-detail/VcVerifyModal'));
const VcRevokeModal = lazy(() => import('../modals/passport-detail/VcRevokeModal'));
const VcRequestModal = lazy(() => import('../modals/passport-detail/VcRequestModal'));
const VcApproveModal = lazy(() => import('../modals/passport-detail/VcApproveModal'));
const VcRejectModal = lazy(() => import('../modals/passport-detail/VcRejectModal'));
const RegulatoryVerificationModal = lazy(() => import('../modals/passport-detail/RegulatoryVerificationModal'));
const PhysicalVerificationModal = lazy(() => import('../modals/passport-detail/PhysicalVerificationModal'));

export type ModalKey =
  | 'bind' | 'mRequest' | 'mLog' | 'aRequest' | 'aResult' | 'dispose'
  | 'correct' | 'vcIssue' | 'vcVerify' | 'vcRevoke' | 'vcRequest'
  | 'vcApprove' | 'vcReject' | 'regVerify' | 'physicalVerify' | null;

export interface ModalHandlers {
  onBind: (data: BindFormData) => void;
  onMaintenanceRequest: (data: MaintenanceRequestFormData) => void;
  onMaintenanceLog: (data: MaintenanceLogFormData) => void;
  onAnalysisRequest: () => void;
  onAnalysisResult: (data: AnalysisResultFormData) => void;
  onDispose: () => void;
  onCorrect: (data: CorrectionFormData) => void;
  onVcIssue: (data: VcIssueFormData) => void;
  onVcRequest: (data: VcRequestFormData) => void;
  onVcApprove: (data: VcApproveFormData) => void;
  onVcReject: (data: VcRejectFormData) => void;
  onVcRevoke: (data: VcRevokeFormData) => void;
  onRegulatoryVerification: (data: RegulatoryVerificationFormData) => void;
  onPhysicalVerification: (data: PhysicalVerificationFormData) => void;
}

interface Props {
  openModal: ModalKey;
  submitting: boolean;
  selectedVcId: string | null;
  onClose: () => void;
  handlers: ModalHandlers;
}

export default function PassportDetailModalRouter({
  openModal,
  submitting,
  selectedVcId,
  onClose,
  handlers,
}: Props) {
  switch (openModal) {
    case 'bind':
      return <BindModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onBind} />;
    case 'mRequest':
      return <MaintenanceRequestModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onMaintenanceRequest} />;
    case 'mLog':
      return <MaintenanceLogModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onMaintenanceLog} />;
    case 'aRequest':
      return <AnalysisRequestModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onAnalysisRequest} />;
    case 'aResult':
      return <AnalysisResultModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onAnalysisResult} />;
    case 'dispose':
      return <DisposeModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onDispose} />;
    case 'correct':
      return <CorrectionModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onCorrect} />;
    case 'vcIssue':
      return <VcIssueModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onVcIssue} />;
    case 'vcRequest':
      return <VcRequestModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onVcRequest} />;
    case 'vcApprove':
      return <VcApproveModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onVcApprove} />;
    case 'vcReject':
      return <VcRejectModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onVcReject} />;
    case 'vcVerify':
      return <VcVerifyModal open credentialId={selectedVcId} onClose={onClose} />;
    case 'vcRevoke':
      return <VcRevokeModal open submitting={submitting} credentialId={selectedVcId} onClose={onClose} onSubmit={handlers.onVcRevoke} />;
    case 'regVerify':
      return <RegulatoryVerificationModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onRegulatoryVerification} />;
    case 'physicalVerify':
      return <PhysicalVerificationModal open submitting={submitting} onClose={onClose} onSubmit={handlers.onPhysicalVerification} />;
    default:
      return null;
  }
}
