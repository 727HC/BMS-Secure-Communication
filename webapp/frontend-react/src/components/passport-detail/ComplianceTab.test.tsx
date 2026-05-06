import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import ComplianceTab from './ComplianceTab';
import type { Credential, GbaCompliance, Passport } from './types';

function buildGroups(filled: number, total: number) {
  return [
    {
      name: '기본정보',
      fields: Array.from({ length: total }, (_, i) => ({
        idx: i, key: 'passportId' as keyof Passport, label: `필드 ${i + 1}`, group: '기본정보', filled: i < filled,
      })),
    },
  ];
}

function build(overrides: Partial<ComponentProps<typeof ComplianceTab>> = {}) {
  const gbaCompliance: GbaCompliance = {
    filled: 21, total: 21, pct: 100, allFilled: true, groups: buildGroups(21, 21),
  };
  return {
    passport: {} as unknown as Passport,
    gbaCompliance,
    complianceGrade: 'A' as const,
    vcList: [
      { credentialId: 'VC1', credType: 'GBA', status: 'ACTIVE', issuedAt: '2026-05-01' } as Credential,
      { credentialId: 'VC2', credType: 'GBA', status: 'EXPIRED', issuedAt: '2025-01-01' } as Credential,
    ],
    canUpdateRegulatory: false,
    onUpdateRegulatory: vi.fn(),
    ...overrides,
  };
}

describe('ComplianceTab', () => {
  it('renders 검증 완료 stamp when pct=100 + active VC > 0', () => {
    const { getByText } = render(<ComplianceTab {...build()} />);
    expect(getByText('검증 완료')).not.toBeNull();
  });

  it('renders 부분 검증 stamp when active VC > 0 but pct < 100', () => {
    const compliance: GbaCompliance = { filled: 10, total: 21, pct: 47, allFilled: false, groups: buildGroups(10, 21) };
    const { getByText } = render(<ComplianceTab {...build({ gbaCompliance: compliance })} />);
    expect(getByText('부분 검증')).not.toBeNull();
  });

  it('renders 증빙 없음 when no active VCs', () => {
    const { getByText } = render(<ComplianceTab {...build({ vcList: [] })} />);
    expect(getByText('증빙 없음')).not.toBeNull();
  });

  it('uses passport.regulatoryVerificationStatus when present', () => {
    const passport = { regulatoryVerificationStatus: 'CUSTOM_STATUS' } as unknown as Passport;
    const { getAllByText } = render(<ComplianceTab {...build({ passport })} />);
    // appears in both VC status stamp and 백엔드 검증 상태 SpecRow
    expect(getAllByText('CUSTOM_STATUS').length).toBe(2);
  });

  it('hides 상태 갱신 button when canUpdateRegulatory=false', () => {
    const { queryByText } = render(<ComplianceTab {...build()} />);
    expect(queryByText('상태 갱신')).toBeNull();
  });

  it('shows 상태 갱신 button when canUpdateRegulatory=true and emits callback', () => {
    const props = build({ canUpdateRegulatory: true });
    const { getByText } = render(<ComplianceTab {...props} />);
    fireEvent.click(getByText('상태 갱신'));
    expect(props.onUpdateRegulatory).toHaveBeenCalled();
  });

  it('renders VC counts (총 / active)', () => {
    const { getByText, getAllByText } = render(<ComplianceTab {...build()} />);
    expect(getByText('2건')).not.toBeNull();
    // active count = 1, also '1건' may appear elsewhere
    expect(getAllByText('1건').length).toBeGreaterThanOrEqual(1);
  });

  it('renders 충족 (Verified) when fully verified, 미달 otherwise', () => {
    const { getByText, rerender } = render(<ComplianceTab {...build()} />);
    expect(getByText('충족 (Verified)')).not.toBeNull();
    rerender(<ComplianceTab {...build({ vcList: [] })} />);
    expect(getByText('미달 (Pending/Missing)')).not.toBeNull();
  });

  it('renders complianceGrade letter in 규제 등급 section', () => {
    const { getByText } = render(<ComplianceTab {...build({ complianceGrade: 'B' })} />);
    expect(getByText('B')).not.toBeNull();
  });

  it('renders GBA pct%, filled count, missing count', () => {
    const compliance: GbaCompliance = { filled: 15, total: 21, pct: 71, allFilled: false, groups: buildGroups(15, 21) };
    const { getByText } = render(<ComplianceTab {...build({ gbaCompliance: compliance })} />);
    expect(getByText('71%')).not.toBeNull();
    expect(getByText('15개')).not.toBeNull();
    expect(getByText('6개')).not.toBeNull(); // 21-15
  });

  it('shows 모든 핵심 항목이 채워졌습니다 stamp when no missing fields', () => {
    const { getByText } = render(<ComplianceTab {...build()} />);
    expect(getByText('모든 핵심 항목이 채워졌습니다')).not.toBeNull();
  });

  it('renders top-6 missing field labels when fields are missing', () => {
    const compliance: GbaCompliance = { filled: 5, total: 21, pct: 24, allFilled: false, groups: buildGroups(5, 21) };
    const { getAllByText, queryAllByText } = render(<ComplianceTab {...build({ gbaCompliance: compliance })} />);
    // each label appears in 우선 보완 + 그룹 break-down → 2 occurrences
    expect(getAllByText('필드 6').length).toBe(2);
    expect(getAllByText('필드 11').length).toBe(2);
    // top-6 cap → '필드 12' only in group break-down (not 우선 보완)
    expect(queryAllByText('필드 12').length).toBe(1);
  });

  it('renders group rows with N/M ratio stamps', () => {
    const { getByText } = render(<ComplianceTab {...build()} />);
    expect(getByText('21/21')).not.toBeNull();
  });
});
