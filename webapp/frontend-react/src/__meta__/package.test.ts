import { describe, expect, it } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };

describe('package.json metadata', () => {
  it('exposes expected npm scripts', () => {
    expect(pkg.scripts.dev).toBe('vite');
    expect(pkg.scripts.build).toContain('tsc');
    expect(pkg.scripts.build).toContain('vite build');
    expect(pkg.scripts.test).toBe('vitest run');
    expect(pkg.scripts['test:watch']).toBe('vitest');
  });

  it('uses ESM module type', () => {
    expect(pkg.type).toBe('module');
  });

  it('declares core runtime dependencies', () => {
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.dependencies['react-dom']).toBeDefined();
    expect(pkg.dependencies['react-router-dom']).toBeDefined();
    expect(pkg.dependencies['html5-qrcode']).toBeDefined();
  });

  it('declares vitest + testing-library devDependencies', () => {
    expect(pkg.devDependencies.vitest).toBeDefined();
    expect(pkg.devDependencies['@testing-library/react']).toBeDefined();
    expect(pkg.devDependencies['@testing-library/dom']).toBeDefined();
    expect(pkg.devDependencies.jsdom).toBeDefined();
  });

  it('uses React 19 major', () => {
    expect(pkg.dependencies.react).toMatch(/^\^?19\./);
    expect(pkg.dependencies['react-dom']).toMatch(/^\^?19\./);
  });
});
