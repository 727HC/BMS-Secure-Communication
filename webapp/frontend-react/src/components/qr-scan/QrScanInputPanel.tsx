const NFC_SUPPORTED = typeof window !== 'undefined' && 'NDEFReader' in window;

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

interface Props {
  scanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  nfcScanning: boolean;
  onStartNfc: () => void;
  onStopNfc: () => void;
  manualId: string;
  onManualIdChange: (value: string) => void;
  onManualSearch: () => void;
}

export default function QrScanInputPanel({
  scanning,
  onStartScan,
  onStopScan,
  nfcScanning,
  onStartNfc,
  onStopNfc,
  manualId,
  onManualIdChange,
  onManualSearch,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="sn-section-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>Camera QR identify</span>
          {!scanning ? (
            <button
              onClick={onStartScan}
              className="sn-btn sn-btn-accent"
              style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}
            >
              카메라 열기
            </button>
          ) : (
            <button onClick={onStopScan} className="sn-btn sn-btn-danger" style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}>
              카메라 닫기
            </button>
          )}
        </div>
        <div style={{ padding: 16 }}>
          {scanning ? (
            <div id="qr-reader" style={{ borderRadius: 10, overflow: 'hidden' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center', gap: 16 }}>
              <div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 6px' }}>
                  여권 QR 또는 NFC로 배터리 신원 확인
                </p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0 }}>
                  배터리 표면의 QR 코드나 NFC 태그를 인식하면 자동으로 조회합니다
                </p>
              </div>

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
            <button onClick={onStartNfc} className="sn-btn sn-btn-accent" style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}>
              NFC 활성화
            </button>
          )}
          {NFC_SUPPORTED && nfcScanning && (
            <button onClick={onStopNfc} className="sn-btn sn-btn-danger" style={{ minHeight: 44, fontSize: '0.875rem', padding: '6px 14px' }}>
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
            onChange={(e) => onManualIdChange(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && onManualSearch()}
            type="text"
            placeholder="여권 ID 또는 DID 입력 (예: PASSPORT-SDI-001)"
            className="sn-input"
            style={{ flex: 1 }}
          />
          <button
            onClick={onManualSearch}
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
  );
}
