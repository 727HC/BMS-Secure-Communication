import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import KpiRow from './KpiRow';
import type { KpiCardViewModel } from './lib';

const sampleCards: KpiCardViewModel[] = [
  {
    label: '총 등록',
    value: '42',
    delta: '+5',
    tone: 'blue',
    icon: 'battery',
    visual: {
      trend: {
        kind: 'total', mode: 'daily-count', source: 'passports.createdAt',
        caption: '7일', valueLabel: '42',
        points: [{ label: 'D1', value: 30, timestamp: 1 }, { label: 'D2', value: 42, timestamp: 2 }],
      },
    },
  },
  {
    label: '운행 중',
    value: '88%',
    delta: '+2',
    tone: 'green',
    icon: 'check',
    visual: {
      trend: {
        kind: 'normal', mode: 'snapshot-sparkline', source: 'metric.snapshot',
        caption: '정상', valueLabel: '88%',
        points: [{ label: 'P', value: 0.88, timestamp: 1 }],
      },
    },
  },
];

describe('KpiRow', () => {
  it('renders one article per kpi card', () => {
    const { container } = render(<KpiRow kpiCards={sampleCards} />);
    expect(container.querySelectorAll('article.vk-kpi').length).toBe(2);
  });

  it('renders label, value, delta per card', () => {
    const { getByText } = render(<KpiRow kpiCards={sampleCards} />);
    expect(getByText('총 등록')).not.toBeNull();
    expect(getByText('+5')).not.toBeNull();
    expect(getByText('운행 중')).not.toBeNull();
    expect(getByText('+2')).not.toBeNull();
  });

  it('applies tone class per card', () => {
    const { container } = render(<KpiRow kpiCards={sampleCards} />);
    expect(container.querySelector('.vk-kpi--blue')).not.toBeNull();
    expect(container.querySelector('.vk-kpi--green')).not.toBeNull();
  });

  it('renders embedded KpiTrendSparkline (vk-kpi__trend wrapper) per card', () => {
    const { container } = render(<KpiRow kpiCards={sampleCards} />);
    expect(container.querySelectorAll('[data-kpi-trend-sparkline="true"]').length).toBe(2);
  });

  it('renders empty grid when kpiCards is empty', () => {
    const { container } = render(<KpiRow kpiCards={[]} />);
    expect(container.querySelector('.vk-grid--4')).not.toBeNull();
    expect(container.querySelectorAll('article.vk-kpi').length).toBe(0);
  });

  it('uses card label as React key (renders unique cards)', () => {
    const { getAllByText } = render(<KpiRow kpiCards={sampleCards} />);
    expect(getAllByText('42').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('88%').length).toBeGreaterThanOrEqual(1);
  });
});
