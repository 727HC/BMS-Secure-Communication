import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface VcRejectFormData { requestId: string; reason: string; }

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: VcRejectFormData) => void;
}

export default function VcRejectModal({ open, submitting, onClose, onSubmit }: Props) {
  const [requestId, setRequestId] = useState('');
  const [reason, setReason] = useState('');
  const handleClose = () => { setRequestId(''); setReason(''); onClose(); };
  return (
    <BaseModal open={open} onClose={handleClose} title="VC 발급 거부">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input className="sn-input" placeholder="거부할 요청 ID" value={requestId} onChange={(e) => setRequestId(e.target.value)} />
        <textarea className="sn-input" rows={4} placeholder="거부 사유" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit({ requestId, reason })} disabled={submitting || !requestId.trim() || !reason.trim()} className="sn-btn sn-btn-danger">{submitting ? '처리 중...' : '거부'}</button>
        </div>
      </div>
    </BaseModal>
  );
}
