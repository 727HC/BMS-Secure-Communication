import { useState } from 'react';
import { api } from '../../lib/api';
import { toastFromError } from '../../lib/chaincodeErrorMessages';
import type { Passport } from './lib';
import type { MaintenanceRequestFormData } from '../modals/maintenance/MaintenanceRequestModal';
import type { MaintenanceLogFormData } from '../modals/maintenance/MaintenanceLogModal';
import type { AccidentFormData } from '../modals/maintenance/AccidentLogModal';

interface Args {
  selectedPassport: Passport | null;
  onAfterSuccess: () => Promise<void> | void;
  onClose: () => void;
}

export function useMaintenanceMutations({ selectedPassport, onAfterSuccess, onClose }: Args) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const withSelectedSubmit = async (fn: (passportId: string) => Promise<unknown>) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await fn(selectedPassport.passportId);
      onClose();
      await onAfterSuccess();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  const submitRequest = (form: MaintenanceRequestFormData) =>
    withSelectedSubmit((id) => api.post(`/maintenance/${id}/request`, form));

  const submitLog = (form: MaintenanceLogFormData) =>
    withSelectedSubmit((id) => api.post(`/maintenance/${id}/log`, form));

  const submitAccident = (data: AccidentFormData) =>
    withSelectedSubmit((id) => api.post(`/maintenance/${id}/accident`, data));

  return { submitting, submitError, submitRequest, submitLog, submitAccident };
}
