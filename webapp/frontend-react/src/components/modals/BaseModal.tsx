import { type ReactNode, useEffect } from 'react';

interface BaseModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}

export default function BaseModal({ open, title, onClose, children, maxWidth = 520 }: BaseModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sn-overlay" onClick={onClose}>
      <div
        className="sn-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth, padding: '1.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="sn-heading" style={{ fontSize: '1.125rem', margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20 }}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
