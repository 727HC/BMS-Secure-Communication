/**
 * RecyclingPage 도메인 타입/헬퍼.
 * 순수 — React 의존 없음.
 */

export const PAGE_SIZE = 12;

export interface Passport {
  passportId?: string;
  status?: string;
  model?: string;
  manufacturerName?: string;
  vin?: string;
  recycleAvailable?: boolean;
  soh?: number;
  soce?: number;
  remainingLifeCycle?: number;
  recyclingRates?: Record<string, number>;
  [key: string]: unknown;
}

export type Tab = 'all' | 'recyclable' | 'recycling' | 'disposed';

export function isRecyclingRelated(p: Passport): boolean {
  return (
    p.recycleAvailable === true ||
    p.status === 'ACTIVE' ||
    p.status === 'ANALYSIS' ||
    p.status === 'RECYCLING' ||
    p.status === 'DISPOSED' ||
    (p.recyclingRates != null && Object.keys(p.recyclingRates).length > 0)
  );
}

export function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function hasRecoveryRates(p: Passport): boolean {
  return p.recyclingRates != null && Object.keys(p.recyclingRates).length > 0;
}

export function getLifecycleStage(p: Passport): string {
  if (p.status === 'DISPOSED') return '폐기 승인 완료';
  if (p.status === 'RECYCLING') return '회수·추출 진행';
  if (hasRecoveryRates(p)) return '추출 근거 기록';
  if (p.recycleAvailable) return '회수 가능 판정';
  if (p.status === 'ANALYSIS') return '분석 결과 대기';
  if (p.status === 'ACTIVE') return '분석 요청 가능';
  return '전주기 감시';
}
