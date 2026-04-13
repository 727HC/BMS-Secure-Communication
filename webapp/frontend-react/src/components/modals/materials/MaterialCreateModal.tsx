import { useState, useEffect, type FormEvent } from 'react';
import BaseModal from '../BaseModal';

export interface MaterialFormData {
  materialId: string;
  name: string;
  origin: string;
  supplier: string;
  quantity: string;
  unit: string;
  certificationId: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: MaterialFormData) => void;
}

function emptyForm(): MaterialFormData {
  return {
    materialId: 'MAT-' + Date.now(),
    name: '',
    origin: '',
    supplier: '',
    quantity: '',
    unit: 'kg',
    certificationId: '',
  };
}

export default function MaterialCreateModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<MaterialFormData>(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const isValid = Boolean(form.name && form.origin && form.supplier && form.quantity);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(form);
  };

  return (
    <BaseModal open={open} onClose={onClose} title="원자재 등록">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>자재 ID (자동생성)</label>
          <input value={form.materialId} readOnly className="sn-input" style={{ color: '#a3a3a3' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#171717', marginBottom: 6 }}>
            명칭 <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            type="text"
            placeholder="예: 리튬, 코발트, 니켈"
            className="sn-input"
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#171717', marginBottom: 6 }}>
              원산지 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              type="text"
              placeholder="예: 호주"
              className="sn-input"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#171717', marginBottom: 6 }}>
              공급업체 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
              type="text"
              placeholder="예: ABC Mining"
              className="sn-input"
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#171717', marginBottom: 6 }}>
              수량 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="sn-input"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#171717', marginBottom: 6 }}>단위</label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="sn-input"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="ton">ton</option>
              <option value="lb">lb</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#171717', marginBottom: 6 }}>
            인증번호 <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#a3a3a3' }}>(선택)</span>
          </label>
          <input
            value={form.certificationId}
            onChange={(e) => setForm({ ...form, certificationId: e.target.value })}
            type="text"
            placeholder="인증서 번호"
            className="sn-input"
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="sn-btn sn-btn-accent"
            style={{
              opacity: !isValid || submitting ? 0.4 : 1,
              cursor: !isValid || submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
