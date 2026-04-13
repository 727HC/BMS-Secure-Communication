import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface MaintenanceLogFormData {
  maintenanceType: string;
  description: string;
  technician: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: MaintenanceLogFormData) => void;
}

const EMPTY: MaintenanceLogFormData = { maintenanceType: 'routine', description: '', technician: '' };

export default function MaintenanceLogModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<MaintenanceLogFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="정비 완료 기록">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <select
          className="sn-input"
          value={form.maintenanceType}
          onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
        >
          <option value="routine">정기점검</option>
          <option value="repair">수리</option>
          <option value="recall">리콜</option>
        </select>
        <input
          className="sn-input"
          placeholder="담당자"
          value={form.technician}
          onChange={(e) => setForm({ ...form, technician: e.target.value })}
        />
        <textarea
          className="sn-input"
          rows={4}
          placeholder="설명"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button
            onClick={() => onSubmit(form)}
            disabled={submitting}
            className="sn-btn sn-btn-accent"
          >
            {submitting ? '처리 중...' : '완료'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
