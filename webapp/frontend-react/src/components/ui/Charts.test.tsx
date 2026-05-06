import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BarRows, DonutChart, LegendStack, Sparkline } from './Charts';

describe('DonutChart', () => {
  it('renders one ring + one segment per data point', () => {
    const { container } = render(
      <DonutChart segments={[
        { label: 'A', value: 1, color: '#f00' },
        { label: 'B', value: 2, color: '#0f0' },
        { label: 'C', value: 3, color: '#00f' },
      ]} animate={false} />,
    );
    const circles = container.querySelectorAll('circle');
    // 1 background ring + 3 segments
    expect(circles.length).toBe(4);
  });

  it('renders centerLabel and centerValue text nodes', () => {
    const { container } = render(
      <DonutChart segments={[{ label: 'A', value: 1, color: '#f00' }]} centerLabel="TOTAL" centerValue="42" animate={false} />,
    );
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(2);
    expect(texts[0].textContent).toBe('42');
    expect(texts[1].textContent).toBe('TOTAL');
  });

  it('treats zero total as 1 to avoid NaN', () => {
    const { container } = render(
      <DonutChart segments={[{ label: 'X', value: 0, color: '#f00' }]} animate={false} />,
    );
    const seg = container.querySelectorAll('circle')[1] as SVGCircleElement;
    // dasharray should be "0 c"; not NaN
    expect(seg.getAttribute('stroke-dasharray')).toMatch(/^0 [0-9.]+$/);
  });
});

describe('Sparkline', () => {
  it('renders empty svg when values is empty', () => {
    const { container } = render(<Sparkline values={[]} animate={false} />);
    expect(container.querySelector('path')).toBeNull();
  });

  it('renders fill + stroke path for non-empty values', () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} animate={false} />);
    const paths = container.querySelectorAll('path');
    // fill polygon + stroke line
    expect(paths.length).toBe(2);
  });

  it('handles single-value series (no division by zero)', () => {
    const { container } = render(<Sparkline values={[5]} animate={false} />);
    const stroke = container.querySelectorAll('path')[1] as SVGPathElement;
    expect(stroke.getAttribute('d')).toMatch(/^M0,/);
  });
});

describe('BarRows', () => {
  it('renders one row per item', () => {
    const { getByText } = render(
      <BarRows items={[
        { label: 'Alpha', value: 10 },
        { label: 'Beta', value: 20 },
      ]} />,
    );
    expect(getByText('Alpha')).not.toBeNull();
    expect(getByText('Beta')).not.toBeNull();
    // value cells render as text "10" and "20"
    expect(getByText('10')).not.toBeNull();
    expect(getByText('20')).not.toBeNull();
  });

  it('scales bar width relative to max', () => {
    const { container } = render(
      <BarRows items={[
        { label: 'X', value: 25 },
        { label: 'Y', value: 100 },
      ]} />,
    );
    // inner bars: width-style children of the track div
    const innerBars = Array.from(container.querySelectorAll('div > div > div')) as HTMLElement[];
    // max=100 → first bar 25%, second bar 100%
    const widths = innerBars.map((el) => el.style.width).filter(Boolean);
    expect(widths).toContain('25%');
    expect(widths).toContain('100%');
  });

  it('renders hint text suffix when provided', () => {
    const { getByText } = render(
      <BarRows items={[{ label: 'X', value: 50, hint: '%' }]} />,
    );
    expect(getByText('%')).not.toBeNull();
  });
});

describe('LegendStack', () => {
  it('renders label + value + percentage for each item', () => {
    const { getByText } = render(
      <LegendStack items={[
        { label: 'Done', value: 8, color: '#0a0' },
        { label: 'Open', value: 2, color: '#a00' },
      ]} />,
    );
    expect(getByText('Done')).not.toBeNull();
    expect(getByText('Open')).not.toBeNull();
    expect(getByText('80%')).not.toBeNull();
    expect(getByText('20%')).not.toBeNull();
  });

  it('treats zero total as 1 (no NaN%)', () => {
    const { getByText } = render(
      <LegendStack items={[{ label: 'Z', value: 0, color: '#000' }]} />,
    );
    expect(getByText('0%')).not.toBeNull();
  });
});
