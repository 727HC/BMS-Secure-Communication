import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MSP_LABELS } from '../../lib/api';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard', label: 'Overview',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/></svg>,
  },
  {
    to: '/maintenance', label: 'Tasks',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 11l2 2 5-5"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  },
  {
    to: '/passports', label: 'Battery Passport',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17h8"/></svg>,
  },
  {
    to: '/materials', label: 'Supply Chain',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 17l9 4.5 9-4.5"/></svg>,
  },
  {
    to: '/bmu-data', label: 'BMS Live Data',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 12h3l3-7 4 14 3-7h5"/></svg>,
  },
  {
    to: '/recycling', label: 'Recycling & EOL',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M7 20l-3-3 3-3"/><path d="M4 17h9a5 5 0 005-5"/><path d="M17 4l3 3-3 3"/><path d="M20 7h-9a5 5 0 00-5 5"/></svg>,
  },
  {
    to: '/audit-log', label: 'Audit / Ledger',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/></svg>,
  },
  {
    to: '/settings', label: 'Settings',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/maintenance': 'Tasks',
  '/passports': 'Battery Passport',
  '/materials': 'Supply Chain',
  '/bmu-data': 'BMS Live Data',
  '/recycling': 'Recycling & EOL',
  '/qr-scan': 'QR Scan',
  '/audit-log': 'Audit / Ledger',
  '/settings': 'Settings',
};

function userInitials(userId: string | null): string {
  if (!userId) return '?';
  return userId.slice(0, 2).toUpperCase();
}

export default function Layout({ children }: { children: ReactNode }) {
  const { userId, org, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const orgLabel = org ? (MSP_LABELS[org] || org) : '';
  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/passports/') ? '배터리 여권 상세' : 'VELKERN');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <aside className="ev-sidebar">
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 4px 22px', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <img
            src="/velkern-mini-logo.png"
            alt="VELKERN"
            draggable={false}
            style={{ width: '100%', maxWidth: '180px', height: 'auto', objectFit: 'contain', display: 'block' }}
          />
        </div>

        <div className="ev-sidebar-nav" style={{ flex: 1 }}>
          <div className="ev-sidebar-section-label">주요 화면</div>
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to === '/passports' && location.pathname.startsWith('/passports/'));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`ev-sidebar-link${isActive ? ' active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div style={{ paddingTop: 16, borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            type="button"
            className="ev-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            <span className="ev-theme-toggle__icon" aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? '라이트 모드' : '다크 모드'}</span>
          </button>
          <div className="ev-sidebar-profile" style={{ marginTop: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--color-avatar-bg)', color: 'var(--color-avatar-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {userInitials(userId)}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-1)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userId}</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{orgLabel}</p>
            </div>
            <button onClick={handleLogout} title="로그아웃" style={{ width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 10, color: 'var(--color-text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <div className="ev-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0, gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden"
              style={{ padding: 6, background: 'none', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-1)', margin: 0, letterSpacing: '-0.02em' }}>{pageTitle}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 12px', borderRadius: 10, background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text-3)', minWidth: 220 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="Search..." style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-1)', fontSize: '0.88rem' }} />
            </div>
            <button type="button" aria-label="Notifications" style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>
              <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{userId}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--color-surface-accent)', color: 'var(--color-accent)' }}>{orgLabel}</span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
