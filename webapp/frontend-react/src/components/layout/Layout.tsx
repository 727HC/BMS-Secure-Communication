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
    to: '/dashboard', label: '대시보드',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10.5V20h5v-5h4v5h5v-9.5"/></svg>,
  },
  {
    to: '/maintenance', label: '대기 항목',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 3v18"/><path d="M7 8h10"/><path d="M7 16h10"/></svg>,
  },
  {
    to: '/passports', label: '배터리 여권',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
  {
    to: '/materials', label: '원자재 관리',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"/><path d="M3 12l9 4.5 9-4.5"/></svg>,
  },
  {
    to: '/bmu-data', label: '배터리 데이터',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M4 18h4V8H4z"/><path d="M10 18h4V4h-4z"/><path d="M16 18h4v-7h-4z"/></svg>,
  },
  {
    to: '/recycling', label: '표준/재활용',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M7 7h11v11"/><path d="M7 17l10-10"/></svg>,
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/maintenance': '대기 항목',
  '/passports': '배터리 여권',
  '/materials': '원자재 관리',
  '/bmu-data': '배터리 데이터',
  '/recycling': '표준/재활용',
  '/qr-scan': 'QR 스캔',
  '/audit-log': '감사 로그',
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
    (location.pathname.startsWith('/passports/') ? '배터리 여권 상세' : 'BatteryPass');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <aside className="ev-sidebar">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px 18px', cursor: 'pointer' }}
          onClick={() => navigate('/dashboard')}
        >
          <div style={{ width: 40, height: 40, background: 'var(--color-accent)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-elevated)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.3"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="6" y1="7" x2="18" y2="7"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-accent)', margin: '0 0 2px' }}>BATP</p>
            <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text-1)', margin: 0 }}>BatteryPass</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', margin: '2px 0 0' }}>배터리 여권 작업 공간</p>
          </div>
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
        <header style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden"
              style={{ padding: 6, background: 'none', border: 'none', color: 'var(--color-text-2)', cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-1)', margin: 0, letterSpacing: '-0.02em' }}>{pageTitle}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{userId}</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--color-surface-accent)', color: 'var(--color-accent)' }}>{orgLabel}</span>
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>{children}</main>
      </div>
    </div>
  );
}
