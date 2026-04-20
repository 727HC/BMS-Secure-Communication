import { useState } from 'react';
import BaseModal from '../BaseModal';

export interface CorrectionFormData {
  fieldName: string;
  newValue: string;
  reason: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: CorrectionFormData) => void;
}

const FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: 'model', label: '모델명 (model)' },
  { value: 'serialNumber', label: '시리얼번호 (serialNumber)' },
  { value: 'manufacturerName', label: '제조사명 (manufacturerName)' },
  { value: 'manufactureCountry', label: '제조국 (manufactureCountry)' },
  { value: 'cellManufacturer', label: '셀 제조사 (cellManufacturer)' },
  { value: 'cellManufactureCountry', label: '셀 제조국 (cellManufactureCountry)' },
  { value: 'manufactureDate', label: '제조일 (manufactureDate)' },
  { value: 'cellType', label: '셀 타입 (cellType)' },
  { value: 'chemistry', label: '화학계열 (chemistry)' },
  { value: 'cellCount', label: '셀 개수 (cellCount)' },
  { value: 'weight', label: '무게 kg (weight)' },
  { value: 'totalEnergy', label: '총 에너지 kWh (totalEnergy)' },
  { value: 'energyDensity', label: '에너지 밀도 (energyDensity)' },
  { value: 'ratedCapacity', label: '정격 용량 (ratedCapacity)' },
  { value: 'expectedLifespan', label: '예상 수명 (expectedLifespan)' },
  { value: 'voltageRange', label: '전압 범위 (voltageRange)' },
  { value: 'temperatureRange', label: '온도 범위 (temperatureRange)' },
  { value: 'carbonFootprint', label: '탄소발자국 (carbonFootprint)' },
];

const EMPTY: CorrectionFormData = { fieldName: '', newValue: '', reason: '' };

export default function CorrectionModal({ open, submitting, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CorrectionFormData>(EMPTY);

  const handleClose = () => {
    setForm(EMPTY);
    onClose();
  };

  const canSubmit = Boolean(form.fieldName && form.newValue && form.reason) && !submitting;

  return (
    <BaseModal open={open} onClose={handleClose} title="데이터 정정">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>정정할 필드</label>
          <select
            className="sn-input"
            value={form.fieldName}
            onChange={(e) => setForm({ ...form, fieldName: e.target.value })}
          >
            <option value="">— 필드 선택 —</option>
            {FIELD_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>새 값</label>
          <input
            className="sn-input"
            placeholder="변경할 값을 입력"
            value={form.newValue}
            onChange={(e) => setForm({ ...form, newValue: e.target.value })}
          />
        </div>
        <div>
          <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>사유</label>
          <textarea
            className="sn-input"
            rows={3}
            placeholder="정정 사유를 입력"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={handleClose} className="sn-btn sn-btn-ghost">취소</button>
          <button
            onClick={() => onSubmit(form)}
            disabled={!canSubmit}
            className="sn-btn sn-btn-accent"
            style={{ opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? '처리 중...' : '정정'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
