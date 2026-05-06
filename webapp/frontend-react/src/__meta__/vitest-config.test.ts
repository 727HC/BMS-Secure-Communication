import { describe, expect, it } from 'vitest';
import config from '../../vitest.config';

describe('vitest.config.ts', () => {
  // Vitest's defineConfig returns a UserConfig — we read the test section.
  type CfgWithTest = { test?: { environment?: string; include?: string[]; globals?: boolean } };
  const cfg = config as unknown as CfgWithTest;

  it('uses jsdom environment for React component tests', () => {
    expect(cfg.test?.environment).toBe('jsdom');
  });

  it('includes only src/**/*.test.{ts,tsx} files', () => {
    expect(cfg.test?.include).toEqual(['src/**/*.test.ts', 'src/**/*.test.tsx']);
  });

  it('enables vitest globals (describe/it/expect available without import)', () => {
    expect(cfg.test?.globals).toBe(true);
  });
});
