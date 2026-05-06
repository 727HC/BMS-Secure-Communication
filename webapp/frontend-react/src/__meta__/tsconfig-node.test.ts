import { describe, expect, it } from 'vitest';
import node from '../../tsconfig.node.json' with { type: 'json' };

describe('tsconfig.node.json (vite.config compiler)', () => {
  const opts = node.compilerOptions;

  it('uses ES2023 target', () => {
    expect(opts.target).toBe('ES2023');
  });

  it('shares strict + isolated + noEmit settings with app config', () => {
    expect(opts.strict).toBe(true);
    expect(opts.noEmit).toBe(true);
    expect(opts.moduleResolution).toBe('bundler');
  });

  it('only includes vite.config.ts (not src/)', () => {
    expect(node.include).toEqual(['vite.config.ts']);
  });
});
