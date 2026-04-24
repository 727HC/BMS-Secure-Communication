import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

const WORDMARK_SRC = '/velkern-wordmark-light.png';
const NETWORK_HERO_SRC = '/landing-network-hero.png';
const WORLD_MAP_SRC = '/landing-world-map.png';

const VALUE_ITEMS = [
  {
    key: 'verified',
    title: 'VERIFIED POWER',
    description: 'Reliable and authentic battery data',
    tone: 'blue',
  },
  {
    key: 'passport',
    title: 'TRUSTED PASSPORT',
    description: 'Immutable records on blockchain',
    tone: 'blue',
  },
  {
    key: 'network',
    title: 'SECURE NETWORK',
    description: 'End-to-end secure communication',
    tone: 'green',
  },
  {
    key: 'battery',
    title: 'BATTERY LIFECYCLE',
    description: 'Track and share across the entire lifecycle',
    tone: 'blue',
  },
  {
    key: 'future',
    title: 'SUSTAINABLE FUTURE',
    description: 'Data-driven decisions for a greener tomorrow',
    tone: 'green',
  },
] as const;

interface HexNode {
  key: string;
  text: string;
  cx: number; // hex center x (%)
  cy: number; // hex center y (%)
}

// 각 hex의 실측 centroid — 좌우 대칭 강제 X, 각각 자신의 hex 중앙에 정렬.
const HEX_NODES: readonly HexNode[] = [
  { key: 'manufacturer', text: 'MANUFACTURER', cx: 17.76, cy: 14.27 },
  { key: 'ev', text: 'EV MANUFACTURER', cx: 82.04, cy: 14.17 },
  { key: 'ecosystem', text: 'GLOBAL\nECOSYSTEM', cx: 7.35, cy: 54.15 },
  { key: 'service', text: 'SERVICE', cx: 92.45, cy: 54.35 },
  { key: 'regulator', text: 'REGULATOR', cx: 50.00, cy: 86.41 },
];

// 각 hex bottom edge = cy + HEX_RADIUS_PCT. 라벨 top = bottom + LABEL_GAP_PCT.
// → 모든 hex의 bottom과 label top 사이 간격이 정확히 LABEL_GAP_PCT로 통일됨.
const HEX_RADIUS_PCT = 8.3; // hex 세로 반지름 ~85px / 1023px
const LABEL_GAP_PCT = 3.0;

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
      className="relative mx-auto w-full min-w-0 max-w-[62rem]"
      aria-label="VELKERN trust network illustration"
    >
      <div className="relative w-full" style={{ aspectRatio: '1537 / 1023' }}>
        <img
          src={WORLD_MAP_SRC}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-x-0 bottom-[26%] z-0 w-full select-none"
          style={{ opacity: 0.9 }}
        />
        <img
          src={NETWORK_HERO_SRC}
          alt="VELKERN trust network"
          draggable={false}
          className="absolute inset-0 z-10 h-full w-full select-none object-contain"
        />
        {HEX_NODES.map((node) => (
          <p
            key={node.key}
            className="absolute z-20 whitespace-pre-line text-center text-[0.8rem] font-bold uppercase leading-[1.25] tracking-[0.06em] text-[var(--landing-ink)] sm:text-[0.9rem] lg:text-[1rem]"
            style={{
              top: `${node.cy + HEX_RADIUS_PCT + LABEL_GAP_PCT}%`,
              left: `${node.cx}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {node.text}
          </p>
        ))}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/login');
  return (
    <main
      className="min-h-screen overflow-hidden bg-white text-[var(--landing-ink)]"
      style={{
        colorScheme: 'light',
        '--landing-ink': '#06124a',
        '--landing-muted': '#26345d',
        '--landing-soft': '#53617f',
        '--landing-blue': '#1769e0',
        '--landing-green': '#10b981',
        '--landing-border': 'rgba(15, 23, 42, 0.12)',
      } as CSSProperties}
    >
      <h1 className="sr-only">VELKERN</h1>

      <div className="mx-auto flex min-h-screen w-full max-w-[1792px] flex-col px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-2">
          <section className="flex min-w-0 max-w-[37rem] flex-col items-start text-left lg:pb-8 xl:pb-10">
            <img
              src={WORDMARK_SRC}
              alt="VELKERN"
              draggable={false}
              className="w-full max-w-[28rem] select-none sm:max-w-[31rem] xl:max-w-[34rem]"
            />

            <p className="mt-10 font-[var(--font-display)] text-[2.7rem] font-extrabold leading-[1.08] tracking-[-0.055em] text-[var(--landing-blue)] sm:text-[3.25rem] xl:text-[3.75rem]">
              <span className="block">Verified Power.</span>
              <span className="block text-[var(--landing-green)]">Trusted Passport.</span>
            </p>
            <p className="mt-4 text-[1.35rem] font-medium leading-snug tracking-[-0.03em] text-[var(--landing-muted)] sm:text-[1.5rem]">
              From BMS Signal to Blockchain Trust.
            </p>
            <p className="mt-7 max-w-[33rem] text-[1rem] font-medium leading-[1.7] tracking-[-0.015em] text-[var(--landing-muted)] sm:text-[1.08rem]">
              VELKERN is an end-to-end platform that securely connects battery data to a trusted ecosystem. From verified power to a trusted passport, we build the foundation for a sustainable future.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <button
                type="button"
                onClick={goLogin}
                className="inline-flex h-14 min-w-[11rem] items-center justify-center rounded-md bg-[var(--landing-blue)] px-8 text-[1rem] font-bold text-white shadow-[0_10px_20px_rgba(23,105,224,0.18)] hover:brightness-95"
              >
                Get Started
              </button>
              <a
                href="#landing-highlights"
                className="inline-flex h-14 min-w-[11rem] items-center justify-center rounded-md border border-[var(--landing-blue)] bg-white px-8 text-[1rem] font-bold text-[var(--landing-blue)] hover:bg-[rgba(23,105,224,0.04)]"
              >
                Learn More
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
