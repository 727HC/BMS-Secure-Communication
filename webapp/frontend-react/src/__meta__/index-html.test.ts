// @ts-expect-error - node built-ins not in lib but available at runtime in vitest
import { readFileSync } from 'node:fs';
// @ts-expect-error - node built-ins not in lib but available at runtime in vitest
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

declare const process: { cwd: () => string };

describe('index.html', () => {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf-8') as string;

  it('is HTML5 doctype with Korean lang', () => {
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toContain('lang="ko"');
  });

  it('has UTF-8 charset + viewport meta', () => {
    expect(html).toContain('charset="UTF-8"');
    expect(html).toContain('width=device-width, initial-scale=1.0');
  });

  it('has VELKERN title', () => {
    expect(html).toContain('<title>VELKERN</title>');
  });

  it('has #root mount point', () => {
    expect(html).toContain('id="root"');
  });

  it('loads main.tsx as ES module', () => {
    expect(html).toMatch(/<script\s+type="module"\s+src="\/src\/main\.tsx"/);
  });

  it('preconnects Google Fonts', () => {
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('fonts.gstatic.com');
  });

  it('loads Pretendard font (Korean)', () => {
    expect(html.toLowerCase()).toContain('pretendard');
  });
});
