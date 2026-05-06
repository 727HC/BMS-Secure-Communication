import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import KpiTrendSparkline from './KpiTrendSparkline';
import type { KpiTrendViewModel } from './lib';

const dailyCountTrend: KpiTrendViewModel = {
  kind: 'total',
  mode: 'daily-count',
  source: 'passports.createdAt',
  caption: '최근 7일',
  valueLabel: '12',
  points: [
    { label: 'D1', value: 10, timestamp: 1 },
    { label: 'D2', value: 14, timestamp: 2 },
    { label: 'D3', value: 12, timestamp: 3 },
  ],
};

const snapshotTrend: KpiTrendViewModel = {
  kind: 'normal',
  mode: 'snapshot-sparkline',
  source: 'metric.snapshot',
  caption: '현재 비율',
  valueLabel: '75%',
  points: [
    { label: 'P', value: 0.75, timestamp: 100 },
  ],
};

describe('KpiTrendSparkline', () => {
  it('renders 1 baseline path + 1 trend line + 1 dot for non-empty trend', () => {
    const { container } = render(<KpiTrendSparkline label="총 등록" trend={dailyCountTrend} />);
    expect(container.querySelectorAll('path').length).toBe(2);
    expect(container.querySelectorAll('circle').length).toBe(1);
  });

  it('renders caption + valueLabel from trend', () => {
    const { getByText } = render(<KpiTrendSparkline label="총 등록" trend={dailyCountTrend} />);
    expect(getByText('최근 7일')).not.toBeNull();
    expect(getByText('12')).not.toBeNull();
  });

  it('uses daily-count aria-label format', () => {
    const { container } = render(<KpiTrendSparkline label="총 등록" trend={dailyCountTrend} />);
    const root = container.querySelector('[aria-label]');
    expect(root?.getAttribute('aria-label')).toBe('총 등록 실제 추이: 최근 7일');
  });

  it('uses snapshot aria-label format with valueLabel', () => {
    const { container } = render(<KpiTrendSparkline label="활성" trend={snapshotTrend} />);
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('활성 현재 비율 시각화: 75%');
  });

  it('exposes trend mode/kind/source via data attributes', () => {
    const { container } = render(<KpiTrendSparkline label="X" trend={dailyCountTrend} />);
    const root = container.querySelector('[data-kpi-trend-sparkline="true"]') as HTMLElement;
    expect(root.dataset.kpiTrendKind).toBe('total');
    expect(root.dataset.kpiTrendMode).toBe('daily-count');
    expect(root.dataset.kpiTrendSource).toBe('passports.createdAt');
    expect(root.dataset.kpiTrendPoints).toBe('3');
    expect(root.dataset.kpiTrendValues).toBe('10,14,12');
  });

  it('renders single-point trend without crashing', () => {
    const { container } = render(<KpiTrendSparkline label="활성" trend={snapshotTrend} />);
    expect(container.querySelectorAll('path').length).toBe(2);
    expect(container.querySelectorAll('circle').length).toBe(1);
  });
});
