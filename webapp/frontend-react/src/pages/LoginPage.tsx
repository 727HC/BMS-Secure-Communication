import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { toastFromError } from '../lib/chaincodeErrorMessages';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'login' | 'register';

const ORG_OPTIONS: { value: number; short: string; desc: string }[] = [
  { value: 1, short: '제조사', desc: '여권 발급 · 원자재 등록 · 데이터 정정' },
  { value: 2, short: 'EV제조사', desc: '차량 바인딩 · 운행 인계 · 사고 접수' },
  { value: 3, short: '정비/분석', desc: '정비 완료 · 분석 결과 · 처리 마감' },
  { value: 4, short: '검증기관', desc: '규제 검토 · 회수 판정 · 폐기 승인' },
];

const ORG_NUM_TO_MSP: Record<number, string> = {
  1: 'ManufacturerMSP',
  2: 'EVManufacturerMSP',
  3: 'ServiceMSP',
  4: 'RegulatorMSP',
};

interface LoginResponse {
  token: string;
  userId?: string;
  org?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  );
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [orgNum, setOrgNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    setActiveTab(tab === 'register' ? 'register' : 'login');
  }, [searchParams]);

  const submitLabel = useMemo(() => (activeTab === 'login' ? '로그인' : '계정 등록'), [activeTab]);

  const resetForm = () => {
    setUserId('');
    setPassword('');
    setOrgNum(1);
    setErrorMsg('');
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    resetForm();
  };

  const goLanding = () => navigate('/');

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userId || !password) {
      setErrorMsg('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const endpoint = activeTab === 'login' ? '/auth/login' : '/auth/register';
    const body = { userId, password, orgNum };

    try {
      const data = await api.post<LoginResponse>(endpoint, body);
      if (activeTab === 'register') {
        switchTab('login');
        setUserId(body.userId);
        setOrgNum(body.orgNum);
      } else {
        const org = data.org || ORG_NUM_TO_MSP[orgNum];
        login(data.userId || userId, org, data.token);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const { toast, debug, category } = toastFromError(err);
      console.warn('[login] auth failed', { category, debug });
      setErrorMsg(toast);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-page="login"
      className="min-h-screen overflow-hidden px-6 py-10 lg:px-10"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text-2)' }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[420px] items-center">
        <div
          className="pointer-events-none absolute left-[8%] top-[14%] h-[42rem] w-[10rem] rotate-[38deg] rounded-[34px]"
          style={{ background: 'var(--color-surface)', opacity: 0.55 }}
        />
        <div
          className="pointer-events-none absolute right-[-6rem] bottom-[-6rem] h-[18rem] w-[18rem] rotate-45 rounded-[34px]"
          style={{ background: 'var(--color-surface-accent)' }}
        />
        <div
          className="relative z-10 w-full rounded-xl px-7 py-8 lg:px-8 lg:py-9"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-elevated)',
          }}
        >
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="sn-eyebrow" style={{ marginBottom: '0.25rem' }}>조직 인증</p>
              <h1 className="sn-display text-[2rem]" style={{ color: 'var(--color-text-1)' }}>
                {activeTab === 'login' ? '로그인' : '조직 계정 등록'}
              </h1>
            </div>
            <button
              onClick={goLanding}
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-semibold transition"
              style={{
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-2)',
                background: 'transparent',
              }}
            >
              돌아가기
            </button>
          </div>

          <div className="rounded-xl p-1" style={{ background: 'var(--color-surface-alt)' }}>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => switchTab('login')}
                type="button"
                className="rounded-lg px-4 py-3 text-sm font-semibold transition"
                style={{
                  background: activeTab === 'login' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'login' ? 'var(--color-surface)' : 'var(--color-text-3)',
                  boxShadow: activeTab === 'login' ? 'var(--shadow-card)' : 'none',
                }}
              >
                로그인
              </button>
              <button
                onClick={() => switchTab('register')}
                type="button"
                className="rounded-lg px-4 py-3 text-sm font-semibold transition"
                style={{
                  background: activeTab === 'register' ? 'var(--color-primary)' : 'transparent',
                  color: activeTab === 'register' ? 'var(--color-surface)' : 'var(--color-text-3)',
                  boxShadow: activeTab === 'register' ? 'var(--shadow-card)' : 'none',
                }}
              >
                계정 등록
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              className="mt-5 rounded-2xl px-4 py-3 text-sm leading-6"
              style={{
                background: 'var(--color-danger-soft)',
                color: 'var(--color-danger)',
                border: '1px solid var(--color-border)',
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                className="mb-2 block text-[0.78rem] font-semibold"
                style={{ color: 'var(--color-text-3)' }}
              >
                조직 선택
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ORG_OPTIONS.map((org) => {
                  const active = orgNum === org.value;
                  return (
                    <button
                      key={org.value}
                      type="button"
                      onClick={() => setOrgNum(org.value)}
                      className="rounded-xl px-4 py-3 text-left transition"
                      style={{
                        border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: active ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                        color: active ? 'var(--color-surface)' : 'var(--color-text-2)',
                        boxShadow: active ? 'var(--shadow-card)' : 'none',
                      }}
                    >
                      <p className="text-sm font-semibold">{org.short}</p>
                      <p className="mt-1 text-[0.75rem] leading-5" style={{ opacity: 0.8 }}>{org.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                className="mb-2 block text-[0.78rem] font-semibold"
                style={{ color: 'var(--color-text-3)' }}
              >
                사용자 ID
              </label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                type="text"
                placeholder="예: issuer.operator.01"
                className="sn-input"
                style={{ padding: '0.95rem 1rem' }}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-[0.78rem] font-semibold"
                style={{ color: 'var(--color-text-3)' }}
              >
                비밀번호
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="비밀번호 입력"
                className="sn-input"
                style={{ padding: '0.95rem 1rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold transition"
              style={{
                background: 'var(--color-accent)',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading && (
                <svg style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? '처리 중...' : submitLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
