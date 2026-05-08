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
  passportDid?: string;
  onClose: () => void;
  onSubmit: (data: VcIssueFormData) => void;
}

const EMPTY = { credType: 'BATTERY_PASSPORT', expiresAt: '' };

export default function VcIssueModal({ open, submitting, passportDid = '', onClose, onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY);
  const holderDid = passportDid.trim();

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({ ...form, holderDid });
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
          <option value="BATTERY_HEALTH">BATTERY_HEALTH</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
          <option value="COMPLIANCE">COMPLIANCE</option>
          <option value="RECYCLING">RECYCLING</option>
        </select>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#64748b', fontSize: 12 }}>
          Passport DID
          <input
            aria-label="Passport DID"
            className="sn-input"
            readOnly
            placeholder="여권 DID 없음"
            value={holderDid}
          />
        </label>
        <p style={{ margin: 0, color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
          VC holder는 원장 여권 DID와 동일해야 합니다. 다른 소유자 DID는 발급되지 않습니다.
        </p>
        <input
          className="sn-input"
          type="date"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={handleSubmit} disabled={submitting || !holderDid} className="sn-btn sn-btn-accent">
            {submitting ? '처리 중...' : '발급'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
