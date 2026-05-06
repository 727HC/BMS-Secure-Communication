import { describe, expect, it } from 'vitest';
import { STATUS_LIST, STATUS_LABELS } from './helpers';
import { STATUS_OPTIONS, STATUS_COLORS } from '../components/passports/lib';
import { AUDIT_ALLOWED_ORGS } from '../components/dashboard/lib';

describe('cross-module consistency', () => {
  it('passports STATUS_OPTIONS values are subset of helpers STATUS_LIST (or empty placeholder)', () => {
    for (const opt of STATUS_OPTIONS) {
      if (!opt.value) continue;
      expect(STATUS_LIST as readonly string[]).toContain(opt.value);
    }
  });

  it('passports STATUS_COLORS keys are subset of helpers STATUS_LIST', () => {
    for (const status of Object.keys(STATUS_COLORS)) {
      expect(STATUS_LIST as readonly string[]).toContain(status);
    }
  });

  it('every helpers STATUS_LIST entry has a STATUS_LABELS Korean label', () => {
    for (const status of STATUS_LIST) {
      expect(STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('AUDIT_ALLOWED_ORGS only contains MSP names with -MSP suffix', () => {
    for (const org of AUDIT_ALLOWED_ORGS) {
      expect(org.endsWith('MSP')).toBe(true);
    }
  });

  it('AUDIT_ALLOWED_ORGS contains exactly Manufacturer + Regulator', () => {
    expect(AUDIT_ALLOWED_ORGS.size).toBe(2);
    expect(AUDIT_ALLOWED_ORGS.has('ManufacturerMSP')).toBe(true);
    expect(AUDIT_ALLOWED_ORGS.has('RegulatorMSP')).toBe(true);
  });
});
