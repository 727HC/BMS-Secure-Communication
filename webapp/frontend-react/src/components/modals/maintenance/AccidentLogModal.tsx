import { useState, useEffect } from 'react';
import BaseModal from '../BaseModal';

export interface AccidentFormData {
  severity: string;
  description: string;
  reporter: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  initialReporter?: string;
  onClose: () => void;
  onSubmit: (data: AccidentFormData) => void;
}

const SEVERITY_OPTIONS = [
  { value: 'minor', label: '경미' },
  { value: 'moderate', label: '보통' },
  { value: 'severe', label: '심각' },
];

export default function AccidentLogModal({ open, submitting, initialReporter = '', onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AccidentFormData>({
    severity: 'minor',
    description: '',
    reporter: initialReporter,
  });

  useEffect(() => {
    if (open) {
      setForm({ severity: 'minor', description: '', reporter: initialReporter });
    }
  }, [open, initialReporter]);

  return (
    <BaseModal open={open} onClose={onClose} title="사고 기록">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>심각도</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {SEVERITY_OPTIONS.map((s) => {
              const active = form.severity === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm({ ...form, severity: s.value })}
                  style={{
                    padding: '8px 14px',
                    border: active ? '1px solid #dc2626' : '1px solid rgba(0,0,0,0.08)',
                    background: active ? '#fef2f2' : '#fff',
                    color: active ? '#dc2626' : '#64748b',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>보고자</label>
          <input
            className="sn-input"
            value={form.reporter}
            onChange={(e) => setForm({ ...form, reporter: e.target.value })}
          />
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>설명</label>
          <textarea
            className="sn-input"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(form)} disabled={submitting} className="sn-btn sn-btn-danger">
            {submitting ? '등록 중...' : '사고 기록'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
