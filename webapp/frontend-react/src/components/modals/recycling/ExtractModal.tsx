import { useState, useEffect } from 'react';
import BaseModal from '../BaseModal';

export interface ExtractEntry {
  key: string;
  value: string;
}

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (entries: ExtractEntry[]) => void;
}

const DEFAULT_ENTRIES: ExtractEntry[] = [
  { key: '리튬', value: '' },
  { key: '코발트', value: '' },
];

export default function ExtractModal({ open, submitting, onClose, onSubmit }: Props) {
  const [entries, setEntries] = useState<ExtractEntry[]>(DEFAULT_ENTRIES);

  useEffect(() => {
    if (open) setEntries(DEFAULT_ENTRIES);
  }, [open]);

  const addEntry = () => setEntries([...entries, { key: '', value: '' }]);
  const removeEntry = (idx: number) => setEntries(entries.filter((_, i) => i !== idx));
  const updateEntry = (idx: number, field: 'key' | 'value', val: string) => {
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: val };
    setEntries(next);
  };

  return (
    <BaseModal open={open} onClose={onClose} title="원자재 추출 기록" maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {entries.map((e, idx) => (
          <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
            <input
              className="sn-input"
              placeholder="원자재명"
              value={e.key}
              onChange={(ev) => updateEntry(idx, 'key', ev.target.value)}
            />
            <input
              className="sn-input"
              placeholder="회수율 %"
              type="number"
              value={e.value}
              onChange={(ev) => updateEntry(idx, 'value', ev.target.value)}
            />
            <button
              onClick={() => removeEntry(idx)}
              style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            >
              삭제
            </button>
          </div>
        ))}
        <button onClick={addEntry} className="sn-btn sn-btn-ghost">+ 추가</button>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
          <button onClick={() => onSubmit(entries)} disabled={submitting} className="sn-btn sn-btn-accent">
            {submitting ? '저장 중...' : '기록'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
