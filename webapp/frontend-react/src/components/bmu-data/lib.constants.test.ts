import { describe, expect, it } from 'vitest';
import { BADGE_STYLES } from './lib';

describe('bmu-data constants', () => {
  it('BADGE_STYLES has blue/green/red color tokens', () => {
    for (const tone of ['blue', 'green', 'red'] as const) {
      expect(BADGE_STYLES[tone]).toBeDefined();
      expect(BADGE_STYLES[tone].bg).toBeTruthy();
      expect(BADGE_STYLES[tone].color).toBeTruthy();
      expect(BADGE_STYLES[tone].dot).toBeTruthy();
    }
  });
});
