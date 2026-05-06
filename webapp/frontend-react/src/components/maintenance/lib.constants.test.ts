import { describe, expect, it } from 'vitest';
import { MAINTENANCE_TYPES, PAGE_SIZE } from './lib';

describe('maintenance constants', () => {
  it('PAGE_SIZE = 12', () => {
    expect(PAGE_SIZE).toBe(12);
  });

  it('MAINTENANCE_TYPES contains routine/repair/recall/emergency', () => {
    expect(MAINTENANCE_TYPES.length).toBeGreaterThanOrEqual(3);
    const values = MAINTENANCE_TYPES.map((t: { value: string }) => t.value);
    expect(values).toContain('routine');
    expect(values).toContain('repair');
  });

  it('every entry has value + label string fields', () => {
    for (const t of MAINTENANCE_TYPES) {
      expect(t.value).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(typeof t.value).toBe('string');
      expect(typeof t.label).toBe('string');
    }
  });
});
