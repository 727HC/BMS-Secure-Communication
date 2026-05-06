import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardLabels } from './useDashboardLabels';
import type { DashboardSourceState } from './lib';

const idle: DashboardSourceState = { loading: false, error: null, permission: 'unknown', loadedAt: null };
const loaded: DashboardSourceState = { loading: false, error: null, permission: 'allowed', loadedAt: '2026-05-06T00:00:00.000Z' };
const loading: DashboardSourceState = { loading: true, error: null, permission: 'allowed', loadedAt: null };
const errored: DashboardSourceState = { loading: false, error: 'down', permission: 'allowed', loadedAt: null };
const denied: DashboardSourceState = { loading: false, error: null, permission: 'denied', loadedAt: null };

const base = {
  hasDashboardAuth: true,
  org: 'ManufacturerMSP',
  userId: 'op1',
  passports: [],
  bmuRecords: [],
  auditRecords: [],
  platformStatus: null,
  passportSource: idle,
  statusSource: idle,
  bmuSource: idle,
  auditSource: idle,
  selectedPassport: null,
  selectedPassportId: null,
  selectedPassportLabel: '배터리 선택 대기',
  passportOptions: [],
};

describe('useDashboardLabels — dashboardDataSummary', () => {
  it("uses '인증 정보 없음' when not authenticated", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, hasDashboardAuth: false }));
    expect(result.current.dashboardDataSummary).toContain('인증 정보 없음');
  });

  it('joins MSP/userId for authenticated user', () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base }));
    expect(result.current.dashboardDataSummary).toContain('ManufacturerMSP / op1');
  });

  it('shows passport count when source loaded', () => {
    const { result } = renderHook(() => useDashboardLabels({
      ...base,
      passports: [{}, {}, {}],
      passportSource: loaded,
    }));
    expect(result.current.dashboardDataSummary).toContain('여권 3건');
  });

  it("shows '여권 조회 중' while loading", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, passportSource: loading }));
    expect(result.current.dashboardDataSummary).toContain('여권 조회 중');
  });

  it('shows error tail for errored sources', () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, passportSource: errored }));
    expect(result.current.dashboardDataSummary).toContain('여권 오류: down');
  });

  it("shows 'BMU 선택 대기' when no selectedPassportId", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, bmuSource: loaded }));
    expect(result.current.dashboardDataSummary).toContain('BMU 선택 대기');
  });

  it('shows BMU count when passport selected', () => {
    const { result } = renderHook(() => useDashboardLabels({
      ...base, selectedPassportId: 'P1', bmuRecords: [{}, {}], bmuSource: loaded,
    }));
    expect(result.current.dashboardDataSummary).toContain('BMU 2건');
  });

  it("shows '감사 권한 필요' when audit denied", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, auditSource: denied }));
    expect(result.current.dashboardDataSummary).toContain('감사 권한 필요');
  });

  it('uses Fabric status fallback when not loading/errored', () => {
    const { result } = renderHook(() => useDashboardLabels({
      ...base, platformStatus: { fabric: 'CONNECTED' }, statusSource: loaded,
    }));
    expect(result.current.dashboardDataSummary).toContain('Fabric CONNECTED');
  });
});

describe('useDashboardLabels — battery selector', () => {
  it('disabled when source loading or no options', () => {
    const { result: loadingRes } = renderHook(() => useDashboardLabels({ ...base, passportSource: loading }));
    expect(loadingRes.current.batterySelectorDisabled).toBe(true);

    const { result: emptyRes } = renderHook(() => useDashboardLabels({ ...base }));
    expect(emptyRes.current.batterySelectorDisabled).toBe(true);
  });

  it('enabled when at least one option exists and not loading', () => {
    const { result } = renderHook(() => useDashboardLabels({
      ...base, passportSource: loaded, passportOptions: [{ id: 'P1', label: 'P1', status: 'ACTIVE' }],
    }));
    expect(result.current.batterySelectorDisabled).toBe(false);
  });

  it("title shows '여권 조회 중' while loading", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, passportSource: loading }));
    expect(result.current.batterySelectorTitle).toBe('여권 조회 중');
  });

  it("title shows '선택 가능한 배터리 없음' when empty", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base }));
    expect(result.current.batterySelectorTitle).toBe('선택 가능한 배터리 없음');
  });

  it('button label uses selected passport model when available', () => {
    const passport = { passportId: 'P1', model: 'X1' };
    const { result } = renderHook(() => useDashboardLabels({
      ...base,
      selectedPassport: passport,
      selectedPassportId: 'P1',
      passportSource: loaded,
      passportOptions: [{ id: 'P1', label: 'P1', status: 'ACTIVE' }],
    }));
    expect(result.current.batterySelectorButtonLabel).toBe('X1');
  });

  it("button label shows '조회 중' while loading", () => {
    const { result } = renderHook(() => useDashboardLabels({ ...base, passportSource: loading }));
    expect(result.current.batterySelectorButtonLabel).toBe('조회 중');
  });
});
