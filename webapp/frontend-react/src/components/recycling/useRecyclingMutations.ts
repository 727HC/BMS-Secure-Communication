import { useState } from 'react';
import { api } from '../../lib/api';
import { toastFromError } from '../../lib/chaincodeErrorMessages';
import type { Passport } from './lib';
import type { AnalysisFormData } from '../modals/recycling/AnalysisResultModal';
import type { ExtractEntry } from '../modals/recycling/ExtractModal';

interface Args {
  selectedPassport: Passport | null;
  onAfterSuccess: () => Promise<void> | void;
  onClose: () => void;
}

export function useRecyclingMutations({ selectedPassport, onAfterSuccess, onClose }: Args) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    const { toast, debug, category } = toastFromError(err);
    console.warn('[recycling] mutation failed', { category, debug });
    setSubmitError(toast);
  };

  const requestAnalysis = async (passport: Passport) => {
    if (!passport.passportId) return;
    setSubmitError(null);
    try {
      await api.post(`/analysis/${passport.passportId}/request`, {});
      await onAfterSuccess();
    } catch (err) {
      handleError(err);
    }
  };

  const withSelectedSubmit = async (fn: (passportId: string) => Promise<unknown>) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await fn(selectedPassport.passportId);
      onClose();
      await onAfterSuccess();
    } catch (err) {
      handleError(err);
    }
    finally { setSubmitting(false); }
  };

  const submitAnalysisResult = (form: AnalysisFormData) =>
    withSelectedSubmit((id) => api.post(`/analysis/${id}/result`, {
      soh: Number(form.soh),
      soce: Number(form.soce),
      remainingLifeCycle: Number(form.remainingLifeCycle),
      recycleAvailable: form.recycleAvailable,
    }));

  const submitRecycleToggle = (available: boolean) =>
    withSelectedSubmit((id) => api.put(`/recycling/${id}/availability`, { available }));

  const submitExtract = (entries: ExtractEntry[]) =>
    withSelectedSubmit((id) => {
      const recyclingRates: Record<string, number> = {};
      entries.forEach((e) => {
        if (e.key.trim()) recyclingRates[e.key.trim()] = Number(e.value);
      });
      return api.post(`/recycling/${id}/extract`, { recyclingRates });
    });

  const submitDispose = () =>
    withSelectedSubmit((id) => api.post(`/recycling/${id}/dispose`, {}));

  return {
    submitting,
    submitError,
    setSubmitError,
    requestAnalysis,
    submitAnalysisResult,
    submitRecycleToggle,
    submitExtract,
    submitDispose,
  };
}
