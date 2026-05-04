import { PageHead } from '../ui';

interface Props {
  passportId?: string;
  fetchError: string | null;
  onBack: () => void;
}

export default function PassportDetailNotFound({ passportId, fetchError, onBack }: Props) {
  return (
    <div data-page="passport-detail" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1320, width: '100%', margin: '0 auto' }}>
      <PageHead
        title="Dossier unavailable"
        subtitle={fetchError || '요청한 여권을 찾을 수 없습니다. ID와 접근 권한을 확인하세요.'}
        actions={(
          <button onClick={onBack} className="sn-detail-secondary-btn">
            ← 여권 등록부
          </button>
        )}
      />
      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: 'var(--color-text-3)' }}>조회 결과</p>
            <h2 className="sn-detail-dossier-title">상세 파일을 열 수 없습니다</h2>
          </div>
          <span className="sn-detail-inline-stamp">{passportId || 'ID 없음'}</span>
        </div>
        <div style={{ padding: '18px 20px' }}>
          <p className="sn-caption" style={{ margin: 0, maxWidth: '46rem', lineHeight: 1.7 }}>
            등록부에 없는 ID이거나 현재 조직 권한으로 열람할 수 없는 dossier입니다. 여권 등록부에서 ID를 다시 조회하거나 권한이 있는 조직 계정으로 접속하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
