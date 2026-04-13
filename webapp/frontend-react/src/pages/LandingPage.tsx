import { useNavigate } from 'react-router-dom';
import landingHero from '../assets/landing-hero.png';

const FEATURE_CARDS = [
  { title: '배터리 여권', desc: '발급부터 회수 확인까지 필요한 상태를 빠르게 확인합니다.' },
  { title: '정비 기록', desc: '정비 요청과 점검 결과를 한 흐름으로 이어서 봅니다.' },
  { title: '감사 기록', desc: '검토 근거와 작업 기록을 필요한 시점에 확인합니다.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate('/login');
  const goRegister = () => navigate('/login?tab=register');

  return (
    <div className="min-h-screen overflow-hidden bg-[#eaf3ff] text-[#1f2937] flex flex-col">
      <div className="relative mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 pb-8 pt-8 lg:px-16 lg:pt-10">
        <div className="pointer-events-none absolute left-[-8rem] bottom-[10rem] h-[22rem] w-[18rem] rotate-45 rounded-[42px] bg-[#d6e9ff]" />
        <div className="pointer-events-none absolute left-[35%] top-[-12rem] h-[96rem] w-[14rem] rotate-[38deg] rounded-[48px] bg-[rgba(255,255,255,0.78)]" />
        <div className="pointer-events-none absolute right-[-8rem] bottom-[-8rem] h-[30rem] w-[34rem] rotate-45 rounded-[42px] bg-[#d6e9ff]" />

        <header className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5aa3f6] text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="6" y="2" width="12" height="20" rx="2" />
                <line x1="6" y1="7" x2="18" y2="7" />
                <line x1="6" y1="17" x2="18" y2="17" />
              </svg>
            </div>
            <div>
              <p className="text-[0.92rem] font-semibold text-[#5aa3f6]">BATP</p>
              <p className="text-[1.3rem] font-semibold text-[#5aa3f6]">BatteryPass</p>
            </div>
          </div>

          <nav className="hidden items-center gap-10 text-[1rem] font-semibold text-[#334155] lg:flex">
            <span>배터리 여권</span>
            <span>정비 이력</span>
            <span>감사 기록</span>
            <button
              onClick={goLogin}
              type="button"
              className="rounded-xl bg-[#5aa3f6] px-8 py-3 text-[1rem] font-semibold text-white transition hover:bg-[#4a94eb]"
            >
              로그인
            </button>
          </nav>

          <button
            onClick={goLogin}
            type="button"
            className="rounded-xl bg-[#5aa3f6] px-5 py-3 text-sm font-semibold text-white lg:hidden"
          >
            로그인
          </button>
        </header>

        <main className="relative z-10 flex flex-1 items-center mt-12 lg:mt-0">
          <div className="grid w-full items-center gap-18 lg:grid-cols-[0.88fr_1.52fr] lg:gap-20">
            <section className="max-w-[28rem] lg:ml-[2rem]">
              <p className="mb-6 text-[0.88rem] font-semibold uppercase tracking-[0.12em] text-[#5aa3f6]">
                Battery Passport Trace
              </p>
              <h1 className="font-display text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.04em] text-[#111827] lg:text-[4.7rem]">
                배터리 여권<br />관리 시스템
              </h1>
              <p className="mt-7 max-w-[25rem] text-[1.08rem] leading-8 text-[#475569]">
                배터리 발급, 정비, 회수 기록을 한 곳에서 관리합니다.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <button
                  onClick={goLogin}
                  type="button"
                  className="rounded-xl bg-[#5aa3f6] px-8 py-3.5 text-[1.02rem] font-semibold text-white transition hover:bg-[#4a94eb]"
                >
                  로그인
                </button>
                <button
                  onClick={goRegister}
                  type="button"
                  className="rounded-xl border border-[#cbd5e1] bg-white px-8 py-3.5 text-[1.02rem] font-semibold text-[#334155] transition hover:border-[#94a3b8]"
                >
                  계정 등록
                </button>
              </div>
            </section>

            <section className="relative flex items-center justify-center">
              <img
                src={landingHero}
                alt="Electric vehicle charging illustration"
                className="relative z-10 w-[131%] max-w-none object-contain translate-x-[8%] translate-y-[2%]"
              />
            </section>
          </div>
        </main>

        <section className="relative z-10 mt-12 border-t border-slate-200/70 pt-6 lg:mt-6">
          <div className="grid gap-6 md:grid-cols-3 md:gap-14">
            {FEATURE_CARDS.map((card) => (
              <article key={card.title} className="min-w-0">
                <p className="text-[1.02rem] font-semibold text-[#334155]">{card.title}</p>
                <p className="mt-1.5 text-[0.95rem] leading-7 text-[#64748b]">{card.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
