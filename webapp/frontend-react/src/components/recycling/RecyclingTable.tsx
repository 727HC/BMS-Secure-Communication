import { useNavigate } from 'react-router-dom';
import { getStatusBadge } from '../../lib/helpers';
import { getLifecycleStage, type Passport, type Tab } from './lib';

interface Props {
  org: string | null;
  tabs: { key: Tab; label: string; hint: string }[];
  tabCounts: Record<Tab, number>;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  filteredPassports: Passport[];
  pagedPassports: Passport[];
  currentPage: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  onPageChange: (page: number) => void;
  canRequestAnalysis: boolean;
  canSubmitAnalysis: boolean;
  canToggleRecycle: boolean;
  canExtract: boolean;
  canDispose: boolean;
  onRequestAnalysis: (p: Passport) => void;
  onOpenAnalysisResult: (p: Passport) => void;
  onOpenRecycleToggle: (p: Passport) => void;
  onOpenExtract: (p: Passport) => void;
  onOpenDispose: (p: Passport) => void;
}

export default function RecyclingTable({
  org,
  tabs,
  tabCounts,
  activeTab,
  onTabChange,
  filteredPassports,
  pagedPassports,
  currentPage,
  totalPages,
  showingFrom,
  showingTo,
  onPageChange,
  canRequestAnalysis,
  canSubmitAnalysis,
  canToggleRecycle,
  canExtract,
  canDispose,
  onRequestAnalysis,
  onOpenAnalysisResult,
  onOpenRecycleToggle,
  onOpenExtract,
  onOpenDispose,
}: Props) {
  const navigate = useNavigate();

  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>생애 주기 탭</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>ESG 회수 등록부</h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="sn-detail-inline-stamp">표시 {filteredPassports.length}</span>
            <span className="sn-detail-inline-stamp">전체 {tabCounts.all}</span>
            <span className="sn-detail-inline-stamp">권한 {org || 'unknown'}</span>
          </div>
        </div>
      </div>

      <div className="sn-filter-tabs" style={{ padding: '0 1.25rem' }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="sn-filter-tab"
              style={{
                color: active ? 'var(--color-text-1)' : 'var(--color-text-3)',
                borderBottomColor: active ? 'var(--color-text-1)' : 'transparent',
              }}
            >
              <span>{tab.label}</span>
              <span className="sn-filter-tab-chip">{tabCounts[tab.key]}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', textTransform: 'none', letterSpacing: 0 }}>{tab.hint}</span>
            </button>
          );
        })}
      </div>

      {filteredPassports.length === 0 ? (
        <div className="sn-empty-dashed" style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>표시할 lifecycle 파일이 없습니다.</p>
          <p className="sn-caption" style={{ margin: 0, maxWidth: '38rem' }}>
            분석, 회수 가능 판정, 추출 근거, 폐기 승인 상태가 기록되면 이 등록부에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', fontSize: '0.875rem' }}>
          <table className="sn-table">
            <thead>
              <tr>
                <th>여권 ID</th>
                <th>Lifecycle state</th>
                <th>상태</th>
                <th style={{ textAlign: 'right' }}>SOH</th>
                <th style={{ textAlign: 'right' }}>잔존수명</th>
                <th>추출 근거</th>
                <th style={{ textAlign: 'right' }}>조치</th>
              </tr>
            </thead>
            <tbody>
              {pagedPassports.map((p) => {
                const badge = getStatusBadge(p.status || 'DISPOSED');
                const rateEntries = p.recyclingRates ? Object.entries(p.recyclingRates).slice(0, 4) : [];
                const sohTone = p.soh == null
                  ? 'var(--color-text-3)'
                  : p.soh > 80
                    ? 'var(--color-success)'
                    : p.soh >= 50
                      ? 'var(--color-warning)'
                      : 'var(--color-danger)';
                return (
                  <tr
                    key={p.passportId}
                    onClick={() => p.passportId && navigate(`/passports/${p.passportId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="sn-mono" style={{ color: 'var(--color-text-1)', fontWeight: 700 }}>{p.passportId}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>{p.model || p.manufacturerName || '모델 정보 없음'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-1)' }}>{getLifecycleStage(p)}</span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                          {p.vin ? `VIN ${p.vin}` : 'VIN 미연결'} · {p.recycleAvailable ? '회수 가능' : '회수 미판정'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: sohTone, fontWeight: 700 }}>
                      {p.soh != null ? `${p.soh}%` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', color: 'var(--color-text-1)', fontWeight: 700 }}>
                      {p.remainingLifeCycle != null ? p.remainingLifeCycle.toLocaleString('ko-KR') : '-'}
                    </td>
                    <td>
                      {rateEntries.length > 0 ? (
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                          {rateEntries.map(([el, rate]) => (
                            <span
                              key={el}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 8px',
                                borderRadius: 999,
                                background: 'var(--color-surface-alt)',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.8125rem',
                                color: 'var(--color-text-2)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <span style={{ fontWeight: 700, color: 'var(--color-text-1)' }}>{el}</span>
                              {rate}%
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>근거 없음</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        {canRequestAnalysis && p.status === 'ACTIVE' && (
                          <button onClick={() => onRequestAnalysis(p)} className="sn-btn-sm-secondary">분석 요청</button>
                        )}
                        {canSubmitAnalysis && p.status === 'ANALYSIS' && (
                          <button onClick={() => onOpenAnalysisResult(p)} className="sn-btn-sm-primary">결과 제출</button>
                        )}
                        {canToggleRecycle && (
                          <button onClick={() => onOpenRecycleToggle(p)} className="sn-btn-sm-secondary">재활용 판정</button>
                        )}
                        {canExtract && p.recycleAvailable && p.status !== 'DISPOSED' && (
                          <button onClick={() => onOpenExtract(p)} className="sn-btn-sm-secondary">추출</button>
                        )}
                        {canDispose && p.status !== 'DISPOSED' && (
                          <button
                            onClick={() => onOpenDispose(p)}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 12px', fontSize: 13, fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none', borderRadius: 10, cursor: 'pointer' }}
                          >
                            폐기
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '0.9rem 1.1rem', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-alt)' }}>
            <span className="sn-caption">
              {filteredPassports.length}개 중 {showingFrom}-{showingTo} 표시
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="sn-btn sn-btn-ghost"
                style={{ padding: '6px 10px', fontSize: 12 }}
                disabled={currentPage === 1}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                이전
              </button>
              <span className="sn-caption">{currentPage} / {totalPages}</span>
              <button
                className="sn-btn sn-btn-ghost"
                style={{ padding: '6px 10px', fontSize: 12 }}
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
