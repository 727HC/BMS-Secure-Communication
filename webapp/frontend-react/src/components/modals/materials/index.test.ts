import { describe, expect, it } from 'vitest';
import * as M from './index';

describe('modals/materials/index barrel', () => {
  it('exports MaterialCreateModal + MaterialDetailModal as functions', () => {
    expect(M.MaterialCreateModal).toBeTypeOf('function');
    expect(M.MaterialDetailModal).toBeTypeOf('function');
  });
});
