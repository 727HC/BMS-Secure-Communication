import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { toastFromError } from './chaincodeErrorMessages';

describe('toastFromError — non-API errors', () => {
  it('returns network message for fetch/parse errors', () => {
    const result = toastFromError(new Error('Failed to fetch'));
    expect(result.toast).toContain('네트워크 오류');
    expect(result.debug).toBe('Failed to fetch');
    expect(result.category).toBe('INTERNAL');
    expect(result.status).toBe(0);
  });

  it('handles non-Error throws', () => {
    expect(toastFromError('plain string').debug).toBe('plain string');
    expect(toastFromError(null).debug).toBe('null');
  });
});

describe('toastFromError — fallbackByStatus (no category)', () => {
  it('401 → 로그인 안내', () => {
    const result = toastFromError(new ApiError('Unauthorized', 401));
    expect(result.toast).toContain('아이디 또는 비밀번호');
    expect(result.category).toBe('AUTHZ');
  });

  it('403 → 권한 없음', () => {
    expect(toastFromError(new ApiError('forbidden', 403)).toast).toContain('권한');
  });

  it('404 → not found', () => {
    expect(toastFromError(new ApiError('missing', 404)).category).toBe('NOT_FOUND');
  });

  it('409 → conflict', () => {
    expect(toastFromError(new ApiError('dup', 409)).category).toBe('CONFLICT');
  });

  it('4xx (other) uses raw debug as toast', () => {
    const result = toastFromError(new ApiError('Custom error', 422));
    expect(result.toast).toBe('Custom error');
    expect(result.category).toBe('VAL');
  });

  it('5xx → INTERNAL', () => {
    expect(toastFromError(new ApiError('boom', 500)).category).toBe('INTERNAL');
  });
});

describe('toastFromError — VAL refinements', () => {
  it("must not be empty → 필수 입력값", () => {
    const e = new ApiError('field must not be empty', 400, 'VAL');
    expect(toastFromError(e).toast).toContain('필수 입력값');
  });

  it('SOH/SOCE 0..100 range', () => {
    const e = new ApiError('soh must be in [0, 100]', 400, 'VAL');
    expect(toastFromError(e).toast).toContain('SOH/SOCE');
  });

  it('non-negative number', () => {
    const e = new ApiError('cellCount must be non-negative', 400, 'VAL');
    expect(toastFromError(e).toast).toContain('음수');
  });

  it('invalid JSON shapes', () => {
    expect(toastFromError(new ApiError('invalid recycling rates JSON', 400, 'VAL')).toast).toContain('JSON');
    expect(toastFromError(new ApiError('invalid signals JSON', 400, 'VAL')).toast).toContain('JSON');
  });

  it('DID mismatch', () => {
    expect(toastFromError(new ApiError('DID mismatch', 400, 'VAL')).toast).toContain('DID');
  });

  it('falls back to category default for unknown VAL message', () => {
    const e = new ApiError('something unrecognized', 400, 'VAL');
    expect(toastFromError(e).toast).toContain('입력값');
  });
});

describe('toastFromError — NOT_FOUND refinements', () => {
  it('passport not found', () => {
    const e = new ApiError('passport ABC123 not found', 404, 'NOT_FOUND');
    expect(toastFromError(e).toast).toContain('배터리 여권');
  });

  it('credential not found', () => {
    expect(toastFromError(new ApiError('credential vc-1 missing', 404, 'NOT_FOUND')).toast).toContain('자격증명');
  });

  it('BMU record not found', () => {
    expect(toastFromError(new ApiError('BMU record r1 missing', 404, 'NOT_FOUND')).toast).toContain('BMU');
  });

  it('no passport for DID', () => {
    expect(toastFromError(new ApiError('no passport found for DID xyz', 404, 'NOT_FOUND')).toast).toContain('DID');
  });
});

describe('toastFromError — CONFLICT refinements', () => {
  it('already exists', () => {
    expect(toastFromError(new ApiError('already exists', 409, 'CONFLICT')).toast).toContain('이미 등록');
  });

  it('already revoked / disposed / bound / linked', () => {
    expect(toastFromError(new ApiError('credential already revoked', 409, 'CONFLICT')).toast).toContain('폐기된 자격증명');
    expect(toastFromError(new ApiError('passport already disposed', 409, 'CONFLICT')).toast).toContain('폐기 승인');
    expect(toastFromError(new ApiError('passport already bound', 409, 'CONFLICT')).toast).toContain('차량과 연결');
    expect(toastFromError(new ApiError('material already linked', 409, 'CONFLICT')).toast).toContain('연결된 원자재');
  });

  it('not pending', () => {
    expect(toastFromError(new ApiError('request is not pending', 409, 'CONFLICT')).toast).toContain('대기 상태');
  });
});

describe('toastFromError — PRECONDITION refinements', () => {
  it('binding requires MANUFACTURED or ACTIVE', () => {
    expect(toastFromError(new ApiError('passport status must be MANUFACTURED or ACTIVE', 409, 'PRECONDITION')).toast)
      .toContain('차량 연결');
  });

  it('maintenance requires ACTIVE', () => {
    expect(toastFromError(new ApiError('passport status must be ACTIVE for maintenance', 409, 'PRECONDITION')).toast)
      .toContain('정비 요청');
  });

  it('analysis requires ACTIVE or MAINTENANCE', () => {
    expect(toastFromError(new ApiError('passport status must be ACTIVE or MAINTENANCE for analysis', 409, 'PRECONDITION')).toast)
      .toContain('분석 요청');
  });

  it('extract precondition', () => {
    expect(toastFromError(new ApiError('extract requires recycle status', 409, 'PRECONDITION')).toast).toContain('소재 추출');
  });
});

describe('toastFromError — INTERNAL/AUTHZ default toast', () => {
  it('AUTHZ uses default category toast', () => {
    expect(toastFromError(new ApiError('forbidden', 403, 'AUTHZ')).toast).toContain('권한');
  });

  it('INTERNAL uses default category toast', () => {
    expect(toastFromError(new ApiError('chaincode panic', 500, 'INTERNAL')).toast).toContain('일시적');
  });
});
