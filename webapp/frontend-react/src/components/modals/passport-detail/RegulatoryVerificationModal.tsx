import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface RegulatoryVerificationFormData {
  status: 'VERIFIED' | 'PARTIAL' | 'PENDING' | 'FAILED';
  evidenceIds: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: RegulatoryVerificationFormData) => void;
}

const EMPTY: RegulatoryVerificationFormData = { status: 'PENDING', evidenceIds: '' };

export default function RegulatoryVerificationModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<RegulatoryVerificationFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="규제 검증 상태 업데이트">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <select className="sn-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as RegulatoryVerificationFormData['status'] })}>
          <option value="VERIFIED">VERIFIED</option>
          <option value="PARTIAL">PARTIAL</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
        </select>
        <input
          className="sn-input"
          placeholder="증빙 VC ID를 쉼표로 구분해 입력"
          value={form.evidenceIds}
          onChange={(e) => setForm({ ...form, evidenceIds: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '처리 중...' : '업데이트'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
