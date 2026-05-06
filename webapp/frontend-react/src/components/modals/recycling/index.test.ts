import { describe, expect, it } from 'vitest';
import * as M from './index';

describe('modals/recycling/index barrel', () => {
  it('exports 4 modals as functions', () => {
    expect(M.ExtractModal).toBeTypeOf('function');
    expect(M.RecycleToggleModal).toBeTypeOf('function');
    expect(M.AnalysisResultModal).toBeTypeOf('function');
    expect(M.DisposeConfirmModal).toBeTypeOf('function');
  });
});
