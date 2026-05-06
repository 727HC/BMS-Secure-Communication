import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardViewModels } from './useDashboardViewModels';
import type { DashboardPassport, DashboardSourceState } from './lib';

const idle: DashboardSourceState = { loading: false, error: null, permission: 'unknown', loadedAt: null };
const allowed: DashboardSourceState = { loading: false, error: null, permission: 'allowed', loadedAt: '2026-05-06T10:00:00.000Z' };

const base = {
  passports: [] as DashboardPassport[],
  alertRows: [],
  selectedPassport: null,
  selectedBmuRecord: null,
  bmuRecords: [],
  platformStatus: null,
  passportSource: idle,
  statusSource: idle,
  bmuSource: idle,
  auditSource: idle,
  token: 'tok',
};

describe('useDashboardViewModels — kpiCards', () => {
  it('returns 4 cards in fixed order', () => {
    const { result } = renderHook(() => useDashboardViewModels({ ...base }));
    expect(result.current.kpiCards.map((c) => c.label)).toEqual([
      '총 등록 배터리', '정상 상태', '알림 / 경고', '블록체인 검증 완료',
    ]);
  });

  it('reflects passport count in total card and 0% delta when total=0', () => {
    const { result } = renderHook(() => useDashboardViewModels({ ...base }));
    const totalCard = result.current.kpiCards[0];
    expect(totalCard.value).toBe('0');
  });

  it("uses '조회 중' delta when passport source loading", () => {
    const loadingSrc: DashboardSourceState = { loading: true, error: null, permission: 'allowed', loadedAt: null };
    const { result } = renderHook(() => useDashboardViewModels({ ...base, passportSource: loadingSrc }));
    expect(result.current.kpiCards[0].delta).toBe('조회 중');
  });
});

describe('useDashboardViewModels — fleetGauges', () => {
  it('returns 4 gauges with — placeholders when no record', () => {
    const { result } = renderHook(() => useDashboardViewModels({ ...base }));
    expect(result.current.fleetGauges).toHaveLength(4);
    expect(result.current.fleetGauges[0].value).toContain('—');
  });

  it('uses passport SOC when no BMU record (with scaleSOC normalization)', () => {
    const { result } = renderHook(() => useDashboardViewModels({
      ...base,
      selectedPassport: { passportId: 'P', currentSoc: 65535 / 2, currentSoh: 90 },
    }));
    expect(result.current.fleetGauges[0].value).toContain('%');
    expect(result.current.fleetGauges[1].value).toContain('90');
  });
});

describe('useDashboardViewModels — dataflowNodes', () => {
  it('returns 5 fixed nodes with all-Unknown when no data', () => {
    const { result } = renderHook(() => useDashboardViewModels({ ...base }));
    expect(result.current.dataflowNodes.map((n) => n.key)).toEqual([
      'cmu', 'bmu', 'agent', 'blockchain', 'passport',
    ]);
  });

  it("marks BMU as 'Data' when records present", () => {
    const { result } = renderHook(() => useDashboardViewModels({
      ...base, bmuRecords: [{ recordId: 'r1' }],
    }));
    expect(result.current.dataflowNodes.find((n) => n.key === 'bmu')?.status).toBe('Data');
  });

  it("marks Agent as 'Loaded' when passport source allowed and loaded", () => {
    const { result } = renderHook(() => useDashboardViewModels({ ...base, passportSource: allowed }));
    expect(result.current.dataflowNodes.find((n) => n.key === 'agent')?.status).toBe('Loaded');
  });

  it("marks Blockchain as 'Synced' when fabric CONNECTED", () => {
    const { result } = renderHook(() => useDashboardViewModels({
      ...base, platformStatus: { fabric: 'CONNECTED' },
    }));
    expect(result.current.dataflowNodes.find((n) => n.key === 'blockchain')?.status).toBe('Synced');
  });
});

describe('useDashboardViewModels — securityRows', () => {
  it('returns 4 rows in fixed order', () => {
    const { result } = renderHook(() => useDashboardViewModels({ ...base }));
    expect(result.current.securityRows.map((r) => r.label)).toEqual([
      '인증 토큰', '상태 엔드포인트', '감사 접근', 'AES / CMAC / Ed25519',
    ]);
  });

  it("auth row reflects token presence", () => {
    const { result: hasToken } = renderHook(() => useDashboardViewModels({ ...base, token: 'tk' }));
    expect(hasToken.current.securityRows[0].tone).toBe('green');

    const { result: noToken } = renderHook(() => useDashboardViewModels({ ...base, token: null }));
    expect(noToken.current.securityRows[0].tone).toBe('neutral');
  });

  it("audit row reflects denied permission", () => {
    const denied: DashboardSourceState = { loading: false, error: null, permission: 'denied', loadedAt: null };
    const { result } = renderHook(() => useDashboardViewModels({ ...base, auditSource: denied }));
    expect(result.current.securityRows[2].value).toBe('감사 권한 필요');
  });

  it("crypto row flags recent BMU signatures within 60s", () => {
    const recent = new Date(Date.now() - 30_000).toISOString();
    const { result } = renderHook(() => useDashboardViewModels({
      ...base,
      bmuRecords: [{ recordId: 'r1', signature: 'a'.repeat(128), timestamp: recent }],
    }));
    expect(result.current.securityRows[3].value).toContain('BMU 서명 수신');
  });

  it("crypto row reports stale signatures when none in last 60s", () => {
    const old = new Date(Date.now() - 120_000).toISOString();
    const { result } = renderHook(() => useDashboardViewModels({
      ...base,
      bmuRecords: [{ recordId: 'r1', signature: 'a'.repeat(128), timestamp: old }],
    }));
    expect(result.current.securityRows[3].value).toContain('최근 60초 신호 없음');
  });
});
