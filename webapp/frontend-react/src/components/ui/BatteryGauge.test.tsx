import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ArcGauge, BatteryOutline } from './BatteryGauge';

describe('BatteryOutline', () => {
  it('clamps soc above 100 in aria-label', () => {
    const { container } = render(<BatteryOutline soc={150} />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('SOC 100%');
  });

  it('clamps negative soc to 0 in aria-label', () => {
    const { container } = render(<BatteryOutline soc={-10} />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('SOC 0%');
  });

  it('renders only 3 rects (body, tip, fill) when soh is undefined', () => {
    const { container } = render(<BatteryOutline soc={50} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(3);
  });

  it('renders 5 rects (body, tip, fill, soh track, soh fill) when soh provided', () => {
    const { container } = render(<BatteryOutline soc={80} soh={75} />);
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(5);
  });

  it('aria-label includes both SOC and SOH when soh provided', () => {
    const { container } = render(<BatteryOutline soc={80} soh={75} />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('SOC 80%, SOH 75%');
  });
});

describe('ArcGauge', () => {
  it('clamps value above 100 in label', () => {
    const { container } = render(<ArcGauge value={150} label="SOC" />);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('SOC 100%');
  });

  it('renders only track when value is 0 (no fill path)', () => {
    const { container } = render(<ArcGauge value={0} label="SOH" />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(1);
  });

  it('renders track + fill paths when value > 0', () => {
    const { container } = render(<ArcGauge value={50} label="SOH" />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
  });

  it('renders value text and label', () => {
    const { container } = render(<ArcGauge value={42} label="SOH" />);
    const texts = container.querySelectorAll('text');
    // value, label
    expect(texts.length).toBe(2);
    expect(texts[0].textContent).toContain('42');
    expect(texts[1].textContent).toBe('SOH');
  });

  it('renders sublabel as third text when provided', () => {
    const { container } = render(<ArcGauge value={42} label="SOH" sublabel="HEALTH" />);
    const texts = container.querySelectorAll('text');
    expect(texts.length).toBe(3);
    expect(texts[2].textContent).toBe('HEALTH');
  });
});
