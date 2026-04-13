import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface VcRequestFormData {
  credType: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: VcRequestFormData) => void;
}

const EMPTY: VcRequestFormData = { credType: 'BATTERY_PASSPORT' };

export default function VcRequestModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<VcRequestFormData>(EMPTY);
  const handleClose = () => { setForm(EMPTY); onClose(); };
  return (
    <BaseModal open={open} onClose={handleClose} title="VC 발급 요청">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <select className="sn-input" value={form.credType} onChange={(e) => setForm({ credType: e.target.value })}>
          <option value="BATTERY_PASSPORT">BATTERY_PASSPORT</option>
          <option value="BATTERY_HEALTH">BATTERY_HEALTH</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="COMPLIANCE">COMPLIANCE</option>
          <option value="RECYCLING">RECYCLING</option>
        </select>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} className="sn-btn sn-btn-accent">{submitting ? '처리 중...' : '요청'}</button>
        </div>
      </div>
    </BaseModal>
  );
}
