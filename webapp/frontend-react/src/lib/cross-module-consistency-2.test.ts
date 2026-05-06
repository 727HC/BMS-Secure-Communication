import { describe, expect, it } from 'vitest';
import { MSP, MSP_LABELS } from './api';
import { AUDIT_ALLOWED_ORGS } from '../components/dashboard/lib';
import { GBA_FIELDS } from '../components/passports/lib';
import { GBA_21_FIELDS } from '../components/passport-detail/helpers';

describe('cross-module consistency (round 2)', () => {
  it('every MSP value has a Korean MSP_LABELS entry', () => {
    for (const value of Object.values(MSP)) {
      expect(MSP_LABELS[value]).toBeTruthy();
      expect(typeof MSP_LABELS[value]).toBe('string');
    }
  });

  it('AUDIT_ALLOWED_ORGS values are subset of MSP enum', () => {
    const validOrgs = new Set<string>(Object.values(MSP));
    for (const org of AUDIT_ALLOWED_ORGS) {
      expect(validOrgs.has(org)).toBe(true);
    }
  });

  it('passports GBA_FIELDS and passport-detail GBA_21_FIELDS both have 21 entries', () => {
    expect(GBA_FIELDS.length).toBe(21);
    expect(GBA_21_FIELDS.length).toBe(21);
  });

  it('passport-detail GBA_21_FIELDS keys are subset of passports GBA_FIELDS', () => {
    const allowed = new Set(GBA_FIELDS as readonly string[]);
    for (const f of GBA_21_FIELDS) {
      expect(allowed.has(f.key as string), `GBA_21_FIELDS key ${String(f.key)} not in GBA_FIELDS`).toBe(true);
    }
  });

  it('MSP enum has exactly 4 organizations', () => {
    expect(Object.keys(MSP).length).toBe(4);
    expect(MSP.Manufacturer).toBe('ManufacturerMSP');
    expect(MSP.EVManufacturer).toBe('EVManufacturerMSP');
    expect(MSP.Service).toBe('ServiceMSP');
    expect(MSP.Regulator).toBe('RegulatorMSP');
  });
});
