import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface CorrectionFormData {
  fieldName: string;
  newValue: string;
  reason: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: CorrectionFormData) => void;
}

const EMPTY: CorrectionFormData = { fieldName: '', newValue: '', reason: '' };

export default function CorrectionModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CorrectionFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="데이터 정정">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="sn-input"
          placeholder="필드명"
          value={form.fieldName}
          onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
        />
        <input
          className="sn-input"
          placeholder="새 값"
          value={form.newValue}
          onChange={(e) => setForm({ ...form, newValue: e.target.value })}
        />
        <textarea
          className="sn-input"
          rows={3}
          placeholder="사유"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '처리 중...' : '정정'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
