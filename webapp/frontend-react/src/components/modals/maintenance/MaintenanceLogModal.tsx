import BaseModal from '../BaseModal';
import { MAINTENANCE_TYPES } from '../../maintenance/lib';

export interface MaintenanceLogFormData {
  maintenanceType: string;
  description: string;
  technician: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  form: MaintenanceLogFormData;
  onChange: (form: MaintenanceLogFormData) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function MaintenanceLogModal({ open, submitting, form, onChange, onClose, onSubmit }: Props) {
  return (
    <BaseModal open={open} onClose={onClose} title="Service task 완료 기록">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>작업 유형</label>
          <select
            className="sn-input"
            value={form.maintenanceType}
            onChange={(e) => onChange({ ...form, maintenanceType: e.target.value })}
          >
            {MAINTENANCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>서비스 담당자</label>
          <input
            className="sn-input"
            value={form.technician}
            onChange={(e) => onChange({ ...form, technician: e.target.value })}
          />
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>완료 설명</label>
          <textarea
            className="sn-input"
            rows={4}
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={onSubmit} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '등록 중...' : '완료 기록'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
