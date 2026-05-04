import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { PageHead } from '../components/ui';
import QrScanResultPanel from '../components/qr-scan/QrScanResultPanel';
import QrScanInputPanel from '../components/qr-scan/QrScanInputPanel';
import QrScanSummaryCard from '../components/qr-scan/QrScanSummaryCard';

interface Passport {
  passportId?: string;
  status?: string;
  model?: string;
  serialNumber?: string;
  manufacturerName?: string;
  chemistry?: string;
  totalEnergy?: number;
  vin?: string;
  did?: string;
  [key: string]: unknown;
}

const NFC_SUPPORTED = typeof window !== 'undefined' && 'NDEFReader' in window;

type QrScannerInstance = {
  stop: () => Promise<unknown>;
  clear: () => void;
};

export default function QrScanPage() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [passportData, setPassportData] = useState<Passport | null>(null);
  const [loadingPassport, setLoadingPassport] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [nfcScanning, setNfcScanning] = useState(false);
  const scannerRef = useRef<QrScannerInstance | null>(null);
  const scannerModuleRef = useRef<Promise<typeof import('html5-qrcode')> | null>(null);

  const loadScannerModule = () => {
    if (!scannerModuleRef.current) {
      scannerModuleRef.current = import('html5-qrcode');
    }
    return scannerModuleRef.current;
  };

  const lookupPassport = async (passportId: string) => {
    const id = passportId.trim();
    if (!id) return;
    setLoadingPassport(true);
    setPassportData(null);
    setScanError(null);
    try {
      const data = await api.get<Passport>(`/passports/${encodeURIComponent(id)}`);
      setPassportData(data);
    } catch {
      setPassportData(null);
      setScanError(`"${id}"에 해당하는 여권을 찾지 못했습니다. ID 형식을 확인하거나 다시 시도하세요.`);
    } finally {
      setLoadingPassport(false);
    }
  };

  const handleScanResult = async (text: string) => {
    setScanResult(text);
    let passportId = text;
    const match = text.match(/passportId=([^&]+)/);
    if (match) passportId = decodeURIComponent(match[1]);
    await lookupPassport(passportId);
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* noop */ }
      try { scannerRef.current.clear(); } catch { /* noop */ }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScan = async () => {
    setScanning(true);
    setScanResult(null);
    setPassportData(null);
    setScanError(null);
    requestAnimationFrame(async () => {
      try {
        const { Html5Qrcode } = await loadScannerModule();
        const html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScanResult(decodedText);
            stopScan();
          },
          () => { /* ignore scan errors */ }
        );
      } catch {
        setScanning(false);
        setScanError('카메라를 시작할 수 없습니다. 카메라 권한을 허용했는지 확인하세요.');
      }
    });
  };

  const startNfc = async () => {
    if (!NFC_SUPPORTED) return;
    try {
      // @ts-expect-error Web NFC NDEFReader not in all TS lib dom versions
      const reader = new NDEFReader();
      await reader.scan();
      setNfcScanning(true);
      setScanError(null);
      // @ts-expect-error NDEFReader event types
      reader.addEventListener('reading', ({ serialNumber, message }) => {
        let passportId = '';
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const decoder = new TextDecoder(record.encoding || 'utf-8');
            passportId = decoder.decode(record.data);
            break;
          }
          if (record.recordType === 'url') {
            const decoder = new TextDecoder();
            const url = decoder.decode(record.data);
            const m = url.match(/passportId=([^&]+)/);
            if (m) { passportId = decodeURIComponent(m[1]); break; }
          }
        }
        if (!passportId && serialNumber) passportId = serialNumber;
        if (passportId) {
          setScanResult('NFC: ' + passportId);
          lookupPassport(passportId);
        }
      });
    } catch {
      setNfcScanning(false);
      setScanError('NFC 스캔을 시작할 수 없습니다. 기기 NFC가 활성화되어 있는지 확인하세요.');
    }
  };

  const stopNfc = () => setNfcScanning(false);

  const handleManualSearch = () => {
    const id = manualId.trim();
    if (id) {
      setScanResult(id);
      lookupPassport(id);
    }
  };

  const goToDetail = () => {
    if (passportData?.passportId) {
      navigate(`/passports/${passportData.passportId}`);
    }
  };

  useEffect(() => {
    return () => { stopScan(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            onRetry={() => { setScanError(null); setScanResult(null); }}
          />
        </div>
      </div>
    </div>
  );
}
