import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageHead } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError, MSP, MSP_LABELS } from '../lib/api';

const ALLOWED_ORGS = new Set<string>([MSP.Manufacturer, MSP.Regulator]);
const MIN_REASON = 50;
const MAX_REASON = 1024;

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; did: string }
  | { kind: 'error'; message: string };

export default function BmuOperationsPage() {
  const { org } = useAuth();
  const [did, setDid] = useState('');
  const [didConfirm, setDidConfirm] = useState('');
  const [reason, setReason] = useState('');
  const [expectedNextFc, setExpectedNextFc] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });

  if (!org || !ALLOWED_ORGS.has(org)) {
    return <Navigate to="/dashboard" replace />;
  }

  const didTrim = did.trim();
  const reasonTrim = reason.trim();
  const expectedTrim = expectedNextFc.trim();
  const expectedNum = expectedTrim === '' ? null : Number(expectedTrim);
  const expectedValid =
    expectedNum === null || (Number.isInteger(expectedNum) && expectedNum >= 0);

  const fieldErrors = useMemo(() => {
    const errs: string[] = [];
    if (!didTrim) errs.push('DID를 입력해 주세요.');
    if (didTrim && didConfirm.trim() !== didTrim) {
      errs.push('확인용 DID가 위 DID와 일치하지 않습니다.');
    }
    if (reasonTrim.length < MIN_REASON) {
      errs.push(`사유는 최소 ${MIN_REASON}자 이상이어야 합니다.`);
    }
    if (!expectedValid) {
      errs.push('expected_next_fc는 0 이상 정수여야 합니다.');
    }
    if (!confirm) errs.push('파괴적 작업임을 확인해 주세요.');
    return errs;
  }, [didTrim, didConfirm, reasonTrim, expectedValid, confirm]);

  const canSubmit = fieldErrors.length === 0 && submit.kind !== 'submitting';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmit({ kind: 'submitting' });
    try {
      await api.post<{ success: boolean; did: string; status: string }>(
        '/bmu/reset-fc',
        {
          did: didTrim,
          reason: reasonTrim,
          confirm: true,
          ...(expectedNum !== null ? { expected_next_fc: expectedNum } : {}),
        },
      );
      setSubmit({ kind: 'success', did: didTrim });
      setDid('');
      setDidConfirm('');
      setReason('');
      setExpectedNextFc('');
      setConfirm(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? `${err.status} ${err.message}` : (err as Error).message;
      setSubmit({ kind: 'error', message });
    }
  };

  const reasonRemaining = MIN_REASON - reasonTrim.length;

  return (
    <>
      <PageHead
        eyebrow="BMU 운영"
        title="FC 재동기화"
        subtitle={`현재 권한: ${MSP_LABELS[org] ?? org}. 이 화면의 작업은 모두 감사 로그에 영구 기록됩니다.`}
      />

      <section
        role="alert"
        style={{
          marginBottom: '1.25rem',
          padding: '0.9rem 1rem',
          borderRadius: 10,
          border: '1px solid var(--color-danger, #ef4444)',
          background: 'color-mix(in srgb, var(--color-danger, #ef4444) 8%, transparent)',
          color: 'var(--color-text-1)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
          ⚠ 파괴적 작업입니다
        </p>
        <p className="sn-body" style={{ margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
          ResetFCForDID는 해당 DID의 lastFc 카운터를 0으로 초기화합니다. passport binding은
          유지되지만, 재전송 공격 방어 윈도우가 일시적으로 넓어집니다. 장비 재부팅·교체·DID
          재프로비저닝 등 명확한 운영 사유에만 사용하세요.
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="sn-panel"
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem',
          maxWidth: 720,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label htmlFor="reset-did" className="sn-eyebrow" style={{ margin: 0 }}>
            대상 DID
          </label>
          <input
            id="reset-did"
            type="text"
            value={did}
            onChange={(e) => setDid(e.target.value)}
            placeholder="HgBpAxtHJ4qRwsNiroaqvC"
            spellCheck={false}
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label htmlFor="reset-did-confirm" className="sn-eyebrow" style={{ margin: 0 }}>
            DID 다시 입력 (오타 방지)
          </label>
          <input
            id="reset-did-confirm"
            type="text"
            value={didConfirm}
            onChange={(e) => setDidConfirm(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label htmlFor="reset-reason" className="sn-eyebrow" style={{ margin: 0 }}>
            사유 (최소 {MIN_REASON}자)
          </label>
          <textarea
            id="reset-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={MAX_REASON}
            placeholder="예: 2026-05-19 펌웨어 업데이트 후 BMU 보드 재부팅으로 FC 카운터가 1로 리셋되어 재동기화 필요."
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <p
            className="sn-stat-note"
            style={{
              margin: 0,
              color: reasonRemaining > 0 ? 'var(--color-text-3)' : 'var(--color-text-2)',
            }}
          >
            {reasonRemaining > 0
              ? `최소 ${reasonRemaining}자 더 필요합니다.`
              : `${reasonTrim.length} / ${MAX_REASON}자`}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label htmlFor="reset-expected-fc" className="sn-eyebrow" style={{ margin: 0 }}>
            expected_next_fc (선택)
          </label>
          <input
            id="reset-expected-fc"
            type="number"
            min={0}
            step={1}
            value={expectedNextFc}
            onChange={(e) => setExpectedNextFc(e.target.value)}
            placeholder="다음 POST에 기대되는 FC 값을 알면 입력 (감사용)"
            style={inputStyle}
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            style={{ marginTop: '0.2rem' }}
          />
          <span className="sn-body" style={{ fontSize: '0.9rem' }}>
            본 작업이 chaincode lastFc를 초기화하고 감사 로그에 영구 기록됨을 확인합니다.
          </span>
        </label>

        {fieldErrors.length > 0 && (
          <ul
            className="sn-body"
            style={{
              margin: 0,
              paddingLeft: '1.1rem',
              color: 'var(--color-text-2)',
              fontSize: '0.85rem',
            }}
          >
            {fieldErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={!canSubmit}
            className="sn-button-primary"
            style={{
              padding: '0.6rem 1.1rem',
              fontWeight: 700,
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {submit.kind === 'submitting' ? '재동기화 중…' : 'FC 재동기화 실행'}
          </button>
          {submit.kind === 'success' && (
            <span style={{ color: 'var(--color-success, #16a34a)', fontSize: '0.9rem' }}>
              ✓ {submit.did} 재동기화 완료
            </span>
          )}
          {submit.kind === 'error' && (
            <span style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.9rem' }}>
              ✗ {submit.message}
            </span>
          )}
        </div>
      </form>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.7rem',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-1)',
  fontSize: '0.95rem',
  outline: 'none',
};
