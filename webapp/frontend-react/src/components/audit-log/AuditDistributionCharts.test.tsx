import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import AuditDistributionCharts from './AuditDistributionCharts';

function build(overrides: Partial<ComponentProps<typeof AuditDistributionCharts>> = {}) {
  return {
    logsCount: 12,
    methodDistribution: [
      { label: 'GET', value: 8, color: '#0a0' },
      { label: 'POST', value: 4, color: '#a00' },
    ],
    actionDistribution: [
      { action: 'CREATE_PASSPORT', count: 5 },
      { action: 'UNKNOWN_ACTION', count: 2 },
    ],
    statusDistribution: [
      { key: '2xx', label: '2xx', value: 10, color: '#0a0' },
      { key: '5xx', label: '5xx', value: 2, color: '#a00' },
    ],
    statusSummary: { success: 10, fail: 2, successPct: 83, total: 12 },
    ...overrides,
  };
}

describe('AuditDistributionCharts', () => {
  it('renders both section cards (method + action / status)', () => {
    const { container } = render(<AuditDistributionCharts {...build()} />);
    expect(container.querySelectorAll('.sn-section-card').length).toBe(2);
  });

  it('passes logsCount to DonutChart center value', () => {
    const { container } = render(<AuditDistributionCharts {...build({ logsCount: 99 })} />);
    expect(container.textContent).toContain('99');
  });

  it('renders method legend labels (GET, POST)', () => {
    const { getByText } = render(<AuditDistributionCharts {...build()} />);
    expect(getByText('GET')).not.toBeNull();
    expect(getByText('POST')).not.toBeNull();
  });

  it('maps action codes through ACTION_LABELS dictionary', () => {
    const { getByText } = render(<AuditDistributionCharts {...build()} />);
    expect(getByText('여권 생성')).not.toBeNull();
  });

  it('falls back to raw action code when not in ACTION_LABELS', () => {
    const { getByText } = render(<AuditDistributionCharts {...build()} />);
    expect(getByText('UNKNOWN_ACTION')).not.toBeNull();
  });

  it('renders status summary line when statusSummary is present', () => {
    const { getByText } = render(<AuditDistributionCharts {...build()} />);
    expect(getByText(/성공 10건, 실패 2건 · 성공률 83%/)).not.toBeNull();
  });

  it('renders fallback caption when statusSummary is null', () => {
    const { getByText } = render(<AuditDistributionCharts {...build({ statusSummary: null })} />);
    expect(getByText('상태 코드가 있는 로그가 없습니다.')).not.toBeNull();
  });

  it('renders fallback when statusDistribution is empty', () => {
    const { getByText } = render(<AuditDistributionCharts {...build({ statusDistribution: [] })} />);
    expect(getByText('상태 코드 정보 없음')).not.toBeNull();
  });
});
