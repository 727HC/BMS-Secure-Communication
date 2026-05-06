import { describe, expect, it } from 'vitest';
import root from '../../tsconfig.json' with { type: 'json' };
import app from '../../tsconfig.app.json' with { type: 'json' };

describe('tsconfig.json (root)', () => {
  it('uses project references for app + node', () => {
    expect(root.references).toBeInstanceOf(Array);
    const paths = (root.references as { path: string }[]).map((r) => r.path);
    expect(paths).toContain('./tsconfig.app.json');
    expect(paths).toContain('./tsconfig.node.json');
  });

  it('has empty files array (sub-projects own them)', () => {
    expect(root.files).toEqual([]);
  });
});

describe('tsconfig.app.json', () => {
  const opts = app.compilerOptions;

  it('uses ES2022 target + module ESNext', () => {
    expect(opts.target).toBe('ES2022');
    expect(opts.module).toBe('ESNext');
  });

  it('uses bundler module resolution + jsx=react-jsx', () => {
    expect(opts.moduleResolution).toBe('bundler');
    expect(opts.jsx).toBe('react-jsx');
  });

  it('enforces strict + isolatedModules', () => {
    expect(opts.strict).toBe(true);
    expect(opts.isolatedModules).toBe(true);
  });

  it('does not emit (Vite handles bundling)', () => {
    expect(opts.noEmit).toBe(true);
  });

  it('catches switch fallthrough', () => {
    expect(opts.noFallthroughCasesInSwitch).toBe(true);
  });

  it('includes only src', () => {
    expect(app.include).toEqual(['src']);
  });
});
