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
