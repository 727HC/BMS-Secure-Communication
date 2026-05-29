import { type ReactNode, createContext, useContext, useEffect } from 'react';

// Surfaces the current modal's submit error inside the modal (above the
// z-index:80 overlay). Null when there is no error / no provider.
export const ModalErrorContext = createContext<string | null>(null);

interface BaseModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}

export default function BaseModal({ open, title, onClose, children, maxWidth = 520 }: BaseModalProps) {
  const error = useContext(ModalErrorContext);

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
        {error && (
          <div
            role="alert"
            style={{ marginBottom: '1rem', padding: '0.75rem 0.9rem', borderRadius: '0.6rem', background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: '1px solid var(--color-border)', fontSize: '0.9rem', lineHeight: 1.6 }}
          >
            {error}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
