import { describe, expect, it } from 'vitest';
import { avg, getLifecycleStage, hasRecoveryRates, isRecyclingRelated } from './lib';

describe('isRecyclingRelated', () => {
  it('flags passports with recycleAvailable=true', () => {
    expect(isRecyclingRelated({ recycleAvailable: true })).toBe(true);
  });

  it('flags lifecycle statuses ACTIVE/ANALYSIS/RECYCLING/DISPOSED', () => {
    expect(isRecyclingRelated({ status: 'ACTIVE' })).toBe(true);
    expect(isRecyclingRelated({ status: 'ANALYSIS' })).toBe(true);
    expect(isRecyclingRelated({ status: 'RECYCLING' })).toBe(true);
    expect(isRecyclingRelated({ status: 'DISPOSED' })).toBe(true);
  });

  it('flags passports with extraction rates already recorded', () => {
    expect(isRecyclingRelated({ recyclingRates: { Li: 95 } })).toBe(true);
  });

  it('returns false for passports outside the lifecycle scope', () => {
    expect(isRecyclingRelated({ status: 'MANUFACTURED' })).toBe(false);
    expect(isRecyclingRelated({ recyclingRates: {} })).toBe(false);
    expect(isRecyclingRelated({})).toBe(false);
  });
});

describe('avg', () => {
  it('returns null for empty', () => {
    expect(avg([])).toBeNull();
  });

  it('rounds to integer', () => {
    expect(avg([10, 20, 30])).toBe(20);
    expect(avg([1, 2])).toBe(2);
  });
});

describe('hasRecoveryRates', () => {
  it('returns true when at least one element rate exists', () => {
    expect(hasRecoveryRates({ recyclingRates: { Co: 80 } })).toBe(true);
  });

  it('returns false for empty or missing rates', () => {
    expect(hasRecoveryRates({})).toBe(false);
    expect(hasRecoveryRates({ recyclingRates: {} })).toBe(false);
  });
});

describe('getLifecycleStage', () => {
  it('returns explicit lifecycle stage by status with priority', () => {
    expect(getLifecycleStage({ status: 'DISPOSED' })).toBe('폐기 승인 완료');
    expect(getLifecycleStage({ status: 'RECYCLING' })).toBe('회수·추출 진행');
  });

  it('uses extraction history when status is not terminal', () => {
    expect(getLifecycleStage({ status: 'ACTIVE', recyclingRates: { Co: 80 } })).toBe('추출 근거 기록');
  });

  it('uses recycleAvailable flag when no extraction history', () => {
    expect(getLifecycleStage({ recycleAvailable: true })).toBe('회수 가능 판정');
  });

  it('uses ANALYSIS / ACTIVE fallbacks', () => {
    expect(getLifecycleStage({ status: 'ANALYSIS' })).toBe('분석 결과 대기');
    expect(getLifecycleStage({ status: 'ACTIVE' })).toBe('분석 요청 가능');
  });

  it('falls back to "전주기 감시"', () => {
    expect(getLifecycleStage({})).toBe('전주기 감시');
  });
});
