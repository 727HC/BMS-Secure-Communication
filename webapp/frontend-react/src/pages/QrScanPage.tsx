import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getStatusBadge, STATUS_LABELS } from '../lib/helpers';
import Spinner from '../components/ui/Spinner';

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
    try {
      const data = await api.get<Passport>(`/passports/${encodeURIComponent(id)}`);
      setPassportData(data);
    } catch {
      setPassportData(null);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="sn-page-head">
        <div className="sn-page-head-main">
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem', color: '#0f766e' }}>식별 접수</p>
          <h1 className="sn-page-title">식별 진입점</h1>
          <p className="sn-page-subtitle">QR·NFC·수동 입력으로 여권을 식별하고 상세 조회로 연결합니다.</p>
        </div>
      </div>

      <div className="sn-panel sn-summary-grid sn-summary-grid-3">
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
          <p className="sn-eyebrow sn-stat-card-title" style={{ color: '#059669' }}>결과 상태</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0 }}>
            {loadingPassport ? '조회 중' : passportData ? '여권 확인' : '대기'}
          </p>
          <p className="sn-stat-note">상세 연결 상태</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="sn-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>카메라 스캔</span>
              {!scanning ? (
                <button
                  onClick={startScan}
                  onMouseEnter={loadScannerModule}
                  onFocus={loadScannerModule}
                  className="sn-btn sn-btn-accent"
                  style={{ fontSize: '0.875rem', padding: '6px 12px' }}
                >
                  카메라 열기
                </button>
              ) : (
                <button onClick={stopScan} className="sn-btn sn-btn-danger" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                  카메라 닫기
                </button>
              )}
            </div>
            <div style={{ padding: 16 }}>
              {scanning ? (
                <div id="qr-reader" style={{ borderRadius: 10, overflow: 'hidden' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
                  <div style={{ width: 120, height: 120, position: 'relative', marginBottom: 20 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 24, height: 24, borderTop: '3px solid #059669', borderLeft: '3px solid #059669', borderRadius: '4px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 24, height: 24, borderTop: '3px solid #059669', borderRight: '3px solid #059669', borderRadius: '0 4px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 24, height: 24, borderBottom: '3px solid #059669', borderLeft: '3px solid #059669', borderRadius: '0 0 0 4px' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderBottom: '3px solid #059669', borderRight: '3px solid #059669', borderRadius: '0 0 4px 0' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="40" height="40" fill="none" stroke="#6b7280" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.5 }}>
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <line x1="14" y1="14" x2="14" y2="14.01" />
                        <line x1="21" y1="14" x2="21" y2="14.01" />
                      </svg>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 4px' }}>카메라를 열어 QR 코드를 스캔하세요</p>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>배터리 여권 QR 코드를 인식하면 자동으로 조회합니다</p>
                </div>
              )}
            </div>
          </div>

          <div className="sn-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>NFC 스캔</span>
                <span style={{ fontSize: '0.8125rem', padding: '1px 6px', borderRadius: 4, background: NFC_SUPPORTED ? '#eff6ff' : '#fef2f2', color: NFC_SUPPORTED ? '#2563eb' : '#dc2626' }}>
                  {NFC_SUPPORTED ? 'Web NFC' : '미지원'}
                </span>
              </div>
              {NFC_SUPPORTED && !nfcScanning && (
                <button onClick={startNfc} className="sn-btn sn-btn-accent" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                  NFC 활성화
                </button>
              )}
              {NFC_SUPPORTED && nfcScanning && (
                <button onClick={stopNfc} className="sn-btn sn-btn-danger" style={{ fontSize: '0.875rem', padding: '6px 12px' }}>
                  NFC 중지
                </button>
              )}
            </div>
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {NFC_SUPPORTED && nfcScanning && (
                <>
                  <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', margin: '0 0 4px' }}>NFC 대기 중...</p>
                  <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>배터리에 붙어 있는 NFC 태그를 기기에 가까이 대세요</p>
                </>
              )}
              {NFC_SUPPORTED && !nfcScanning && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>NFC를 활성화하여 태그를 읽으세요</p>
              )}
              {!NFC_SUPPORTED && (
                <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>현재 환경에서는 Web NFC를 지원하지 않습니다.</p>
              )}
            </div>
          </div>

          <div className="sn-panel" style={{ padding: '12px 16px' }}>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#171717', margin: '0 0 12px' }}>수동 입력</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleManualSearch()}
                type="text"
                placeholder="여권 ID를 입력하세요 (예: BP-SDI-001)"
                className="sn-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleManualSearch}
                disabled={!manualId.trim()}
                className="sn-btn sn-btn-accent"
                style={{
                  padding: '8px 18px',
                  opacity: !manualId.trim() ? 0.4 : 1,
                  cursor: !manualId.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                조회
              </button>
            </div>
          </div>
        </div>

        <div>
          {loadingPassport ? (
            <Spinner />
          ) : passportData ? (
            <div className="sn-panel" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#16a34a' }}>식별 결과 확인됨</span>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#171717', margin: 0 }}>{passportData.model || '-'}</h3>
                  <span className={`bp-stamp ${getStatusBadge(passportData.status || 'DISPOSED').bg} ${getStatusBadge(passportData.status || 'DISPOSED').text} ${getStatusBadge(passportData.status || 'DISPOSED').border}`}>
                    {STATUS_LABELS[passportData.status || 'DISPOSED'] || passportData.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { k: '여권 ID', v: passportData.passportId, mono: true },
                    { k: '시리얼번호', v: passportData.serialNumber || '-', mono: true },
                    { k: '제조사', v: passportData.manufacturerName || '-' },
                    { k: '화학물질', v: passportData.chemistry || '-' },
                    { k: '총 에너지', v: passportData.totalEnergy ? `${passportData.totalEnergy} kWh` : '-' },
                    { k: 'VIN', v: passportData.vin || '미바인딩', mono: true },
                  ].map(({ k, v, mono }) => (
                    <div key={k} style={{ background: '#fafafa', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                      <p className="sn-eyebrow" style={{ margin: 0 }}>{k}</p>
                      <p
                        style={{
                          fontFamily: mono ? 'var(--font-mono)' : undefined,
                          fontSize: mono ? '0.75rem' : '0.85rem',
                          fontWeight: 500,
                          color: '#525252',
                          margin: '4px 0 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {v}
                      </p>
                    </div>
                  ))}
                </div>

                {passportData.did && (
                  <div style={{ background: '#f0fdf4', boxShadow: 'inset 0 0 0 1px rgba(22,163,74,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                    <p className="sn-eyebrow" style={{ color: '#16a34a', margin: 0 }}>DID</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#16a34a', margin: '4px 0 0', wordBreak: 'break-all' }}>
                      {passportData.did}
                    </p>
                  </div>
                )}

                <button
                  onClick={goToDetail}
                  className="sn-btn sn-btn-accent"
                  style={{ width: '100%', padding: 12, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  여권 상세 보기 →
                </button>
              </div>
            </div>
          ) : (
            <div className="sn-panel" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="28" height="28" fill="none" stroke="#a3a3a3" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#525252', margin: '0 0 4px' }}>식별값을 입력하거나 스캔해 조회를 시작하세요</p>
              <p style={{ fontSize: '0.8125rem', color: '#a3a3a3' }}>조회 결과가 여기에 쌓입니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
