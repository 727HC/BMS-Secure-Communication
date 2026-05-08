import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface PhysicalVerificationFormData {
  socMatched: boolean;
  didMatched: boolean;
  vinMatched: boolean;
  fcMatched: boolean;
  bmsIdentifierMatched: boolean;
  reason: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: PhysicalVerificationFormData) => void;
}

const EMPTY: PhysicalVerificationFormData = {
  socMatched: true,
  didMatched: true,
  vinMatched: true,
  fcMatched: true,
  bmsIdentifierMatched: true,
  reason: '',
};

export default function PhysicalVerificationModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<PhysicalVerificationFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  const toggle = (key: keyof Omit<PhysicalVerificationFormData, 'reason'>) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="실물-이력 검증">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(['socMatched', 'didMatched', 'vinMatched', 'fcMatched', 'bmsIdentifierMatched'] as const).map((key) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#334155' }}>
            <input type="checkbox" checked={form[key]} onChange={() => toggle(key)} />
            {key}
          </label>
        ))}
        <textarea
          className="sn-input"
          rows={4}
          placeholder="검증 근거를 입력하세요"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting || !form.reason.trim()} className="sn-btn sn-btn-accent">
            {submitting ? '처리 중...' : '검증 저장'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
