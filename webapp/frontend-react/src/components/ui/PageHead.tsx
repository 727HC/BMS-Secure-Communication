import { type ReactNode } from 'react';

interface PageHeadProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export default function PageHead({ eyebrow, title, subtitle, actions }: PageHeadProps) {
  return (
    <div className="sn-page-head">
      <div className="sn-page-head-main">
        {eyebrow && (
          <p className="sn-eyebrow" style={{ margin: '0 0 0.35rem' }}>
            {eyebrow}
          </p>
        )}
        <h1 className="sn-page-title">{title}</h1>
        {subtitle && <p className="sn-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="sn-page-actions">{actions}</div>}
    </div>
  );
}
