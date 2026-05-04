import BaseModal from '../BaseModal';

export interface AnalysisFormData {
  soh: string;
  soce: string;
  remainingLifeCycle: string;
  recycleAvailable: boolean;
}

interface Props {
  open: boolean;
  submitting: boolean;
  form: AnalysisFormData;
  onChange: (form: AnalysisFormData) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function AnalysisResultModal({ open, submitting, form, onChange, onClose, onSubmit }: Props) {
  return (
    <BaseModal open={open} onClose={onClose} title="분석 결과 제출">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="sn-caption" style={{ margin: 0 }}>
          분석 결과는 여권의 SOH, SOCE, 잔존 수명, 회수 가능 판정 필드로 기록됩니다.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>SOH (%)</label>
            <input
              type="number"
              value={form.soh}
              onChange={(e) => onChange({ ...form, soh: e.target.value })}
              className="sn-input"
            />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>SOCE (%)</label>
            <input
              type="number"
              value={form.soce}
              onChange={(e) => onChange({ ...form, soce: e.target.value })}
              className="sn-input"
            />
          </div>
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>잔여 사이클</label>
          <input
            type="number"
            value={form.remainingLifeCycle}
            onChange={(e) => onChange({ ...form, remainingLifeCycle: e.target.value })}
            className="sn-input"
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-2)' }}>
          <input
            type="checkbox"
            checked={form.recycleAvailable}
            onChange={(e) => onChange({ ...form, recycleAvailable: e.target.checked })}
          />
          재활용 가능 판정
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={onSubmit} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '제출 중...' : '제출'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
