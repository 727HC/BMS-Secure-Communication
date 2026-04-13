import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface AnalysisResultFormData {
  soh: string;
  soce: string;
  remainingLifeCycle: string;
  recycleAvailable: boolean;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: AnalysisResultFormData) => void;
}

const EMPTY: AnalysisResultFormData = { soh: '', soce: '', remainingLifeCycle: '', recycleAvailable: false };

export default function AnalysisResultModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AnalysisResultFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  return (
    <BaseModal open={open} onClose={handleClose} title="분석 결과 제출">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <input
            className="sn-input"
            type="number"
            placeholder="SOH %"
            value={form.soh}
            onChange={(e) => setForm({ ...form, soh: e.target.value })}
          />
          <input
            className="sn-input"
            type="number"
            placeholder="SOCE %"
            value={form.soce}
            onChange={(e) => setForm({ ...form, soce: e.target.value })}
          />
        </div>
        <input
          className="sn-input"
          type="number"
          placeholder="잔여 사이클"
          value={form.remainingLifeCycle}
          onChange={(e) => setForm({ ...form, remainingLifeCycle: e.target.value })}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
          <input
            type="checkbox"
            checked={form.recycleAvailable}
            onChange={(e) => setForm({ ...form, recycleAvailable: e.target.checked })}
          />
          재활용 가능 판정
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '처리 중...' : '제출'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
