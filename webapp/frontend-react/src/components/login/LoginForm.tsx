const ORG_OPTIONS: { value: number; short: string; desc: string }[] = [
  { value: 1, short: '제조사', desc: '여권 발급 · 원자재 등록 · 데이터 정정' },
  { value: 2, short: 'EV제조사', desc: '차량 바인딩 · 운행 인계 · 사고 접수' },
  { value: 3, short: '정비/분석', desc: '정비 완료 · 분석 결과 · 처리 마감' },
  { value: 4, short: '검증기관', desc: '규제 검토 · 회수 판정 · 폐기 승인' },
];

interface Props {
  orgNum: number;
  onOrgNumChange: (value: number) => void;
  userId: string;
  onUserIdChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  loading: boolean;
  submitLabel: string;
  onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

export default function LoginForm({
  orgNum,
  onOrgNumChange,
  userId,
  onUserIdChange,
  password,
  onPasswordChange,
  loading,
  submitLabel,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
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
                onClick={() => onOrgNumChange(org.value)}
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
          onChange={(e) => onUserIdChange(e.target.value)}
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
          onChange={(e) => onPasswordChange(e.target.value)}
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
  );
}
