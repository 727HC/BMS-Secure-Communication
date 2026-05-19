// synced from wiki/blockchain/chaincode-error-contract.md @cbd2304
//
// Sync history:
// - @311a48e: 초기 contract (138 unique templates)
// - @cbd2304: ExtractMaterials JSON prefix 통일 (§3.6 예외 제거)
// - 2026-05-08 contract sync: VC holder DID binding, RFC3339 timestamp/expiry,
//   SHA-256 dataHash, BMU signature presence validation 추가 반영.
// - 2026-05-08 sequence 5 live sync: BMS binding/source verification validation 추가 반영.
//
// chaincode 에러 → 한국어 토스트 매핑. wiki §4 dictionary와 1:1 대응.
// bmu-agent/middleware/chaincode-error.js가 응답에 category를 부여하므로
// 이 함수는 카테고리 키 + raw 메시지 전체로 더 구체적인 한국어 토스트를 선택한다.

import { ApiError, type ApiErrorCategory } from './api';

const CATEGORY_TOAST: Record<ApiErrorCategory, string> = {
  AUTHZ: '이 작업에 대한 권한이 없습니다.',
  VAL: '입력값을 다시 확인해 주세요.',
  NOT_FOUND: '요청한 항목을 찾을 수 없습니다.',
  CONFLICT: '이미 처리되었거나 동일한 항목이 존재합니다.',
  PRECONDITION: '현재 상태에서는 이 작업을 수행할 수 없습니다.',
  INTERNAL: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

function refineMessage(category: ApiErrorCategory, raw: string): string {
  if (category === 'VAL') {
    if (/signature.*must not be empty|missing signature/i.test(raw)) return 'BMU 서명이 누락되었습니다.';
    if (/rawPayload must|invalid rawPayload/i.test(raw)) return 'BMU 원시 페이로드 형식이 올바르지 않습니다.';
    if (/BMS .*mismatch|BMS management identifier must be bound|bmsBindingCode32 required/i.test(raw)) return 'BMS 관리 식별자 바인딩이 일치하지 않습니다.';
    if (/dataHash must be 64-character hex SHA-256|invalid dataHash/i.test(raw)) return '데이터 해시 형식이 올바르지 않습니다.';
    if (/invalid expiresAt value|expiresAt must be RFC3339|malformed expiresAt/i.test(raw)) return 'VC 만료일은 RFC3339 형식이어야 합니다.';
    if (/invalid timestamp value|timestamp must be RFC3339|malformed timestamp/i.test(raw)) return '타임스탬프는 RFC3339 형식이어야 합니다.';
    if (/holder DID mismatch|DID mismatch/i.test(raw)) return '여권에 등록된 DID와 일치하지 않습니다.';
    if (/must not be empty/.test(raw)) return '필수 입력값이 누락되었습니다.';
    if (/must be in \[0, 100\]/.test(raw)) return 'SOH/SOCE는 0과 100 사이 값이어야 합니다.';
    if (/must be non-negative/.test(raw)) return '음수는 입력할 수 없습니다.';
    if (/invalid (recycling rates|signals|evidenceIds|recycledElementContent|extensionInfo) JSON/.test(raw)) {
      return '입력 JSON 형식이 올바르지 않습니다.';
    }
    if (/^invalid credential type/.test(raw)) return '허용되지 않는 자격증명 유형입니다.';
    if (/^invalid regulatory status/.test(raw)) return '허용되지 않는 검증 상태값입니다.';
    if (/unknown signal key/.test(raw)) return '허용되지 않는 신호 키입니다.';
    if (/is not correctable/.test(raw)) return '이 필드는 정정 대상이 아닙니다.';
    if (/fc \d+ must be greater/.test(raw)) return 'BMU 신선도 카운터(FC) 가 이전 기록보다 작거나 같습니다.';
  }
  if (category === 'NOT_FOUND') {
    if (/^passport /.test(raw)) return '요청한 배터리 여권을 찾을 수 없습니다.';
    if (/^credential /.test(raw)) return '요청한 자격증명을 찾을 수 없습니다.';
    if (/^BMU record /.test(raw)) return '요청한 BMU 기록을 찾을 수 없습니다.';
    if (/^raw material /.test(raw)) return '요청한 원자재를 찾을 수 없습니다.';
    if (/^no passport found/.test(raw)) return '해당 DID로 등록된 여권이 없습니다.';
  }
  if (category === 'CONFLICT') {
    if (/already exists/.test(raw)) return '이미 등록된 항목입니다.';
    if (/already revoked/.test(raw)) return '이미 폐기된 자격증명입니다.';
    if (/already disposed/.test(raw)) return '이미 폐기 승인된 여권입니다.';
    if (/already invalidated/.test(raw)) return '이미 무효화된 BMU 기록입니다.';
    if (/already bound/.test(raw)) return '이미 차량과 연결된 여권입니다.';
    if (/already linked/.test(raw)) return '이미 연결된 원자재입니다.';
    if (/is not pending/.test(raw)) return '대기 상태가 아닌 요청입니다.';
  }
  if (category === 'PRECONDITION') {
    if (/passport status must be MANUFACTURED or ACTIVE/.test(raw)) return '여권이 차량 연결 가능한 상태가 아닙니다.';
    if (/passport status must be ACTIVE for maintenance/.test(raw)) return '활성 상태 여권만 정비 요청이 가능합니다.';
    if (/passport status must be ACTIVE or MAINTENANCE for analysis/.test(raw)) return '활성 또는 정비 중 여권만 분석 요청이 가능합니다.';
    if (/passport status must be ANALYSIS/.test(raw)) return '분석 요청 상태 여권만 결과 제출이 가능합니다.';
    if (/cannot add maintenance log/.test(raw)) return '여권이 정비 기록 가능한 상태가 아닙니다.';
    if (/extract requires/.test(raw)) return '여권이 소재 추출 가능한 상태가 아닙니다.';
    if (/has not been activated yet/.test(raw)) return '아직 활성화되지 않은 여권입니다.';
  }
  return CATEGORY_TOAST[category];
}

export interface ToastResult {
  toast: string;
  debug: string;
  category: ApiErrorCategory;
  status: number;
}

// chaincode 에러가 아닌 일반 API 라우트(예: /api/auth/login 401/403)도 카테고리 없이
// ApiError로 들어오므로, status 기반 fallback으로 합리적인 토스트를 매핑한다.
function fallbackByStatus(status: number, debug: string): ToastResult {
  if (status === 401) return { toast: '아이디 또는 비밀번호를 확인해 주세요.', debug, category: 'AUTHZ', status };
  if (status === 403) return { toast: '이 작업에 대한 권한이 없습니다.', debug, category: 'AUTHZ', status };
  if (status === 404) return { toast: '요청한 항목을 찾을 수 없습니다.', debug, category: 'NOT_FOUND', status };
  if (status === 409) return { toast: '이미 처리되었거나 동일한 항목이 존재합니다.', debug, category: 'CONFLICT', status };
  if (status >= 400 && status < 500) {
    return { toast: debug || '입력값을 다시 확인해 주세요.', debug, category: 'VAL', status };
  }
  return { toast: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', debug, category: 'INTERNAL', status };
}

export function toastFromError(err: unknown): ToastResult {
  if (err instanceof ApiError) {
    const debug = err.message || '';
    if (err.category) {
      const toast = refineMessage(err.category, debug);
      return { toast, debug, category: err.category, status: err.status };
    }
    // category 없는 비-chaincode 응답(예: auth 라우트)은 status 기반 fallback
    return fallbackByStatus(err.status, debug);
  }
  // 네트워크 / fetch / 파싱 등 비-API 에러
  const debug = err instanceof Error ? err.message : String(err);
  return {
    toast: '네트워크 오류가 발생했습니다. 연결 상태를 확인해 주세요.',
    debug,
    category: 'INTERNAL',
    status: 0,
  };
}
