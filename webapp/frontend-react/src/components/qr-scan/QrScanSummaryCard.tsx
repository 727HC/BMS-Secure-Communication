import type { QrPassport } from './QrScanResultPanel';

interface Props {
  scanResult: string | null;
  loadingPassport: boolean;
  passportData: QrPassport | null;
  scanError: string | null;
}

export default function QrScanSummaryCard({
  scanResult,
  loadingPassport,
  passportData,
  scanError,
}: Props) {
  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>식별 데스크</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>현장 식별 접수</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '48rem' }}>
              QR/NFC 스캔은 브라우저에서 식별값만 읽고, 여권 조회는 확인된 ID로 `GET /api/passports/:id`를 호출합니다.
            </p>
          </div>
          <span className="sn-detail-inline-stamp">scan API 없음</span>
        </div>
      </div>

      <div className="sn-summary-grid sn-summary-grid-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title">접수 요약</p>
          <p className="sn-summary-copy-strong">카메라 · NFC · 수동 질의</p>
          <p className="sn-stat-note" style={{ margin: 0, lineHeight: 1.6 }}>
            현장에서 식별값을 확보한 뒤 바로 여권 상세와 데이터 조회로 이동할 수 있습니다.
          </p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">마지막 입력</p>
          <p className="sn-summary-copy-strong" style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all', margin: 0 }}>
            {scanResult || '대기 중'}
          </p>
          <p className="sn-stat-note">식별값</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: 'var(--color-success)' }}>결과 상태</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0 }}>
            {loadingPassport ? '조회 중' : passportData ? '여권 확인' : scanError ? '조회 실패' : '대기'}
          </p>
          <p className="sn-stat-note">상세 연결 상태</p>
        </div>
      </div>
    </section>
  );
}
