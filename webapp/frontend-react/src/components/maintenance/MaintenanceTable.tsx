import { useNavigate } from 'react-router-dom';
import { getStatusBadge } from '../../lib/helpers';
import { latestMaintenanceTimestamp, type Passport, type Tab } from './lib';

interface Props {
  tabs: { key: Tab; label: string }[];
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
  docketScopeLabel: string;
  canRequestMaintenance: boolean;
  canLogMaintenance: boolean;
  canLogAccident: boolean;
  onOpenMaintenanceRequest: (p: Passport) => void;
  onOpenMaintenanceLog: (p: Passport) => void;
  onOpenAccident: (p: Passport) => void;
}

export default function MaintenanceTable({
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
  docketScopeLabel,
  canRequestMaintenance,
  canLogMaintenance,
  canLogAccident,
  onOpenMaintenanceRequest,
  onOpenMaintenanceLog,
  onOpenAccident,
}: Props) {
  const navigate = useNavigate();

  return (
    <section className="sn-section-card">
      <div className="sn-section-head">
        <div className="sn-section-head-row">
          <div>
            <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>작업 큐</p>
            <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>작업 처리 파일</h2>
            <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '44rem' }}>
              탭은 기존 상태 규칙 그대로 all, maintenance, accident docket을 나눕니다.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="sn-detail-inline-stamp">표시 {filteredPassports.length}</span>
            <span className="sn-detail-inline-stamp">전체 docket {tabCounts.all}</span>
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
                minHeight: 36,
              }}
            >
              {tab.label}
              <span className="sn-filter-tab-chip">{tabCounts[tab.key]}</span>
            </button>
          );
        })}
      </div>

      {filteredPassports.length === 0 ? (
        <div className="sn-empty-dashed" style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <p className="sn-heading" style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>표시할 task docket 항목이 없습니다.</p>
          <p className="sn-caption" style={{ margin: '0 0 0.9rem', maxWidth: '38rem', textAlign: 'center' }}>
            현재 탭 조건에 해당하는 service task 또는 incident log가 없습니다.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}>
            <span className="sn-detail-inline-stamp">{docketScopeLabel}</span>
            <span className="sn-detail-inline-stamp">GET /api/passports</span>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="sn-table">
            <thead>
              <tr>
                <th>Docket file</th>
                <th>Model</th>
                <th>Owner</th>
                <th>VIN</th>
                <th>Task state</th>
                <th>Ledger evidence</th>
                <th>Last service</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedPassports.map((p) => {
                const badge = getStatusBadge(p.status || 'DISPOSED');
                const mCount = p.maintenanceLogs?.length ?? 0;
                const aCount = p.accidentLogs?.length ?? 0;
                return (
                  <tr
                    key={p.passportId}
                    onClick={() => p.passportId && navigate(`/passports/${p.passportId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-2)' }}>
                        {p.passportId}
                      </span>
                    </td>
                    <td>{p.model || '-'}</td>
                    <td style={{ color: 'var(--color-text-3)' }}>{p.manufacturerName || '-'}</td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
                        {p.vin || '미바인딩'}
                      </span>
                    </td>
                    <td>
                      <span className={`bp-stamp ${badge.bg} ${badge.text} ${badge.border}`}>{badge.label}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-2)' }}>
                      {mCount > 0 && <span>Service {mCount}건 </span>}
                      {aCount > 0 && <span style={{ color: 'var(--color-danger)' }}>Incident {aCount}건</span>}
                      {mCount === 0 && aCount === 0 && <span style={{ color: 'var(--color-text-3)' }}>-</span>}
                    </td>
                    <td style={{ color: 'var(--color-text-3)', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono',monospace" }}>
                      {latestMaintenanceTimestamp(p.maintenanceLogs)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        {canRequestMaintenance && p.status === 'ACTIVE' && (
                          <button onClick={() => onOpenMaintenanceRequest(p)} className="sn-btn-sm-secondary" style={{ minHeight: 36 }}>
                            작업 접수
                          </button>
                        )}
                        {canLogMaintenance && p.status === 'MAINTENANCE' && (
                          <button onClick={() => onOpenMaintenanceLog(p)} className="sn-btn-sm-primary" style={{ minHeight: 36 }}>
                            완료 기록
                          </button>
                        )}
                        {canLogAccident && (
                          <button
                            onClick={() => onOpenAccident(p)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', minHeight: 36, fontSize: '0.9375rem', fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                          >
                            Incident
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
