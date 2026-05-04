import { Skeleton, SkeletonTable } from '../ui';

interface Props {
  loading: boolean;
  autoRefresh: boolean;
  hasSearched: boolean;
  errorMsg: string | null;
  accessDenied: boolean;
  recordsCount: number;
}

export default function BmuStateView({
  loading,
  autoRefresh,
  hasSearched,
  errorMsg,
  accessDenied,
  recordsCount,
}: Props) {
  if (loading && !autoRefresh) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '14px 16px', background: 'var(--color-surface-alt)', borderRadius: 8, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton width="50%" height={12} />
              <Skeleton width="60%" height={28} />
              <Skeleton width="100%" height={40} radius={4} />
            </div>
          ))}
        </div>
        <SkeletonTable rows={5} cols={8} />
      </div>
    );
  }

  if (!hasSearched && !loading) {
    return (
      <div className="sn-panel" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="28" height="28" fill="none" stroke="var(--color-text-3)" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 8px' }}>
            여권 ID를 입력하여 데이터를 조회하세요
          </h3>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', textAlign: 'center', maxWidth: '32rem', margin: '0 0 20px' }}>
            배터리 여권 ID를 입력하면 SOC, 전압, 전류, 온도 등 센서 데이터를 확인할 수 있습니다.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '32rem', width: '100%', padding: '16px', background: 'var(--color-surface-alt)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)', margin: 0 }}>물리적 이력 검증</p>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)', margin: 0, lineHeight: 1.6 }}>
              배터리 물리 이력(SOC 추이, 전압·전류·온도 패턴, 방전 사이클)을 블록체인에 기록하여 신뢰 가능한 상태 검증을 제공합니다.
              현장 점검 시 여권 ID 기반으로 실시간 센서 기록을 조회하고 이상 플래그를 즉시 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasSearched && errorMsg && accessDenied) {
    return (
      <div className="sn-panel" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--color-warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="26" height="26" fill="none" stroke="var(--color-warning)" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-1)', margin: '0 0 8px' }}>
            현재 계정으로는 이 여권의 BMU 기록을 열 수 없습니다
          </h3>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-2)', maxWidth: '32rem', margin: '0 0 6px' }}>
            제조사 또는 접근 권한이 있는 계정으로 다시 조회해 주세요. 현재 메시지: {errorMsg}
          </p>
        </div>
      </div>
    );
  }

  if (hasSearched && recordsCount === 0 && !loading) {
    return (
      <div className="sn-panel" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text-1)', margin: '0 0 8px' }}>데이터가 없습니다</h3>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-3)' }}>해당 여권에 대한 BMU 기록이 존재하지 않습니다.</p>
        </div>
      </div>
    );
  }

  return null;
}
