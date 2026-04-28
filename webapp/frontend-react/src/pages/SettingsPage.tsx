import { type ReactNode } from 'react';
import { PageHead } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MSP_LABELS } from '../lib/api';

interface SettingCardProps {
  label: string;
  value: string;
  note: string;
  mono?: boolean;
}

function displayValue(value: string | null, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

function SettingCard({ label, value, note, mono = false }: SettingCardProps) {
  return (
    <div className="sn-info-tile" style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <p className="sn-eyebrow" style={{ margin: 0 }}>{label}</p>
      <p
        className={mono ? 'sn-mono' : 'sn-heading'}
        style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--color-text-1)',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </p>
      <p className="sn-stat-note" style={{ margin: 0 }}>{note}</p>
    </div>
  );
}

function NotePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sn-panel" style={{ padding: '1rem 1.1rem' }}>
      <p className="sn-eyebrow" style={{ margin: '0 0 0.7rem', color: 'var(--color-accent)' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {children}
      </div>
    </section>
  );
}

function NoteLine({ children }: { children: ReactNode }) {
  return (
    <p className="sn-body" style={{ margin: 0, fontSize: '0.9375rem' }}>
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const { token, userId, org } = useAuth();
  const { theme } = useTheme();

  const orgLabel = org ? (MSP_LABELS[org] || org) : '조직 미확인';
  const orgMsp = displayValue(org, 'MSP 미확인');
  const userLabel = displayValue(userId, '사용자 ID 없음');
  const themeLabel = theme === 'dark' ? '다크 모드' : '라이트 모드';
  const sessionState = token ? '인증됨' : '세션 없음';

  return (
    <div data-page="settings" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHead
        eyebrow="설정 기록"
        title="설정"
        subtitle="현재 로그인 세션, 조직 범위, 표시 환경을 읽기 전용으로 확인합니다."
      />

      <section className="sn-panel sn-summary-grid sn-summary-grid-3">
        <div className="sn-summary-lead">
          <p className="sn-eyebrow sn-summary-title" style={{ margin: '0 0 0.45rem' }}>접근 요약</p>
          <p className="sn-summary-copy-strong" style={{ margin: 0, color: 'var(--color-text-1)' }}>
            보호 라우트 · 세션 스냅샷 · 표시 환경
          </p>
          <p className="sn-stat-note" style={{ margin: '0.35rem 0 0', lineHeight: 1.6 }}>
            이 화면은 서버 설정을 조회하거나 변경하지 않고 브라우저에 이미 로드된 인증 상태만 보여줍니다.
          </p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">세션 상태</p>
          <p className="sn-stat-count">{sessionState}</p>
          <p className="sn-stat-note">RequireAuth 보호 범위</p>
        </div>
        <div>
          <p className="sn-eyebrow sn-stat-card-title">표시 테마</p>
          <p className="sn-stat-count">{themeLabel}</p>
          <p className="sn-stat-note">공통 레이아웃 테마 상태</p>
        </div>
      </section>

      <section className="sn-section-card">
        <div className="sn-section-head">
          <div className="sn-section-head-row">
            <div>
              <p className="sn-eyebrow" style={{ margin: '0 0 0.4rem', color: 'var(--color-text-3)' }}>세션 원장</p>
              <h2 className="sn-heading" style={{ margin: 0, fontSize: '1.25rem' }}>현재 접속 정보</h2>
              <p className="sn-caption" style={{ margin: '0.45rem 0 0', maxWidth: '42rem' }}>
                조직 라벨은 공통 MSP 매핑을 그대로 사용하며, 값이 비어 있으면 미확인 상태로 표시합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="sn-info-grid sn-info-grid-auto" style={{ borderBottom: 'none' }}>
          <SettingCard
            label="사용자"
            value={userLabel}
            note="인증 컨텍스트의 현재 사용자 ID입니다."
            mono
          />
          <SettingCard
            label="조직"
            value={orgLabel}
            note="MSP_LABELS 기준의 표시 이름입니다."
          />
          <SettingCard
            label="MSP"
            value={orgMsp}
            note="접근 범위 판단에 사용되는 원본 조직 식별자입니다."
            mono
          />
          <SettingCard
            label="토큰"
            value={token ? '세션 토큰 감지됨' : '토큰 없음'}
            note="민감한 토큰 값은 화면에 노출하지 않습니다."
          />
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <NotePanel title="세션 / 보안 메모">
          <NoteLine>인증되지 않은 사용자는 이 라우트에 머물 수 없고 로그인 화면으로 이동합니다.</NoteLine>
          <NoteLine>이 표면은 읽기 전용입니다. 인증 정보와 조직 범위는 여기서 변경하지 않습니다.</NoteLine>
          <NoteLine>세션 토큰은 존재 여부만 표시하며 원문 값은 기록하거나 노출하지 않습니다.</NoteLine>
        </NotePanel>

        <NotePanel title="제품 / 시스템 선호">
          <NoteLine>테마 상태는 공통 ThemeContext에서 제공된 현재 값을 표시합니다.</NoteLine>
          <NoteLine>테마 변경은 공통 레이아웃의 기존 토글 동작을 사용합니다.</NoteLine>
          <NoteLine>새 설정 API나 별도 저장 로직 없이 현재 클라이언트 상태만 확인합니다.</NoteLine>
        </NotePanel>
      </div>
    </div>
  );
}
