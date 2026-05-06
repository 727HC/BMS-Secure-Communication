import { describe, expect, it } from 'vitest';
import * as Hub from './index';

describe('passport-detail/index barrel exports', () => {
  it('re-exports 5 tab components', () => {
    expect(Hub.IdentityTab).toBeTypeOf('function');
    expect(Hub.ComplianceTab).toBeTypeOf('function');
    expect(Hub.TraceabilityTab).toBeTypeOf('function');
    expect(Hub.DataTab).toBeTypeOf('function');
    expect(Hub.TrustTab).toBeTypeOf('function');
  });

  it('re-exports helper utilities', () => {
    expect(Hub.computeGbaCompliance).toBeTypeOf('function');
    expect(Hub.complianceGrade).toBeTypeOf('function');
    expect(Hub.GBA_21_FIELDS).toBeInstanceOf(Array);
    expect(Hub.GBA_21_FIELDS.length).toBe(21);
    expect(Hub.formatDate).toBeTypeOf('function');
    expect(Hub.parseVoltageRange).toBeTypeOf('function');
    expect(Hub.parseTempRange).toBeTypeOf('function');
  });
});
