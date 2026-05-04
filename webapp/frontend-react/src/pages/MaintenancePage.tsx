import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';
import { PageHead, SkeletonCard, SkeletonTable } from '../components/ui';
import BaseModal from '../components/modals/BaseModal';
import { AccidentLogModal, type AccidentFormData } from '../components/modals/maintenance';
import {
  MAINTENANCE_TYPES,
  PAGE_SIZE,
  type Passport,
  type Tab,
} from '../components/maintenance/lib';
import MaintenanceSummaryCard from '../components/maintenance/MaintenanceSummaryCard';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceDistributionCard from '../components/maintenance/MaintenanceDistributionCard';

export default function MaintenancePage() {
  const { org, userId } = useAuth();
  const isEVManufacturer = org === 'EVManufacturerMSP';
  const isService = org === 'ServiceMSP';
  const canRequestMaintenance = isEVManufacturer;
  const canLogMaintenance = isService;
  const canLogAccident = isEVManufacturer || isService;

  const [passports, setPassports] = useState<Passport[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedPassport, setSelectedPassport] = useState<Passport | null>(null);
  const [showRequest, setShowRequest] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showAccident, setShowAccident] = useState(false);

  const [requestForm, setRequestForm] = useState({ maintenanceType: 'routine', description: '' });
  const [logForm, setLogForm] = useState({ maintenanceType: 'routine', description: '', technician: '' });

  const fetchPassports = async () => {
    setLoading(true);
    try {
      const data = await api.get<Passport[] | { records?: Passport[] }>('/passports');
      const list = Array.isArray(data) ? data : data.records || [];
      setPassports(list);
    } catch {
      setPassports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, []);

  const isWorkbenchItem = (p: Passport): boolean => {
    const hasHistory = (p.maintenanceLogs && p.maintenanceLogs.length > 0) ||
      (p.accidentLogs && p.accidentLogs.length > 0);
    const canRequest = isEVManufacturer && p.status === 'ACTIVE' && p.vin;
    return p.status === 'MAINTENANCE' || p.status === 'ANALYSIS' || Boolean(hasHistory) || Boolean(canRequest);
  };

  const filteredPassports = useMemo(() => {
    if (activeTab === 'maintenance') return passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS');
    if (activeTab === 'accident') return passports.filter((p) => (p.accidentLogs?.length ?? 0) > 0);
    return passports.filter(isWorkbenchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passports, activeTab, isEVManufacturer]);

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredPassports.length / PAGE_SIZE));
  const pagedPassports = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPassports.slice(start, start + PAGE_SIZE);
  }, [filteredPassports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const showingFrom = filteredPassports.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredPassports.length);

  const tabCounts = {
    all: passports.filter(isWorkbenchItem).length,
    maintenance: passports.filter((p) => p.status === 'MAINTENANCE' || p.status === 'ANALYSIS').length,
    accident: passports.filter((p) => (p.accidentLogs?.length ?? 0) > 0).length,
  };

  // 확장 통계 계산
  const extStats = useMemo(() => {
    const totalMaintenance = passports.reduce((sum, p) => sum + (p.maintenanceLogs?.length ?? 0), 0);
    const totalAccident = passports.reduce((sum, p) => sum + (p.accidentLogs?.length ?? 0), 0);

    // 긴급 대응 필요: status === 'MAINTENANCE' 이면서 요청 후 7일 이상
    const now = Date.now();
    const urgentCount = passports.filter((p) => {
      if (p.status !== 'MAINTENANCE') return false;
      const logs = p.maintenanceLogs ?? [];
      if (logs.length === 0) return false;
      const latest = logs.reduce((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA > tB ? a : b;
      });
      if (!latest.timestamp) return false;
      const diffDays = (now - new Date(latest.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 7;
    }).length;

    // 평균 정비 간격: createdAt vs 최신 정비 timestamp
    const intervals: number[] = [];
    for (const p of passports) {
      if (!p.createdAt || !p.maintenanceLogs?.length) continue;
      const created = new Date(p.createdAt).getTime();
      if (isNaN(created)) continue;
      const latestLog = p.maintenanceLogs.reduce((a, b) => {
        const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tA > tB ? a : b;
      });
      if (!latestLog.timestamp) continue;
      const latestTime = new Date(latestLog.timestamp).getTime();
      if (isNaN(latestTime) || latestTime <= created) continue;
      const days = (latestTime - created) / (1000 * 60 * 60 * 24);
      if (days > 0) intervals.push(days);
    }
    const avgIntervalDays = intervals.length > 0
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : null;

    // 대기 여권 수 (status ACTIVE with VIN but no maintenance yet)
    const pendingPassports = passports.filter((p) => p.status === 'ACTIVE' && p.vin && !(p.maintenanceLogs?.length)).length;

    return { totalMaintenance, totalAccident, urgentCount, avgIntervalDays, pendingPassports };
  }, [passports]);

  // 정비 타입별 집계 (BarRows용)
  const maintenanceTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = { routine: 0, repair: 0, recall: 0, emergency: 0 };
    for (const p of passports) {
      for (const log of p.maintenanceLogs ?? []) {
        const t = log.maintenanceType ?? 'routine';
        if (t in counts) counts[t]++;
      }
    }
    return [
      { label: '정기점검', value: counts.routine, color: 'var(--color-success)' },
      { label: '수리', value: counts.repair, color: 'var(--color-accent)' },
      { label: '리콜', value: counts.recall, color: 'var(--color-warning)' },
      { label: '긴급', value: counts.emergency, color: 'var(--color-danger)' },
    ];
  }, [passports]);

  // 도넛 차트 데이터
  const donutSegments = useMemo(() => [
    { label: '정비 기록', value: extStats.totalMaintenance, color: 'var(--color-success)' },
    { label: '사고 기록', value: extStats.totalAccident, color: 'var(--color-danger)' },
    { label: '접수 후보', value: extStats.pendingPassports, color: 'var(--color-warning)' },
  ], [extStats]);

  const donutTotal = extStats.totalMaintenance + extStats.totalAccident + extStats.pendingPassports;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'maintenance', label: '정비 작업' },
    { key: 'accident', label: '사고 기록' },
  ];

  const docketScopeLabel = isEVManufacturer
    ? 'EV manufacturer service desk'
    : isService
      ? '서비스 완료 데스크'
      : 'Read-only docket view';
  const docketSummary = isEVManufacturer
    ? 'EV 제조사는 운행 중인 VIN 파일을 service task로 접수하고 사고 기록을 docket에 남깁니다.'
    : isService
      ? '정비 조직은 접수된 service task를 완료 기록으로 마감하고 사고 기록을 docket에 남깁니다.'
      : '현재 권한에서는 task docket을 열람하며 접수, 완료, 사고 기록 조치는 숨겨집니다.';

  const openMaintenanceRequest = (p: Passport) => {
    setSelectedPassport(p);
    setRequestForm({ maintenanceType: 'routine', description: '' });
    setShowRequest(true);
  };

  const openMaintenanceLog = (p: Passport) => {
    setSelectedPassport(p);
    setLogForm({ maintenanceType: 'routine', description: '', technician: '' });
    setShowLog(true);
  };

  const openAccident = (p: Passport) => {
    setSelectedPassport(p);
    setShowAccident(true);
  };

  const closeAll = () => {
    setShowRequest(false);
    setShowLog(false);
    setShowAccident(false);
    setSelectedPassport(null);
  };

  const submitRequest = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/request`, requestForm);
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  const submitLog = async () => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/log`, logForm);
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  const submitAccident = async (data: AccidentFormData) => {
    if (!selectedPassport?.passportId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(`/maintenance/${selectedPassport.passportId}/accident`, data);
      closeAll();
      await fetchPassports();
    } catch (err) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[maintenance] mutation failed', { category, debug });
      setSubmitError(toast);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div data-page="maintenance" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* summary grid skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={2} showTitle />
          ))}
        </div>
        {/* 테이블 skeleton */}
        <SkeletonTable rows={5} cols={8} />
      </div>
    );
  }

  return (
    <div data-page="maintenance" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        title="작업 처리"
        subtitle={docketSummary}
        actions={(
          <button onClick={fetchPassports} className="sn-btn sn-btn-ghost" style={{ flexShrink: 0 }}>
            새로고침
          </button>
        )}
      />

      {submitError && (
        <div role="alert" style={{ padding: '0.9rem 1rem', borderRadius: '0.85rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{submitError}</span>
        </div>
      )}

      <MaintenanceSummaryCard docketScopeLabel={docketScopeLabel} docketSummary={docketSummary} extStats={extStats} tabCounts={tabCounts} />

      <MaintenanceDistributionCard
        donutSegments={donutSegments}
        donutTotal={donutTotal}
        maintenanceTypeBreakdown={maintenanceTypeBreakdown}
        avgIntervalDays={extStats.avgIntervalDays}
      />

      <MaintenanceTable
        tabs={tabs}
        tabCounts={tabCounts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        filteredPassports={filteredPassports}
        pagedPassports={pagedPassports}
        currentPage={currentPage}
        totalPages={totalPages}
        showingFrom={showingFrom}
        showingTo={showingTo}
        onPageChange={setCurrentPage}
        docketScopeLabel={docketScopeLabel}
        canRequestMaintenance={canRequestMaintenance}
        canLogMaintenance={canLogMaintenance}
        canLogAccident={canLogAccident}
        onOpenMaintenanceRequest={openMaintenanceRequest}
        onOpenMaintenanceLog={openMaintenanceLog}
        onOpenAccident={openAccident}
      />

      {/* REQUEST MODAL */}
      <BaseModal open={showRequest} onClose={closeAll} title="Service task 접수">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>작업 유형</label>
            <select
              className="sn-input"
              value={requestForm.maintenanceType}
              onChange={(e) => setRequestForm({ ...requestForm, maintenanceType: e.target.value })}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>작업 설명</label>
            <textarea
              className="sn-input"
              rows={4}
              value={requestForm.description}
              onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAll} className="sn-btn sn-btn-ghost">취소</button>
            <button onClick={submitRequest} disabled={submitting} className="sn-btn sn-btn-accent">
              {submitting ? '등록 중...' : '접수 등록'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* LOG MODAL */}
      <BaseModal open={showLog} onClose={closeAll} title="Service task 완료 기록">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>작업 유형</label>
            <select
              className="sn-input"
              value={logForm.maintenanceType}
              onChange={(e) => setLogForm({ ...logForm, maintenanceType: e.target.value })}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>서비스 담당자</label>
            <input
              className="sn-input"
              value={logForm.technician}
              onChange={(e) => setLogForm({ ...logForm, technician: e.target.value })}
            />
          </div>
          <div>
            <label className="sn-eyebrow" style={{ display: 'block', marginBottom: 6 }}>완료 설명</label>
            <textarea
              className="sn-input"
              rows={4}
              value={logForm.description}
              onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={closeAll} className="sn-btn sn-btn-ghost">취소</button>
            <button onClick={submitLog} disabled={submitting} className="sn-btn sn-btn-accent">
              {submitting ? '등록 중...' : '완료 기록'}
            </button>
          </div>
        </div>
      </BaseModal>

      {/* ACCIDENT MODAL */}
      <AccidentLogModal
        open={showAccident}
        submitting={submitting}
        initialReporter={userId || ''}
        onClose={closeAll}
        onSubmit={submitAccident}
      />
    </div>
  );
}
