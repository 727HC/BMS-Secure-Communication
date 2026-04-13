import BaseModal from '../BaseModal';

interface Props {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export default function AnalysisRequestModal({ open, submitting, onClose, onSubmit }: Props) {
  return (
    <BaseModal open={open} onClose={onClose} title="분석 요청">
      <p className="sn-caption" style={{ marginBottom: 14 }}>이 여권에 대한 분석 작업을 요청합니다.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} className="sn-btn sn-btn-ghost">취소</button>
        <button onClick={onSubmit} disabled={submitting} className="sn-btn sn-btn-accent">
          {submitting ? '처리 중...' : '요청'}
        </button>
      </div>
    </BaseModal>
  );
}
