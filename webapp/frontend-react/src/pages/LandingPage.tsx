import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const NETWORK_HERO_SRC = '/landing-network-hero.png';

const VALUE_ITEMS = [
  {
    key: 'verified',
    title: 'VERIFIED POWER',
    description: '검증된 정품 배터리 데이터',
    tone: 'blue',
  },
  {
    key: 'passport',
    title: 'TRUSTED PASSPORT',
    description: '블록체인 기반 변조 불가 기록',
    tone: 'blue',
  },
  {
    key: 'network',
    title: 'SECURE NETWORK',
    description: '엔드 투 엔드 보안 통신',
    tone: 'green',
  },
  {
    key: 'battery',
    title: 'BATTERY LIFECYCLE',
    description: '배터리 생애 주기 전반의 추적과 공유',
    tone: 'blue',
  },
  {
    key: 'future',
    title: 'SUSTAINABLE FUTURE',
    description: '친환경 미래를 위한 데이터 기반 의사결정',
    tone: 'green',
  },
] as const;

type ValueIconKey = (typeof VALUE_ITEMS)[number]['key'];

function ValueIcon({ name }: { name: ValueIconKey }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (name === 'verified') {
    return (
      <svg className="h-full w-full" viewBox="0 0 48 48" aria-hidden="true">
        <path {...common} d="M24 4 39 10v12c0 9.8-6.1 17.1-15 21-8.9-3.9-15-11.2-15-21V10L24 4Z" />
        <path {...common} d="m17 24 5 5 10-11" />
      </svg>
    );
  }
  if (name === 'passport') {
    return (
      <svg className="h-full w-full" viewBox="0 0 48 48" aria-hidden="true">
        <polygon {...common} points="24,6 38,14 24,22 10,14" />
        <polygon {...common} points="10,14 24,22 24,40 10,32" />
        <polygon {...common} points="38,14 24,22 24,40 38,32" />
      </svg>
    );
  }
  if (name === 'network') {
    return (
      <svg className="h-full w-full" viewBox="0 0 48 48" aria-hidden="true">
        <circle {...common} cx="24" cy="8" r="4.8" />
        <circle {...common} cx="10" cy="25" r="4.8" />
        <circle {...common} cx="24" cy="40" r="4.8" />
        <circle {...common} cx="38" cy="25" r="4.8" />
        <path {...common} d="m21 12-8 9m14-9 8 9M14 29l7 8m13-8-7 8M15 25h18" />
      </svg>
    );
  }
  if (name === 'battery') {
    return (
      <svg className="h-full w-full" viewBox="0 0 48 48" aria-hidden="true">
        <path {...common} d="M18 6h12v5h6v31H12V11h6V6Z" />
        <path {...common} d="M20 22h8m-4-4v8M19 34h10" />
      </svg>
    );
  }
  return (
    <svg className="h-full w-full" viewBox="0 0 48 48" aria-hidden="true">
      <circle {...common} cx="24" cy="24" r="18" />
      <path {...common} d="M7 24h34M24 6c5 5 7.4 11 7.4 18S29 37 24 42c-5-5-7.4-11-7.4-18S19 11 24 6Z" />
      <path {...common} d="M30 32c5-1 9-4 11-9-7 0-13 3-16 9 1.7.4 3.4.4 5 0Z" />
    </svg>
  );
}

function NetworkVisual() {
  return (
    <section
      className="relative ml-auto w-full min-w-0 max-w-[78rem]"
      aria-label="VELKERN trust network illustration"
    >
      <div className="relative w-full" style={{ aspectRatio: '2922 / 2284' }}>
        <img
          src={NETWORK_HERO_SRC}
          alt="VELKERN trust network"
          draggable={false}
          className="absolute inset-0 z-10 h-full w-full select-none object-contain"
        />
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const goLogin = () => navigate('/login');
  const isDark = theme === 'dark';
  return (
    <main
      data-page="landing"
      className={`min-h-screen overflow-hidden text-[var(--landing-ink)] ${isDark ? 'bg-[#0b1220]' : 'bg-white'}`}
      style={{
        colorScheme: isDark ? 'dark' : 'light',
        '--landing-ink': isDark ? '#e2e8f0' : '#06124a',
        '--landing-muted': isDark ? '#cbd5e1' : '#26345d',
        '--landing-soft': isDark ? '#94a3b8' : '#53617f',
        '--landing-blue': isDark ? '#60a5fa' : '#1769e0',
        '--landing-green': isDark ? '#34d399' : '#10b981',
        '--landing-border': isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(15, 23, 42, 0.12)',
      } as CSSProperties}
    >
      <h1 className="sr-only">VELKERN</h1>

      <div className="mx-auto flex min-h-screen w-full max-w-[1792px] flex-col px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-[0.65fr_1.35fr] lg:gap-2">
          <section className="flex min-w-0 max-w-[37rem] flex-col items-start text-left lg:pb-8 xl:pb-10">
            <img
              src="/velkern-wordmark-light.png"
              alt="VELKERN"
              draggable={false}
              className="w-full max-w-[28rem] select-none sm:max-w-[31rem] xl:max-w-[34rem]"
              style={isDark ? { filter: 'invert(1) hue-rotate(180deg)' } : undefined}
            />

            <p className="mt-10 font-[var(--font-display)] text-[2.7rem] font-extrabold leading-[1.08] tracking-[-0.055em] text-[var(--landing-blue)] sm:text-[3.25rem] xl:text-[3.75rem]">
              <span className="block">Verified Power.</span>
              <span className="block text-[var(--landing-green)]">Trusted Passport.</span>
            </p>
            <p className="mt-4 text-[1.35rem] font-medium leading-snug tracking-[-0.03em] text-[var(--landing-muted)] sm:text-[1.5rem]">
              From BMS Signal to Blockchain Trust.
            </p>
            <p className="mt-7 max-w-[33rem] text-[1rem] font-medium leading-[1.7] tracking-[-0.015em] text-[var(--landing-muted)] sm:text-[1.08rem]">
              VELKERN은 배터리 데이터를 신뢰 가능한 생태계에 안전하게 연결하는 엔드 투 엔드 플랫폼입니다. 검증된 전력에서 신뢰받는 여권까지, 지속 가능한 미래의 기반을 구축합니다.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={goLogin}
                className="inline-flex h-14 min-w-[11rem] items-center justify-center rounded-md bg-[var(--landing-blue)] px-8 text-[1rem] font-bold text-white shadow-[0_10px_20px_rgba(23,105,224,0.18)] hover:brightness-95"
              >
                시작하기
              </button>
              <a
                href="#landing-highlights"
                className={`inline-flex h-14 min-w-[11rem] items-center justify-center rounded-md border border-[var(--landing-blue)] px-8 text-[1rem] font-bold text-[var(--landing-blue)] hover:bg-[rgba(23,105,224,0.08)] ${isDark ? 'bg-transparent' : 'bg-white'}`}
              >
                자세히 보기
              </a>
            </div>
          </section>

          <NetworkVisual />
        </div>

        <section id="landing-highlights" className="border-t border-[var(--landing-border)] py-7" aria-label="VELKERN platform highlights">
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-5 lg:divide-x lg:divide-[var(--landing-border)]">
            {VALUE_ITEMS.map((item) => (
              <div key={item.key} className="flex items-start gap-4 px-2 sm:px-4 lg:px-6">
                <div
                  className="h-12 w-12 shrink-0"
                  style={{ color: item.tone === 'green' ? 'var(--landing-green)' : 'var(--landing-blue)' }}
                >
                  <ValueIcon name={item.key} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[0.9rem] font-extrabold leading-tight tracking-[-0.01em] text-[var(--landing-ink)]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-[0.94rem] font-medium leading-snug text-[var(--landing-soft)]">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
