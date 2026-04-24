import { useState, type CSSProperties } from 'react';

const DEFAULT_VELKERN_LOGO_SRC = '/velkern-logo.png';

interface BrandMarkProps {
  src?: string;
  alt?: string;
  height?: number;
  className?: string;
  style?: CSSProperties;
  allowFallback?: boolean;
  fallbackText?: string;
}

function fallbackStyle(height: number): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    height,
    minWidth: Math.round(height * 2.2),
    fontFamily: 'var(--font-display)',
    fontSize: Math.max(18, Math.round(height * 0.46)),
    fontWeight: 800,
    letterSpacing: '0.08em',
    lineHeight: 1,
    color: 'var(--color-text-1)',
  };
}

export function BrandGlyph(props: Omit<BrandMarkProps, 'fallbackText'>) {
  return <BrandMark {...props} fallbackText="VELKERN" />;
}

export default function BrandMark({
  src = DEFAULT_VELKERN_LOGO_SRC,
  alt = 'VELKERN',
  height = 40,
  className,
  style,
  allowFallback = true,
  fallbackText = 'VELKERN',
}: BrandMarkProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoFailed && allowFallback) {
    return (
      <span className={className} style={{ ...fallbackStyle(height), ...style }} aria-label={alt}>
        {fallbackText}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      decoding="async"
      draggable={false}
      onError={() => setLogoFailed(true)}
      style={{
        display: 'block',
        height,
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}
