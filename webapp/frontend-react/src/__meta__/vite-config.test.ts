import { describe, expect, it } from 'vitest';
import config from '../../vite.config';

describe('vite.config.ts', () => {
  type CfgWithPaths = {
    plugins?: unknown[];
    build?: { outDir?: string };
    server?: { proxy?: Record<string, string | { target: string }> };
  };
  const cfg = config as unknown as CfgWithPaths;

  it('registers react + tailwind plugins', () => {
    expect(cfg.plugins?.length).toBeGreaterThanOrEqual(2);
  });

  it('emits build output to dist/', () => {
    expect(cfg.build?.outDir).toBe('dist');
  });

  it('proxies /api → http://localhost:3001 in dev server', () => {
    expect(cfg.server?.proxy?.['/api']).toBe('http://localhost:3001');
  });
});
