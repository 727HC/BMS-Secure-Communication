import { useState, useEffect } from 'react';
import BaseModal from '../BaseModal';

export interface VcRevokeFormData {
  reason: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  credentialId: string | null;
  onClose: () => void;
  onSubmit: (data: VcRevokeFormData) => void;
}

export default function VcRevokeModal({ open, submitting, credentialId, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ reason });
  };

  return (
    <BaseModal open={open} onClose={onClose} title="VC 폐기">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="sn-caption">
          <strong style={{ fontFamily: 'var(--font-mono)' }}>{credentialId}</strong><br/>
          이 증명서를 폐기합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="sn-input-group">
          <label className="sn-label">폐기 사유</label>
          <input
            className="sn-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 정보 오류, 기간 만료 등"
            required
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button type="submit" disabled={submitting || !reason} className="sn-btn sn-btn-danger">
            {submitting ? '처리 중...' : '폐기 확정'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
