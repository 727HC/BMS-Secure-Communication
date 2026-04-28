import { type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MSP_LABELS } from '../../lib/api';
import ShellBrandLink from './ShellBrandLink';
import '../../styles/vk-dashboard-reference.css';

const AUDIT_ALLOWED_ORGS = new Set(['ManufacturerMSP', 'RegulatorMSP']);

interface DashboardReferenceShellProps {
  children: ReactNode;
}

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

// Layout.tsx의 NAV_ITEMS와 동일 — sidebar 시각 정합 유지.
const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: '개요',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/></svg> },
  { to: '/maintenance', label: '작업',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 11l2 2 5-5"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg> },
  { to: '/passports', label: '배터리 여권',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="2.5"/><path d="M8 17h8"/></svg> },
  { to: '/materials', label: '공급망',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 17l9 4.5 9-4.5"/></svg> },
  { to: '/bmu-data', label: 'BMS 실시간 데이터',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 12h3l3-7 4 14 3-7h5"/></svg> },
  { to: '/recycling', label: '재활용·ESG',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M7 20l-3-3 3-3"/><path d="M4 17h9a5 5 0 005-5"/><path d="M17 4l3 3-3 3"/><path d="M20 7h-9a5 5 0 00-5 5"/></svg> },
  { to: '/audit-log', label: '감사·원장',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/></svg> },
  { to: '/settings', label: '설정',
    icon: <svg className="ev-sidebar-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg> },
];

function userInitials(userId: string | null): string {
  if (!userId) return '?';
  return userId.slice(0, 2).toUpperCase();
}

export default function DashboardReferenceShell({ children }: DashboardReferenceShellProps) {
  const { logout, org, userId } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const canReadAudit = org ? AUDIT_ALLOWED_ORGS.has(org) : false;
  const orgLabel = org ? (MSP_LABELS[org] || org) : '조직 미확인';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="vk-ref-shell">
      <aside className="ev-sidebar" aria-label="Dashboard reference navigation">
        <ShellBrandLink />

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

      <main className="vk-ref-main">
        <header className="vk-ref-topbar">
          <div className="vk-ref-topbar__space" aria-hidden="true" />
          <div className="vk-ref-userbar" aria-label="Reference top controls">
            <button
              type="button"
              aria-label={canReadAudit ? '감사 로그 열기' : '감사 로그 (권한 필요)'}
              title={canReadAudit ? '감사 로그' : '권한 필요'}
              disabled={!canReadAudit}
              onClick={canReadAudit ? () => navigate('/audit-log') : undefined}
              style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-2)', cursor: canReadAudit ? 'pointer' : 'not-allowed', opacity: canReadAudit ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>
              {canReadAudit && <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-2)' }}>{userId}</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6, background: 'var(--color-surface-accent)', color: 'var(--color-accent)' }}>{orgLabel}</span>
          </div>
        </header>

        <section className="vk-ref-content" aria-label="Dashboard content">
          {children}
        </section>
      </main>
    </div>
  );
}
