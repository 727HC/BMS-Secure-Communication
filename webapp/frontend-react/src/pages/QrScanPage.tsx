import { PageHead } from '../components/ui';
import QrScanResultPanel from '../components/qr-scan/QrScanResultPanel';
import QrScanInputPanel from '../components/qr-scan/QrScanInputPanel';
import QrScanSummaryCard from '../components/qr-scan/QrScanSummaryCard';
import { useQrScanner } from '../components/qr-scan/useQrScanner';

export default function QrScanPage() {
  const {
    scanning,
    scanResult,
    passportData,
    loadingPassport,
    scanError,
    manualId,
    setManualId,
    nfcScanning,
    startScan,
    stopScan,
    startNfc,
    stopNfc,
    handleManualSearch,
    goToDetail,
    retry,
  } = useQrScanner();


  return (
    <div data-page="qr-scan" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="현장 식별 조회"
        subtitle="현장에서 확보한 QR, NFC, 수동 식별값으로 여권 dossier를 찾고 상세 화면으로 이어갑니다."
      />

      <QrScanSummaryCard
        scanResult={scanResult}
        loadingPassport={loadingPassport}
        passportData={passportData}
        scanError={scanError}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <QrScanInputPanel
          scanning={scanning}
          onStartScan={startScan}
          onStopScan={stopScan}
          nfcScanning={nfcScanning}
          onStartNfc={startNfc}
          onStopNfc={stopNfc}
          manualId={manualId}
          onManualIdChange={setManualId}
          onManualSearch={handleManualSearch}
        />

        <div>
          <QrScanResultPanel
            loadingPassport={loadingPassport}
            passportData={passportData}
            scanError={scanError}
            onGoToDetail={goToDetail}
            onRetry={retry}
          />
        </div>
      </div>
    </div>
  );
}
