import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import BrandMark, { BrandGlyph } from './BrandMark';

describe('BrandMark', () => {
  it('renders an <img> with default src and alt', () => {
    const { container } = render(<BrandMark />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.getAttribute('alt')).toBe('VELKERN');
    expect(img.getAttribute('src')).toContain('velkern-logo.png');
  });

  it('respects custom src/alt/height props', () => {
    const { container } = render(<BrandMark src="/custom.png" alt="Custom" height={64} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('/custom.png');
    expect(img.getAttribute('alt')).toBe('Custom');
    expect(img.style.height).toBe('64px');
  });

  it('falls back to text node on image error when allowFallback=true', () => {
    const { container } = render(<BrandMark fallbackText="LOGO" />);
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('LOGO');
  });

  it('keeps the broken img when allowFallback=false', () => {
    const { container } = render(<BrandMark allowFallback={false} />);
    const img = container.querySelector('img') as HTMLImageElement;
    fireEvent.error(img);
    // image stays in DOM (no fallback swap)
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('fallback span exposes alt as aria-label', () => {
    const { container } = render(<BrandMark alt="MyBrand" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(span.getAttribute('aria-label')).toBe('MyBrand');
  });
});

describe('BrandGlyph', () => {
  it('forces fallbackText to VELKERN', () => {
    const { container } = render(<BrandGlyph />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.textContent).toBe('VELKERN');
  });
});
