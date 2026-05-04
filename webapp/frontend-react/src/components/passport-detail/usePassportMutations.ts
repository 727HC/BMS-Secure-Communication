import { useState } from 'react';
import { api } from '../../lib/api';
import { toastFromError } from '../../lib/chaincodeErrorMessages';
import type { Passport } from './types';
import type { ModalHandlers } from './PassportDetailModalRouter';

interface Args {
  passport: Passport | null;
  selectedVcId: string | null;
  onAfterSuccess: () => Promise<void> | void;
  onClose: () => void;
}

interface Return {
  submitting: boolean;
  submitError: string | null;
  setSubmitError: (msg: string | null) => void;
  handlers: ModalHandlers;
}

export function usePassportMutations({
  passport,
  selectedVcId,
  onAfterSuccess,
  onClose,
}: Args): Return {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const withSubmit = async (fn: () => Promise<unknown>) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await fn();
      onClose();
      await onAfterSuccess();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[passport-detail] mutation failed', { category, debug });
      setSubmitError(toast);
    }
    finally { setSubmitting(false); }
  };

  const handlers: ModalHandlers = {
    onBind: (data) =>
      passport?.passportId && withSubmit(() => api.put(`/passports/${passport.passportId}/bind`, data)),
    onMaintenanceRequest: (data) =>
      passport?.passportId && withSubmit(() => api.post(`/maintenance/${passport.passportId}/request`, data)),
    onMaintenanceLog: (data) =>
      passport?.passportId && withSubmit(() => api.post(`/maintenance/${passport.passportId}/log`, data)),
    onAnalysisRequest: () =>
      passport?.passportId && withSubmit(() => api.post(`/analysis/${passport.passportId}/request`, {})),
    onAnalysisResult: (data) =>
      passport?.passportId && withSubmit(() =>
        api.post(`/analysis/${passport.passportId}/result`, {
          soh: Number(data.soh),
          soce: Number(data.soce),
          remainingLifeCycle: Number(data.remainingLifeCycle),
          recycleAvailable: data.recycleAvailable,
        })
      ),
    onDispose: () =>
      passport?.passportId && withSubmit(() => api.post(`/recycling/${passport.passportId}/dispose`, {})),
    onCorrect: (data) =>
      passport?.passportId && withSubmit(() => api.post(`/passports/${passport.passportId}/correct`, data)),
    onVcIssue: (data) =>
      passport?.passportId && withSubmit(() => api.post('/vc/issue', { passportId: passport.passportId, ...data })),
    onVcRequest: (data) =>
      passport?.passportId && withSubmit(() => api.post('/vc/request', { passportId: passport.passportId, credType: data.credType })),
    onVcApprove: (data) =>
      withSubmit(() => api.post(`/vc/request/${encodeURIComponent(data.requestId)}/approve`, {})),
    onVcReject: (data) =>
      withSubmit(() => api.post(`/vc/request/${encodeURIComponent(data.requestId)}/reject`, { reason: data.reason })),
    onVcRevoke: (data) =>
      selectedVcId && withSubmit(() => api.post('/vc/revoke', { credentialId: selectedVcId, reason: data.reason })),
    onRegulatoryVerification: (data) =>
      passport?.passportId && withSubmit(() => api.put(`/passports/${passport.passportId}/regulatory-verification`, {
        status: data.status,
        evidenceIds: data.evidenceIds.split(',').map((v) => v.trim()).filter(Boolean),
      })),
    onPhysicalVerification: (data) =>
      passport?.passportId && withSubmit(() => api.put(`/passports/${passport.passportId}/physical-verification`, {
        signals: {
          socMatched: data.socMatched,
          didMatched: data.didMatched,
          vinMatched: data.vinMatched,
          fcMatched: data.fcMatched,
        },
        reason: data.reason,
      })),
  };

  return { submitting, submitError, setSubmitError, handlers };
}
