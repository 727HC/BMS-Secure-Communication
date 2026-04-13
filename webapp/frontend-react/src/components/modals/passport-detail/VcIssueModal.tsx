import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface VcIssueFormData {
  credType: string;
  holderDid: string;
  expiresAt: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: VcIssueFormData) => void;
}

const EMPTY: VcIssueFormData = { credType: 'BATTERY_PASSPORT', holderDid: '', expiresAt: '' };

export default function VcIssueModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<VcIssueFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="VC 발급">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <select
          className="sn-input"
          value={form.credType}
          onChange={(e) => setForm({ ...form, credType: e.target.value })}
        >
          <option value="BATTERY_PASSPORT">BATTERY_PASSPORT</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="ANALYSIS">ANALYSIS</option>
          <option value="RECYCLE">RECYCLE</option>
        </select>
        <input
          className="sn-input"
          placeholder="Holder DID"
          value={form.holderDid}
          onChange={(e) => setForm({ ...form, holderDid: e.target.value })}
        />
        <input
          className="sn-input"
          type="date"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '처리 중...' : '발급'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
