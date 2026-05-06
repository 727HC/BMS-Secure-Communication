import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  AlertGlyph,
  ChevronDownIcon,
  ChevronRightIcon,
  ConnectorArrow,
  ExpandIcon,
  FleetGauge,
  KpiIcon,
  NodeGlyph,
  SecurityGlyph,
  TaskGlyph,
} from './Glyphs';

describe('Glyphs', () => {
  it('AlertGlyph renders an SVG for any severity', () => {
    const { container, rerender } = render(<AlertGlyph severity="High" />);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<AlertGlyph severity="Low" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('ConnectorArrow renders an SVG', () => {
    const { container } = render(<ConnectorArrow />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('ChevronDownIcon + ChevronRightIcon + ExpandIcon render SVGs', () => {
    expect(render(<ChevronDownIcon />).container.querySelector('svg')).not.toBeNull();
    expect(render(<ChevronRightIcon />).container.querySelector('svg')).not.toBeNull();
    expect(render(<ExpandIcon />).container.querySelector('svg')).not.toBeNull();
  });

  it('NodeGlyph renders for valid keys', () => {
    for (const key of ['cmu', 'bmu', 'agent', 'blockchain', 'passport']) {
      const { container } = render(<NodeGlyph name={key} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('SecurityGlyph renders for lock/shield/key', () => {
    for (const key of ['lock', 'shield', 'key']) {
      const { container } = render(<SecurityGlyph name={key} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('KpiIcon renders for all 4 names', () => {
    for (const key of ['battery', 'check', 'alert', 'chain'] as const) {
      const { container } = render(<KpiIcon name={key} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('TaskGlyph renders for valid icon names', () => {
    for (const key of ['folder', 'user', 'wrench', 'upload']) {
      const { container } = render(<TaskGlyph name={key} />);
      expect(container.querySelector('svg')).not.toBeNull();
    }
  });

  it('FleetGauge renders label + value with tone class', () => {
    const { getByText, container } = render(<FleetGauge label="SOC" value="75%" tone="green" />);
    expect(getByText('SOC')).not.toBeNull();
    expect(getByText('75%')).not.toBeNull();
    expect(container.querySelector('.vk-gauge--green')).not.toBeNull();
  });
});
