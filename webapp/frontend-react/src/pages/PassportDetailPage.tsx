import { Suspense, useMemo, useState } from 'react';
import PassportDetailModalRouter, { type ModalKey } from '../components/passport-detail/PassportDetailModalRouter';
import PassportDetailTabRouter, { type DetailTab } from '../components/passport-detail/PassportDetailTabRouter';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getStatusBadge } from '../lib/helpers';
import { PageHead, SkeletonCard } from '../components/ui';
import PassportDetailSkeleton from '../components/passport-detail/PassportDetailSkeleton';
import PassportDetailNotFound from '../components/passport-detail/PassportDetailNotFound';
import { computeGbaCompliance, complianceGrade } from '../components/passport-detail/helpers';
import PassportDetailHero from '../components/passport-detail/PassportDetailHero';
import { usePassportMutations } from '../components/passport-detail/usePassportMutations';
import { usePassportDetailData } from '../components/passport-detail/usePassportDetailData';
import { usePassportDossierLabels } from '../components/passport-detail/usePassportDossierLabels';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'identity', label: '개요' },
  { key: 'compliance', label: '규제·소재' },
  { key: 'traceability', label: '운영 이력' },
  { key: 'data', label: '진단 데이터' },
  { key: 'trust', label: '증빙' },
];

function DetailSectionFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '20px 0' }}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} lines={3} showTitle />
      ))}
    </div>
  );
}

export default function PassportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { org } = useAuth();

  const isEV = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const isRegulator = org === 'RegulatorMSP';
  const isManufacturer = org === 'ManufacturerMSP';

  const [activeTab, setActiveTab] = useState<DetailTab>('identity');
  const [openModal, setOpenModal] = useState<ModalKey>(null);
  const [selectedVcId, setSelectedVcId] = useState<string | null>(null);

  const {
    passport,
    bmuRecords,
    vcList,
    issuers,
    loading,
    fetchError,
    refetch: fetchAll,
  } = usePassportDetailData({ id, activeTab, org });

  const gbaCompliance = useMemo(() => computeGbaCompliance(passport), [passport]);
  const grade = useMemo(() => complianceGrade(gbaCompliance.pct), [gbaCompliance]);

  const closeAll = () => {
    setOpenModal(null);
    setSelectedVcId(null);
  };

  const mutations = usePassportMutations({
    passport,
    selectedVcId,
    onAfterSuccess: fetchAll,
    onClose: closeAll,
  });
  const { submitting, submitError } = mutations;

  const openVerifyModal = (credentialId: string) => {
    setSelectedVcId(credentialId);
    setOpenModal('vcVerify');
  };

  const openRevokeModal = (credentialId: string) => {
    setSelectedVcId(credentialId);
    setOpenModal('vcRevoke');
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
  const {
    warningMessages,
    lifecycleLabel,
    roleDeskLabel,
    dossierSummary,
    filingStateLabel,
    actionContext,
    bmuRecordLabel,
    vinLabel,
  } = usePassportDossierLabels({
    passport,
    gbaCompliance,
    bmuRecordsCount: bmuRecords.length,
    isManufacturer,
    isEV,
    isService,
    isRegulator,
  });

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
        warningMessages={warningMessages}
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
          {passport && (
            <PassportDetailTabRouter
              activeTab={activeTab}
              passport={passport}
              gbaCompliance={gbaCompliance}
              grade={grade}
              vcList={vcList}
              bmuRecords={bmuRecords}
              issuers={issuers}
              org={org}
              isManufacturer={isManufacturer}
              isEV={isEV}
              isService={isService}
              isRegulator={isRegulator}
              onUpdateRegulatory={() => setOpenModal('regVerify')}
              onVerifyPhysical={() => setOpenModal('physicalVerify')}
              onVerifyVc={openVerifyModal}
              onRevokeVc={openRevokeModal}
              onRequestVc={() => setOpenModal('vcRequest')}
              onApproveVc={() => setOpenModal('vcApprove')}
              onRejectVc={() => setOpenModal('vcReject')}
            />
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <PassportDetailModalRouter
          openModal={openModal}
          submitting={submitting}
          selectedVcId={selectedVcId}
          onClose={closeAll}
          handlers={mutations.handlers}
        />
      </Suspense>
    </div>
  );
}
