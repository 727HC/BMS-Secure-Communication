import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import { PageHead, SkeletonCard } from '../components/ui';
import PassportDetailSkeleton from '../components/passport-detail/PassportDetailSkeleton';
import PassportDetailNotFound from '../components/passport-detail/PassportDetailNotFound';
import { computeGbaCompliance, complianceGrade } from '../components/passport-detail/helpers';
import PassportDetailHero from '../components/passport-detail/PassportDetailHero';
import type { Passport, BmuRecord, Credential, IssuerCatalogItem } from '../components/passport-detail/types';
import type { BindFormData } from '../components/modals/passport-detail/BindModal';
import type { MaintenanceRequestFormData } from '../components/modals/passport-detail/MaintenanceRequestModal';
import type { MaintenanceLogFormData } from '../components/modals/passport-detail/MaintenanceLogModal';
import type { AnalysisResultFormData } from '../components/modals/passport-detail/AnalysisResultModal';
import type { CorrectionFormData } from '../components/modals/passport-detail/CorrectionModal';
import type { VcIssueFormData } from '../components/modals/passport-detail/VcIssueModal';
import type { VcRevokeFormData } from '../components/modals/passport-detail/VcRevokeModal';
import type { VcRequestFormData } from '../components/modals/passport-detail/VcRequestModal';
import type { VcApproveFormData } from '../components/modals/passport-detail/VcApproveModal';
import type { VcRejectFormData } from '../components/modals/passport-detail/VcRejectModal';
import type { RegulatoryVerificationFormData } from '../components/modals/passport-detail/RegulatoryVerificationModal';
import type { PhysicalVerificationFormData } from '../components/modals/passport-detail/PhysicalVerificationModal';

type Tab = 'identity' | 'compliance' | 'traceability' | 'data' | 'trust';

const TABS: { key: Tab; label: string }[] = [
  { key: 'identity', label: '개요' },
  { key: 'compliance', label: '규제·소재' },
  { key: 'traceability', label: '운영 이력' },
  { key: 'data', label: '진단 데이터' },
  { key: 'trust', label: '증빙' },
];

type ModalKey = 'bind' | 'mRequest' | 'mLog' | 'aRequest' | 'aResult' | 'dispose' | 'correct' | 'vcIssue' | 'vcVerify' | 'vcRevoke' | 'vcRequest' | 'vcApprove' | 'vcReject' | 'regVerify' | 'physicalVerify' | null;

const IdentityTab = lazy(() => import('../components/passport-detail/IdentityTab'));
const ComplianceTab = lazy(() => import('../components/passport-detail/ComplianceTab'));
const TraceabilityTab = lazy(() => import('../components/passport-detail/TraceabilityTab'));
const DataTab = lazy(() => import('../components/passport-detail/DataTab'));
const TrustTab = lazy(() => import('../components/passport-detail/TrustTab'));

const BindModal = lazy(() => import('../components/modals/passport-detail/BindModal'));
const MaintenanceRequestModal = lazy(() => import('../components/modals/passport-detail/MaintenanceRequestModal'));
const MaintenanceLogModal = lazy(() => import('../components/modals/passport-detail/MaintenanceLogModal'));
const AnalysisRequestModal = lazy(() => import('../components/modals/passport-detail/AnalysisRequestModal'));
const AnalysisResultModal = lazy(() => import('../components/modals/passport-detail/AnalysisResultModal'));
const DisposeModal = lazy(() => import('../components/modals/passport-detail/DisposeModal'));
const CorrectionModal = lazy(() => import('../components/modals/passport-detail/CorrectionModal'));
const VcIssueModal = lazy(() => import('../components/modals/passport-detail/VcIssueModal'));
const VcVerifyModal = lazy(() => import('../components/modals/passport-detail/VcVerifyModal'));
const VcRevokeModal = lazy(() => import('../components/modals/passport-detail/VcRevokeModal'));
const VcRequestModal = lazy(() => import('../components/modals/passport-detail/VcRequestModal'));
const VcApproveModal = lazy(() => import('../components/modals/passport-detail/VcApproveModal'));
const VcRejectModal = lazy(() => import('../components/modals/passport-detail/VcRejectModal'));
const RegulatoryVerificationModal = lazy(() => import('../components/modals/passport-detail/RegulatoryVerificationModal'));
const PhysicalVerificationModal = lazy(() => import('../components/modals/passport-detail/PhysicalVerificationModal'));

function DetailSectionFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 0' }}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} lines={3} showTitle />
      ))}
    </div>
  );
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : '여권을 불러오지 못했습니다.';
}

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [issuers, setIssuers] = useState<IssuerCatalogItem[]>([]);

  const fetchAll = async () => {
    if (!id) {
      setPassport(null);
      setBmuRecords([]);
      setFetchError('요청한 여권 ID가 없습니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const [p, bmu] = await Promise.allSettled([
        api.get<Passport>(`/realtime/passports/${encodeURIComponent(id)}`),
        api.get<{ records?: BmuRecord[] } | BmuRecord[]>(`/realtime/bmu/${encodeURIComponent(id)}`),
      ]);
      if (p.status === 'fulfilled') {
        setPassport(p.value);
      } else {
        setPassport(null);
        setFetchError(errorMessage(p.reason));
      }
      if (bmu.status === 'fulfilled') {
        const data = bmu.value;
        setBmuRecords(Array.isArray(data) ? data : data.records || []);
      } else {
        setBmuRecords([]);
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
      const { toast, debug, category } = toastFromError(err);
      console.warn('[passport-detail] mutation failed', { category, debug });
      setSubmitError(toast);
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

  const renderActiveTab = () => {
    if (!passport) return null;

    switch (activeTab) {
      case 'identity':
        return <IdentityTab passport={passport} />;
      case 'compliance':
        return (
          <ComplianceTab
            passport={passport}
            gbaCompliance={gbaCompliance}
            complianceGrade={grade}
            vcList={vcList}
            canUpdateRegulatory={isRegulator}
            onUpdateRegulatory={() => setOpenModal('regVerify')}
          />
        );
      case 'traceability':
        return (
          <TraceabilityTab
            passport={passport}
            bmuRecords={bmuRecords}
            canVerifyPhysical={isManufacturer || isRegulator}
            onVerifyPhysical={() => setOpenModal('physicalVerify')}
          />
        );
      case 'data':
        return <DataTab bmuRecords={bmuRecords} passportId={passport?.passportId} />;
      case 'trust':
        return (
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
        );
      default:
        return null;
    }
  };

  const renderActiveModal = () => {
    switch (openModal) {
      case 'bind':
        return <BindModal open submitting={submitting} onClose={closeAll} onSubmit={handleBind} />;
      case 'mRequest':
        return <MaintenanceRequestModal open submitting={submitting} onClose={closeAll} onSubmit={handleMaintenanceRequest} />;
      case 'mLog':
        return <MaintenanceLogModal open submitting={submitting} onClose={closeAll} onSubmit={handleMaintenanceLog} />;
      case 'aRequest':
        return <AnalysisRequestModal open submitting={submitting} onClose={closeAll} onSubmit={handleAnalysisRequest} />;
      case 'aResult':
        return <AnalysisResultModal open submitting={submitting} onClose={closeAll} onSubmit={handleAnalysisResult} />;
      case 'dispose':
        return <DisposeModal open submitting={submitting} onClose={closeAll} onSubmit={handleDispose} />;
      case 'correct':
        return <CorrectionModal open submitting={submitting} onClose={closeAll} onSubmit={handleCorrect} />;
      case 'vcIssue':
        return <VcIssueModal open submitting={submitting} onClose={closeAll} onSubmit={handleVcIssue} />;
      case 'vcRequest':
        return <VcRequestModal open submitting={submitting} onClose={closeAll} onSubmit={handleVcRequest} />;
      case 'vcApprove':
        return <VcApproveModal open submitting={submitting} onClose={closeAll} onSubmit={handleVcApprove} />;
      case 'vcReject':
        return <VcRejectModal open submitting={submitting} onClose={closeAll} onSubmit={handleVcReject} />;
      case 'vcVerify':
        return <VcVerifyModal open credentialId={selectedVcId} onClose={closeAll} />;
      case 'vcRevoke':
        return <VcRevokeModal open submitting={submitting} credentialId={selectedVcId} onClose={closeAll} onSubmit={handleVcRevoke} />;
      case 'regVerify':
        return <RegulatoryVerificationModal open submitting={submitting} onClose={closeAll} onSubmit={handleRegulatoryVerification} />;
      case 'physicalVerify':
        return <PhysicalVerificationModal open submitting={submitting} onClose={closeAll} onSubmit={handlePhysicalVerification} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <PassportDetailSkeleton />;
  }
  if (!passport) {
    return (
      <PassportDetailNotFound
        passportId={id}
        fetchError={fetchError}
        onBack={() => navigate('/passports')}
      />
    );
  }


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
  const roleDeskLabel = isManufacturer
    ? '제조사 등재 데스크'
    : isEV
      ? 'EV binding desk'
      : isService
        ? '서비스 근거 데스크'
        : isRegulator
          ? '규제기관 검토 데스크'
          : '공유 자료 뷰';
  const dossierSummary = isManufacturer
    ? '제조사는 원본 여권 파일, GBA 21 보완 상태, VC 발급 작업을 같은 dossier에서 확인합니다.'
    : isEV
      ? 'EV 제조사는 차량 연결 상태와 정비·분석 요청 가능 여부를 dossier 기준으로 확인합니다.'
      : isService
        ? '정비/분석 조직은 작업 대기 상태와 BMU 원장 근거를 dossier 안에서 이어봅니다.'
        : isRegulator
          ? '검증기관은 규제 증빙, 실물 이력 검증, 폐기 판단을 dossier 기준으로 검토합니다.'
          : '조직 권한 안에서 열람 가능한 배터리 여권 근거를 dossier 기준으로 확인합니다.';
  const filingStateLabel = gbaCompliance.pct < 100
    ? '문서 보완 필요'
    : !passport.vin
      ? 'VIN 연결 대기'
      : '검토 준비';
  const actionContext = isManufacturer
    ? '제조 파일 정정과 VC 발급 작업을 실행할 수 있습니다.'
    : isEV
      ? '차량 연결, 정비 요청, 분석 요청은 상태와 VIN 조건에 맞을 때 열립니다.'
      : isService
        ? '정비 또는 분석 상태의 여권에 결과 등록 작업을 남깁니다.'
        : isRegulator
          ? '검증기관 권한으로 폐기 판단과 증빙 발급을 처리합니다.'
          : '현재 조직에서 허용된 작업만 표시합니다.';
  const bmuRecordLabel = bmuRecords.length > 0 ? `${bmuRecords.length}건 수집` : '수집 이력 없음';
  const vinLabel = passport.vin || '미바인딩';

  return (
    <div data-page="passport-detail" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1320, width: '100%', margin: '0 auto' }}>
      <PageHead
        title={passport.passportId || 'Passport dossier'}
        subtitle={(
          <>
            <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`} style={{ marginRight: 8 }}>{badge.label}</span>
            {passport.model || '모델 미등록'} · {passport.manufacturerName || '제조사 미등록'}
          </>
        )}
        actions={(
          <button onClick={() => navigate('/passports')} className="sn-detail-secondary-btn">
            ← 여권 등록부
          </button>
        )}
      />

      {submitError && (
        <div style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <PassportDetailHero
        passport={passport}
        gbaCompliance={gbaCompliance}
        grade={grade}
        lifecycleLabel={lifecycleLabel}
        vinLabel={vinLabel}
        bmuRecordLabel={bmuRecordLabel}
        warningMessages={warningMessages.filter((m): m is string => Boolean(m))}
        roleDeskLabel={roleDeskLabel}
        dossierSummary={dossierSummary}
        filingStateLabel={filingStateLabel}
        actionContext={actionContext}
        isManufacturer={isManufacturer}
        isEV={isEV}
        isService={isService}
        isRegulator={isRegulator}
        onOpenModal={(key) => setOpenModal(key)}
      />

      <div className="sn-panel" style={{ padding: '1rem 1.2rem', background: 'var(--color-surface-alt)', borderStyle: 'dashed' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>자료 초점</p>
            <p className="sn-caption">배터리 상태(SOH), 충전 상태(SOC), 규제 준수율, VIN 연결 여부</p>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>등록부 작업</p>
            <p className="sn-caption">권한과 상태 조건을 통과한 작업만 표시합니다.</p>
          </div>
          <div>
            <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>근거 탭</p>
            <p className="sn-caption">소재, 운영 이력, 진단 데이터, 증빙은 탭에서 이어서 확인</p>
          </div>
        </div>
      </div>

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
        <Suspense fallback={<DetailSectionFallback />}>
          {renderActiveTab()}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        {renderActiveModal()}
      </Suspense>
    </div>
  );
}
