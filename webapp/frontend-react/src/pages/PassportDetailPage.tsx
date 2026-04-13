import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge, scaleSOC } from '../lib/helpers';
import Spinner from '../components/ui/Spinner';
import {
  IdentityTab,
  ComplianceTab,
  TraceabilityTab,
  DataTab,
  TrustTab,
  computeGbaCompliance,
  complianceGrade,
} from '../components/passport-detail';
import type { Passport, BmuRecord, Credential } from '../components/passport-detail/types';
import {
  BindModal,
  MaintenanceRequestModal,
  MaintenanceLogModal,
  AnalysisRequestModal,
  AnalysisResultModal,
  DisposeModal,
  CorrectionModal,
  VcIssueModal,
  VcVerifyModal,
  VcRevokeModal,
  VcRequestModal,
  VcApproveModal,
  VcRejectModal,
  RegulatoryVerificationModal,
  PhysicalVerificationModal,
  type BindFormData,
  type MaintenanceRequestFormData,
  type MaintenanceLogFormData,
  type AnalysisResultFormData,
  type CorrectionFormData,
  type VcIssueFormData,
  type VcRevokeFormData,
  type VcRequestFormData,
  type VcApproveFormData,
  type VcRejectFormData,
  type RegulatoryVerificationFormData,
  type PhysicalVerificationFormData,
} from '../components/modals/passport-detail';
import type { IssuerCatalogItem } from '../components/passport-detail/types';

type Tab = 'identity' | 'compliance' | 'traceability' | 'data' | 'trust';

const TABS: { key: Tab; label: string }[] = [
  { key: 'identity', label: '개요' },
  { key: 'compliance', label: '규제·소재' },
  { key: 'traceability', label: '운영 이력' },
  { key: 'data', label: '진단 데이터' },
  { key: 'trust', label: '증빙' },
];

type ModalKey = 'bind' | 'mRequest' | 'mLog' | 'aRequest' | 'aResult' | 'dispose' | 'correct' | 'vcIssue' | 'vcVerify' | 'vcRevoke' | 'vcRequest' | 'vcApprove' | 'vcReject' | 'regVerify' | 'physicalVerify' | null;

export default function PassportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { org } = useAuth();

  const isEV = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const isRegulator = org === 'RegulatorMSP';
  const isManufacturer = org === 'ManufacturerMSP';

  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('identity');
  const [bmuRecords, setBmuRecords] = useState<BmuRecord[]>([]);
  const [vcList, setVcList] = useState<Credential[]>([]);
  const [openModal, setOpenModal] = useState<ModalKey>(null);
  const [selectedVcId, setSelectedVcId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issuers, setIssuers] = useState<IssuerCatalogItem[]>([]);

  const fetchAll = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, bmu] = await Promise.allSettled([
        api.get<Passport>(`/passports/${encodeURIComponent(id)}`),
        api.get<{ records?: BmuRecord[] } | BmuRecord[]>(`/bmu/records/${encodeURIComponent(id)}`),
      ]);
      if (p.status === 'fulfilled') setPassport(p.value);
      if (bmu.status === 'fulfilled') {
        const data = bmu.value;
        setBmuRecords(Array.isArray(data) ? data : data.records || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id || activeTab !== 'trust') return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ credentials?: Credential[] } | Credential[]>(`/vc/passport/${encodeURIComponent(id)}`);
        if (!cancelled) setVcList(Array.isArray(data) ? data : data.credentials || []);
      } catch {
        if (!cancelled) setVcList([]);
      }
      if (org === 'RegulatorMSP') {
        try {
          const issuerData = await api.get<{ issuers: string[] }>('/vc/issuers');
          const names = issuerData.issuers || [];
          const catalog = await Promise.all(names.map(async (issuerMsp) => {
            try {
              const typeData = await api.get<{ issuerMsp: string; types: string[] }>(`/vc/issuers/${encodeURIComponent(issuerMsp)}/types`);
              return { issuerMsp, types: typeData.types || [] };
            } catch {
              return { issuerMsp, types: [] };
            }
          }));
          if (!cancelled) setIssuers(catalog);
        } catch {
          if (!cancelled) setIssuers([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, id, org]);

  const gbaCompliance = useMemo(() => computeGbaCompliance(passport), [passport]);
  const grade = useMemo(() => complianceGrade(gbaCompliance.pct), [gbaCompliance]);

  const closeAll = () => {
    setOpenModal(null);
    setSelectedVcId(null);
  };

  const withSubmit = async (fn: () => Promise<unknown>) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await fn();
      closeAll();
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.';
      setSubmitError(message);
    }
    finally { setSubmitting(false); }
  };

  const handleBind = (data: BindFormData) =>
    passport?.passportId && withSubmit(() => api.put(`/passports/${passport.passportId}/bind`, data));
  const handleMaintenanceRequest = (data: MaintenanceRequestFormData) =>
    passport?.passportId && withSubmit(() => api.post(`/maintenance/${passport.passportId}/request`, data));
  const handleMaintenanceLog = (data: MaintenanceLogFormData) =>
    passport?.passportId && withSubmit(() => api.post(`/maintenance/${passport.passportId}/log`, data));
  const handleAnalysisRequest = () =>
    passport?.passportId && withSubmit(() => api.post(`/analysis/${passport.passportId}/request`, {}));
  const handleAnalysisResult = (data: AnalysisResultFormData) =>
    passport?.passportId && withSubmit(() =>
      api.post(`/analysis/${passport.passportId}/result`, {
        soh: Number(data.soh),
        soce: Number(data.soce),
        remainingLifeCycle: Number(data.remainingLifeCycle),
        recycleAvailable: data.recycleAvailable,
      })
    );
  const handleDispose = () =>
    passport?.passportId && withSubmit(() => api.post(`/recycling/${passport.passportId}/dispose`, {}));
  const handleCorrect = (data: CorrectionFormData) =>
    passport?.passportId && withSubmit(() => api.post(`/passports/${passport.passportId}/correct`, data));
  const handleVcIssue = (data: VcIssueFormData) =>
    passport?.passportId && withSubmit(() => api.post('/vc/issue', { passportId: passport.passportId, ...data }));
  const handleVcRequest = (data: VcRequestFormData) =>
    passport?.passportId && withSubmit(() => api.post('/vc/request', { passportId: passport.passportId, credType: data.credType }));
  const handleVcApprove = (data: VcApproveFormData) =>
    withSubmit(() => api.post(`/vc/request/${encodeURIComponent(data.requestId)}/approve`, {}));
  const handleVcReject = (data: VcRejectFormData) =>
    withSubmit(() => api.post(`/vc/request/${encodeURIComponent(data.requestId)}/reject`, { reason: data.reason }));
  const handleVcRevoke = (data: VcRevokeFormData) =>
    selectedVcId && withSubmit(() => api.post('/vc/revoke', { credentialId: selectedVcId, reason: data.reason }));
  const handleRegulatoryVerification = (data: RegulatoryVerificationFormData) =>
    passport?.passportId && withSubmit(() => api.put(`/passports/${passport.passportId}/regulatory-verification`, {
      status: data.status,
      evidenceIds: data.evidenceIds.split(',').map((v) => v.trim()).filter(Boolean),
    }));
  const handlePhysicalVerification = (data: PhysicalVerificationFormData) =>
    passport?.passportId && withSubmit(() => api.put(`/passports/${passport.passportId}/physical-verification`, {
      signals: {
        socMatched: data.socMatched,
        didMatched: data.didMatched,
        vinMatched: data.vinMatched,
        fcMatched: data.fcMatched,
      },
      reason: data.reason,
    }));

  const openVerifyModal = (credentialId: string) => {
    setSelectedVcId(credentialId);
    setOpenModal('vcVerify');
  };

  const openRevokeModal = (credentialId: string) => {
    setSelectedVcId(credentialId);
    setOpenModal('vcRevoke');
  };

  if (loading) return <Spinner />;
  if (!passport) return <p className="sn-caption">여권을 찾을 수 없습니다.</p>;

  const badge = getStatusBadge(passport.status || 'DISPOSED');
  const warningMessages = [
    passport.status === 'MAINTENANCE' ? '정비가 진행 중입니다. 작업 완료 후 결과를 먼저 등록해야 합니다.' : null,
    passport.status === 'ANALYSIS' ? '분석 결과가 아직 닫히지 않았습니다. 결과 등록이 필요합니다.' : null,
    gbaCompliance.pct < 100 ? `GBA 규제 준수 항목이 ${21 - gbaCompliance.filled}개 비어 있습니다. 보완이 필요합니다.` : null,
    passport.currentSoh != null && passport.currentSoh < 80 ? '배터리 상태(SOH)가 낮습니다. 사용 지속 여부를 우선 검토해야 합니다.' : null,
    !passport.vin ? '차량 연결이 아직 완료되지 않았습니다. 상세 검토 전에 VIN 등록부터 확인해야 합니다.' : null,
  ].filter(Boolean) as string[];
  const lifecycleLabel = passport.status === 'MAINTENANCE'
    ? '정비 진행 중'
    : passport.status === 'ANALYSIS'
      ? '점검 결과 대기'
      : passport.status === 'RECYCLING'
        ? '회수·재활용 검토 중'
        : !passport.vin
          ? 'VIN 등록 대기'
          : '운행 중';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER */}
      <div className="sn-page-head" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
        <div className="sn-page-head-main">
          <button
            onClick={() => navigate('/passports')}
            style={{ fontSize: 13, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}
          >
            ← 여권 목록
          </button>
          <h1 className="sn-page-title" style={{ fontFamily: "'JetBrains Mono',monospace" }}>
            {passport.passportId}
          </h1>
          <p className="sn-page-subtitle">
            <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`} style={{ marginRight: 8 }}>{badge.label}</span>
            {passport.model || '-'} · {passport.manufacturerName || '-'}
          </p>
        </div>
      </div>

      {submitError && (
        <div style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid rgba(239,68,68,0.16)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      {/* CRITICAL SIGNALS */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--color-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>SOH (건강 상태)</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: passport.currentSoh && passport.currentSoh < 80 ? '#ef4444' : 'var(--color-text-1)' }}>
              {passport.currentSoh != null ? `${passport.currentSoh}%` : '--'}
            </p>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>SOC (충전 상태)</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-1)' }}>
              {passport.currentSoc != null ? `${scaleSOC(passport.currentSoc)}%` : '--'}
            </p>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>GBA 규제 준수</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: gbaCompliance.pct === 100 ? '#10b981' : '#f59e0b' }}>
                {gbaCompliance.pct}%
              </p>
              <span className="bp-stamp" style={{ fontSize: '0.75rem', background: '#f8fbff', color: '#1769e0', border: '1px solid rgba(23,105,224,0.12)' }}>Grade {grade}</span>
            </div>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>라이프사이클</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text-1)', marginTop: '0.2rem' }}>
              {lifecycleLabel}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isManufacturer && (
            <button onClick={() => setOpenModal('correct')} className="sn-btn sn-btn-ghost">데이터 정정</button>
          )}
          {isEV && !passport.vin && (
            <button onClick={() => setOpenModal('bind')} className="sn-btn sn-btn-accent">차량 연결</button>
          )}
          {isEV && passport.status === 'ACTIVE' && (
            <>
              <button onClick={() => setOpenModal('mRequest')} className="sn-btn sn-btn-ghost">정비 요청</button>
              <button onClick={() => setOpenModal('aRequest')} className="sn-btn sn-btn-ghost">분석 요청</button>
            </>
          )}
          {isService && passport.status === 'MAINTENANCE' && (
            <button onClick={() => setOpenModal('mLog')} className="sn-btn sn-btn-accent">정비 완료</button>
          )}
          {isService && passport.status === 'ANALYSIS' && (
            <button onClick={() => setOpenModal('aResult')} className="sn-btn sn-btn-accent">분석 결과</button>
          )}
          {isRegulator && passport.status !== 'DISPOSED' && (
            <button onClick={() => setOpenModal('dispose')} className="sn-btn sn-btn-danger">폐기</button>
          )}
          {(isManufacturer || isRegulator) && (
            <button onClick={() => setOpenModal('vcIssue')} className="sn-btn sn-btn-ghost">VC 발급</button>
          )}
        </div>
        </div>
        {warningMessages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
            {warningMessages.map((message) => (
              <div key={message} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.9rem 1rem', borderRadius: '0.85rem', background: '#fff7ed', color: '#9a3412', border: '1px solid rgba(245,158,11,0.16)' }}>
                <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.4 }}>!</span>
                <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HERO */}
      <div className="sn-detail-hero">
        <div className="sn-detail-cover-meta">
          <div className="sn-detail-cover-meta-item">
            <span className="sn-detail-cover-meta-key">제조사</span>
            <span className="sn-detail-cover-meta-value">{passport.manufacturerName || '-'}</span>
          </div>
          <div className="sn-detail-cover-meta-item">
            <span className="sn-detail-cover-meta-key">화학계열</span>
            <span className="sn-detail-cover-meta-value">{passport.chemistry || '-'}</span>
          </div>
          <div className="sn-detail-cover-meta-item">
            <span className="sn-detail-cover-meta-key">총 에너지</span>
            <span className="sn-detail-cover-meta-value">{passport.totalEnergy ? `${passport.totalEnergy} kWh` : '-'}</span>
          </div>
          <div className="sn-detail-cover-meta-item">
            <span className="sn-detail-cover-meta-key">차대번호</span>
            <span className="sn-detail-cover-meta-value">{passport.vin || '미바인딩'}</span>
          </div>
        </div>
      </div>

      <div className="sn-panel" style={{ padding: '1rem 1.2rem', background: '#fbfdff', borderStyle: 'dashed' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>먼저 볼 항목</p>
            <p className="sn-caption">배터리 상태(SOH), 충전 상태(SOC), 규제 준수율, VIN 연결 여부</p>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>후속 조치</p>
            <p className="sn-caption">정비/분석 결과 등록, 데이터 정정, VC 발급, 폐기 판단</p>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>참고 정보</p>
            <p className="sn-caption">소재, 운영 이력, 진단 데이터, 증빙은 탭에서 이어서 확인</p>
          </div>
        </div>
      </div>

      {/* TAB NAV */}
      <div className="sn-detail-index">
        <div className="sn-detail-index-track">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`sn-detail-index-tab${activeTab === t.key ? ' active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sn-detail-tab-sheet">
        {activeTab === 'identity' && <IdentityTab passport={passport} />}
        {activeTab === 'compliance' && <ComplianceTab passport={passport} gbaCompliance={gbaCompliance} complianceGrade={grade} vcList={vcList} canUpdateRegulatory={isRegulator} onUpdateRegulatory={() => setOpenModal('regVerify')} />}
        {activeTab === 'traceability' && <TraceabilityTab passport={passport} bmuRecords={bmuRecords} canVerifyPhysical={isManufacturer || isRegulator} onVerifyPhysical={() => setOpenModal('physicalVerify')} />}
        {activeTab === 'data' && <DataTab bmuRecords={bmuRecords} />}
        {activeTab === 'trust' && (
          <TrustTab 
            passport={passport} 
            vcList={vcList} 
            onVerify={openVerifyModal}
            onRevoke={openRevokeModal}
            canRequest={isManufacturer || isEV || isService}
            canApproveOrReject={isRegulator || org === 'ManufacturerMSP'}
            onRequest={() => setOpenModal('vcRequest')}
            onApprove={() => setOpenModal('vcApprove')}
            onReject={() => setOpenModal('vcReject')}
            issuers={issuers}
          />
        )}
      </div>

      {/* ===== MODALS ===== */}
      <BindModal open={openModal === 'bind'} submitting={submitting} onClose={closeAll} onSubmit={handleBind} />
      <MaintenanceRequestModal open={openModal === 'mRequest'} submitting={submitting} onClose={closeAll} onSubmit={handleMaintenanceRequest} />
      <MaintenanceLogModal open={openModal === 'mLog'} submitting={submitting} onClose={closeAll} onSubmit={handleMaintenanceLog} />
      <AnalysisRequestModal open={openModal === 'aRequest'} submitting={submitting} onClose={closeAll} onSubmit={handleAnalysisRequest} />
      <AnalysisResultModal open={openModal === 'aResult'} submitting={submitting} onClose={closeAll} onSubmit={handleAnalysisResult} />
      <DisposeModal open={openModal === 'dispose'} submitting={submitting} onClose={closeAll} onSubmit={handleDispose} />
      <CorrectionModal open={openModal === 'correct'} submitting={submitting} onClose={closeAll} onSubmit={handleCorrect} />
      <VcIssueModal open={openModal === 'vcIssue'} submitting={submitting} onClose={closeAll} onSubmit={handleVcIssue} />
      <VcRequestModal open={openModal === 'vcRequest'} submitting={submitting} onClose={closeAll} onSubmit={handleVcRequest} />
      <VcApproveModal open={openModal === 'vcApprove'} submitting={submitting} onClose={closeAll} onSubmit={handleVcApprove} />
      <VcRejectModal open={openModal === 'vcReject'} submitting={submitting} onClose={closeAll} onSubmit={handleVcReject} />
      <VcVerifyModal open={openModal === 'vcVerify'} credentialId={selectedVcId} onClose={closeAll} />
      <VcRevokeModal open={openModal === 'vcRevoke'} submitting={submitting} credentialId={selectedVcId} onClose={closeAll} onSubmit={handleVcRevoke} />
      <RegulatoryVerificationModal open={openModal === 'regVerify'} submitting={submitting} onClose={closeAll} onSubmit={handleRegulatoryVerification} />
      <PhysicalVerificationModal open={openModal === 'physicalVerify'} submitting={submitting} onClose={closeAll} onSubmit={handlePhysicalVerification} />
    </div>
  );
}
