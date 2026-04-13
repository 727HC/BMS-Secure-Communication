import BaseModal from './BaseModal';

interface StubProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: () => void;
}

function makeStub(title: string) {
  return function StubComponent({ open, onClose, onSubmit }: StubProps) {
    return (
      <BaseModal open={open} onClose={onClose} title={title}>
        <p className="sn-caption" style={{ marginBottom: 16 }}>기능 준비 중입니다.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="sn-btn sn-btn-ghost" onClick={onClose}>닫기</button>
          {onSubmit && <button className="sn-btn sn-btn-accent" onClick={onSubmit}>확인</button>}
        </div>
      </BaseModal>
    );
  };
}

export const BindModal = makeStub('VIN 바인딩');
export const AnalysisRequestModal = makeStub('분석 요청');
export const AnalysisResultModal = makeStub('분석 결과 제출');
export const MaintenanceRequestModal = makeStub('정비 요청');
export const MaintenanceLogModal = makeStub('정비 이력');
export const RecyclingExtractModal = makeStub('원자재 추출');
export const RecyclingDisposeModal = makeStub('폐기 처리');
export const MaterialModal = makeStub('원자재 등록');
export const BmuInvalidateModal = makeStub('BMU 기록 무효화');
export const VcIssueModal = makeStub('VC 발급');
export const CorrectionModal = makeStub('데이터 정정');
