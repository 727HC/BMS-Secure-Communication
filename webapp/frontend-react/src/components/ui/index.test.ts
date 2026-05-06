import { describe, expect, it } from 'vitest';
import * as Ui from './index';

describe('ui/index barrel exports', () => {
  it('re-exports primitives + charts + skeleton + brand', () => {
    expect(Ui.Spinner).toBeTypeOf('function');
    expect(Ui.StatusPill).toBeTypeOf('function');
    expect(Ui.PageHead).toBeTypeOf('function');
    expect(Ui.SpecRow).toBeTypeOf('function');
    expect(Ui.DonutChart).toBeTypeOf('function');
    expect(Ui.Sparkline).toBeTypeOf('function');
    expect(Ui.BarRows).toBeTypeOf('function');
    expect(Ui.LegendStack).toBeTypeOf('function');
    expect(Ui.BatteryOutline).toBeTypeOf('function');
    expect(Ui.ArcGauge).toBeTypeOf('function');
    expect(Ui.Skeleton).toBeTypeOf('function');
    expect(Ui.SkeletonRows).toBeTypeOf('function');
    expect(Ui.SkeletonCard).toBeTypeOf('function');
    expect(Ui.SkeletonTable).toBeTypeOf('function');
    expect(Ui.PageDataLoadingSkeleton).toBeTypeOf('function');
    expect(Ui.BrandMark).toBeTypeOf('function');
    expect(Ui.BrandGlyph).toBeTypeOf('function');
  });
});
