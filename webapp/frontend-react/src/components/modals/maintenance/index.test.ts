import { describe, expect, it } from 'vitest';
import * as M from './index';

describe('modals/maintenance/index barrel', () => {
  it('exports 3 modals as functions', () => {
    expect(M.AccidentLogModal).toBeTypeOf('function');
    expect(M.MaintenanceRequestModal).toBeTypeOf('function');
    expect(M.MaintenanceLogModal).toBeTypeOf('function');
  });
});
