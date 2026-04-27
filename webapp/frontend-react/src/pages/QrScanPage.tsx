import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getStatusBadge, STATUS_LABELS } from '../lib/helpers';
import { PageHead, Spinner } from '../components/ui';

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

/** 3단계 플로우 설명 아이콘 — 순수 SVG path, 가짜 일러 금지 */
function FlowStep({ step, label, desc }: { step: number; label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'var(--color-surface-accent)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: 'var(--color-accent)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {step}
      </div>
      <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-1)', margin: 0, textAlign: 'center' }}>{label}</p>
      <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

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
        eyebrow="Field identify"
        eyebrowColor="var(--color-accent)"
        title="Field Identify Search"
        subtitle="현장에서 확보한 QR, NFC, 수동 식별값으로 여권 dossier를 찾고 상세 화면으로 이어갑니다."
        actions={(
          <div className="sn-kpi-mini">
            <p className="sn-eyebrow" style={{ margin: '0 0 0.3rem' }}>Lookup state</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>
              {loadingPassport ? 'RUN' : passportData ? 'OK' : scanError ? 'ERR' : 'IDLE'}
            </p>
          </div>
        )}
      />

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>Identify desk</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="sn-section-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>Camera QR identify</span>
              {!scanning ? (
                <button
                  onClick={startScan}
                  className="sn-btn sn-btn-accent"
                  style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}
                >
                  카메라 열기
                </button>
              ) : (
                <button onClick={stopScan} className="sn-btn sn-btn-danger" style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}>
                  카메라 닫기
                </button>
              )}
            </div>
            <div style={{ padding: 16 }}>
              {scanning ? (
                <div id="qr-reader" style={{ borderRadius: 10, overflow: 'hidden' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: 16 }}>
                  {/* 헤드라인 */}
                  <div>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 6px' }}>
                      여권 QR 또는 NFC로 배터리 신원 확인
                    </p>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0 }}>
                      배터리 표면의 QR 코드나 NFC 태그를 인식하면 자동으로 조회합니다
                    </p>
                  </div>

                  {/* QR 뷰파인더 아이콘 */}
                  <div style={{ width: 96, height: 96, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, borderTop: '2px solid var(--color-accent)', borderLeft: '2px solid var(--color-accent)', borderRadius: '3px 0 0 0' }} />
                    <div style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, borderTop: '2px solid var(--color-accent)', borderRight: '2px solid var(--color-accent)', borderRadius: '0 3px 0 0' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, borderBottom: '2px solid var(--color-accent)', borderLeft: '2px solid var(--color-accent)', borderRadius: '0 0 0 3px' }} />
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderBottom: '2px solid var(--color-accent)', borderRight: '2px solid var(--color-accent)', borderRadius: '0 0 3px 0' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="36" height="36" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.45 }}>
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <line x1="14" y1="14" x2="14" y2="14.01" />
                        <line x1="21" y1="14" x2="21" y2="14.01" />
                      </svg>
                    </div>
                  </div>

                  {/* 3단계 플로우 */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, width: '100%', maxWidth: 340 }}>
                    <FlowStep step={1} label="스캔" desc="QR·NFC·수동 입력" />
                    <div style={{ paddingTop: 18, color: 'var(--color-text-3)', fontSize: '0.75rem', flexShrink: 0 }}>›</div>
                    <FlowStep step={2} label="인증" desc="체인에서 여권 조회" />
                    <div style={{ paddingTop: 18, color: 'var(--color-text-3)', fontSize: '0.75rem', flexShrink: 0 }}>›</div>
                    <FlowStep step={3} label="상세 이동" desc="이력·VC·분석 확인" />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="sn-section-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>NFC identify</span>
                <span style={{ fontSize: '0.8125rem', padding: '1px 6px', borderRadius: 4, background: NFC_SUPPORTED ? 'var(--color-surface-accent)' : 'var(--color-danger-soft)', color: NFC_SUPPORTED ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                  {NFC_SUPPORTED ? 'Web NFC' : '미지원'}
                </span>
              </div>
              {NFC_SUPPORTED && !nfcScanning && (
                <button onClick={startNfc} className="sn-btn sn-btn-accent" style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}>
                  NFC 활성화
                </button>
              )}
              {NFC_SUPPORTED && nfcScanning && (
                <button onClick={stopNfc} className="sn-btn sn-btn-danger" style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}>
                  NFC 중지
                </button>
              )}
            </div>
            <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              {NFC_SUPPORTED && nfcScanning && (
                <>
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-accent)', margin: '0 0 4px' }}>NFC 대기 중...</p>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>배터리에 붙어 있는 NFC 태그를 기기에 가까이 대세요</p>
                </>
              )}
              {NFC_SUPPORTED && !nfcScanning && (
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>NFC를 활성화하여 태그를 읽으세요</p>
              )}
              {!NFC_SUPPORTED && (
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>현재 환경에서는 Web NFC를 지원하지 않습니다.</p>
              )}
            </div>
          </section>

          <section className="sn-section-card" style={{ padding: '14px 18px' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 6px' }}>Manual passport lookup</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', margin: '0 0 10px' }}>
              형식 예시: <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>PASSPORT-…</span>
              {' '}/{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>BATTERY-…</span>
              {' '}/{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>did:sov:…</span>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && handleManualSearch()}
                type="text"
                placeholder="여권 ID 또는 DID 입력 (예: PASSPORT-SDI-001)"
                className="sn-input"
                style={{ flex: 1 }}
              />
              <button
                onClick={handleManualSearch}
                disabled={!manualId.trim()}
                className="sn-btn sn-btn-accent"
                style={{
                  minHeight: 44,
                  padding: '8px 18px',
                  opacity: !manualId.trim() ? 0.4 : 1,
                  cursor: !manualId.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                조회
              </button>
            </div>
          </section>
        </div>

        <div>
          {loadingPassport ? (
            <Spinner />
          ) : passportData ? (
            <section className="sn-section-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
                <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-success)' }}>식별 결과 확인됨</span>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0 }}>{passportData.model || '-'}</h3>
                  <span className={`bp-stamp ${getStatusBadge(passportData.status || 'DISPOSED').bg} ${getStatusBadge(passportData.status || 'DISPOSED').text} ${getStatusBadge(passportData.status || 'DISPOSED').border}`}>
                    {STATUS_LABELS[passportData.status || 'DISPOSED'] || passportData.status}
                  </span>
                </div>

                {/* 미니 요약 — model, status, 제조사, chemistry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { k: '제조사', v: passportData.manufacturerName || '-', mono: false },
                    { k: '화학물질', v: passportData.chemistry || '-', mono: false },
                    { k: '총 에너지', v: passportData.totalEnergy ? `${passportData.totalEnergy} kWh` : '-', mono: false },
                    { k: 'VIN', v: passportData.vin || '미바인딩', mono: true },
                  ].map(({ k, v, mono }) => (
                    <div key={k} style={{ background: 'var(--color-surface-alt)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 8, padding: '8px 10px' }}>
                      <p className="sn-eyebrow" style={{ margin: 0 }}>{k}</p>
                      <p
                        style={{
                          fontFamily: mono ? 'var(--font-mono)' : undefined,
                          fontSize: mono ? '0.8125rem' : '0.9375rem',
                          fontWeight: 500,
                          color: 'var(--color-text-2)',
                          margin: '3px 0 0',
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

                {/* 여권 ID + 시리얼번호 — mono */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { k: '여권 ID', v: passportData.passportId, metric: true },
                    { k: '시리얼번호', v: passportData.serialNumber || '-', metric: false },
                  ].map(({ k, v, metric }) => (
                    <div key={k} style={{ background: 'var(--color-surface-alt)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 8, padding: '8px 10px' }}>
                      <p className="sn-eyebrow" style={{ margin: 0 }}>{k}</p>
                      {metric ? (
                        <p className="sn-metric sn-metric-md" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-2)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v}
                        </p>
                      ) : (
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-2)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {passportData.did && (
                  <div style={{ background: 'var(--color-success-soft)', boxShadow: 'inset 0 0 0 1px var(--color-border)', borderRadius: 8, padding: '10px 12px' }}>
                    <p className="sn-eyebrow" style={{ color: 'var(--color-success)', margin: 0 }}>DID</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-success)', margin: '4px 0 0', wordBreak: 'break-all' }}>
                      {passportData.did}
                    </p>
                  </div>
                )}

                <button
                  onClick={goToDetail}
                  className="sn-btn sn-btn-accent"
                  style={{ width: '100%', padding: 12, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  여권 상세 보기 →
                </button>
              </div>
            </section>
          ) : scanError ? (
            <section className="sn-section-card" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-danger-soft)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <svg width="22" height="22" fill="none" stroke="var(--color-danger)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-danger)', margin: '0 0 6px' }}>조회 실패</p>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: '0 0 16px', lineHeight: 1.6 }}>{scanError}</p>
              <button
                onClick={() => { setScanError(null); setScanResult(null); }}
                className="sn-btn sn-btn-ghost"
                style={{ fontSize: '0.8125rem' }}
              >
                다시 시도
              </button>
            </section>
          ) : (
            <section className="sn-section-card" style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="28" height="28" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--color-text-2)', margin: '0 0 6px' }}>식별값을 입력하거나 스캔해 조회를 시작하세요</p>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>조회 결과가 여기에 표시됩니다</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
