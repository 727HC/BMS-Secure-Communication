import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/vk-dashboard-reference.css';

interface DashboardReferenceShellProps {
  children: ReactNode;
}

interface ReferenceNavItem {
  to: string;
  label: string;
  badge?: string;
  icon: ReactNode;
}

const referenceNavItems: ReferenceNavItem[] = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/></svg>,
  },
  {
    to: '/maintenance',
    label: 'Tasks',
    badge: '7',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l2.5 2.5L16.5 9"/></svg>,
  },
  {
    to: '/passports',
    label: 'Battery Passport',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M9 16h6"/></svg>,
  },
  {
    to: '/materials',
    label: 'Supply Chain',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z"/><path d="M4 12l8 4.5 8-4.5"/><path d="M4 16.5l8 4.5 8-4.5"/></svg>,
  },
  {
    to: '/bmu-data',
    label: 'BMS Live Data',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 5 12 2.5-6h4"/></svg>,
  },
  {
    to: '/recycling',
    label: 'Recycling & ESG',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20l-3-3 3-3"/><path d="M4 17h9a5 5 0 005-5"/><path d="M17 4l3 3-3 3"/><path d="M20 7h-9a5 5 0 00-5 5"/></svg>,
  },
  {
    to: '/audit-log',
    label: 'Audit / Ledger',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>,
  },
];

export default function DashboardReferenceShell({ children }: DashboardReferenceShellProps) {
  const { logout } = useAuth();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="vk-ref-shell">
      <aside className="vk-ref-sidebar" aria-label="Dashboard reference navigation">
        <Link className="vk-ref-brand" to="/dashboard" aria-label="VELKERN dashboard">
          <img className="vk-ref-brand__mark" src="/velkern-mini-logo.png" alt="VELKERN" draggable={false} />
        </Link>

        <nav className="vk-ref-nav" aria-label="Dashboard sections">
          {referenceNavItems.map((item) => {
            const isActive = item.to === '/dashboard';

            return (
              <Link
                key={item.label}
                to={item.to}
                className={`vk-ref-nav__item${isActive ? ' vk-ref-nav__item--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="vk-ref-nav__icon">{item.icon}</span>
                <span className="vk-ref-nav__label">{item.label}</span>
                {item.badge ? <span className="vk-ref-nav__badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="vk-ref-sidebar__footer">
          <div className="vk-ref-profile" aria-label="Reference dashboard profile">
            <span className="vk-ref-profile__avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 10-16 0"/><circle cx="12" cy="8" r="4"/></svg>
            </span>
            <span className="vk-ref-profile__meta">
              <span className="vk-ref-profile__name">user</span>
              <span className="vk-ref-profile__role">제조사</span>
            </span>
          </div>

          <div className="vk-ref-sidebar__controls" aria-label="Dashboard reference controls">
            <button type="button" className="vk-ref-sidebar-action" onClick={toggleTheme}>
              <span className="vk-ref-sidebar-action__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1111.2 3a6.8 6.8 0 009.8 9.8z"/></svg>
              </span>
              <span>다크 모드</span>
            </button>
            <button type="button" className="vk-ref-sidebar-action" onClick={handleLogout}>
              <span className="vk-ref-sidebar-action__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
              </span>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="vk-ref-main">
        <header className="vk-ref-topbar">
          <div className="vk-ref-topbar__space" aria-hidden="true" />
          <div className="vk-ref-userbar" aria-label="Reference top controls">
            <button type="button" className="vk-ref-top-action" aria-label="Notifications">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21h4"/></svg>
              <span className="vk-ref-top-action__badge">3</span>
            </button>
            <button type="button" className="vk-ref-top-action" aria-label="Messages">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></svg>
            </button>
            <button type="button" className="vk-ref-top-action" aria-label="Help">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.8 2.8 0 115 1.8c-.9.6-1.5 1.1-1.5 2.2"/><path d="M12 17h.01"/></svg>
            </button>
            <button type="button" className="vk-ref-role-menu" aria-label="Current organization">
              <span>제조사</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>
            </button>
          </div>
        </header>

        <section className="vk-ref-content" aria-label="Dashboard content">
          {children}
        </section>
      </main>
    </div>
  );
}
