/**
 * AuditLogPage 도메인 타입/헬퍼.
 */

export interface LogRecord {
  id: string;
  action?: string;
  timestamp?: string;
  userId?: string;
  orgMsp?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  duration?: number;
  requestBody?: unknown;
}

export interface LogsResponse {
  records?: LogRecord[];
  total?: number;
}

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: '로그인', REGISTER: '회원가입',
  CREATE_PASSPORT: '여권 생성', BIND_VEHICLE: 'VIN 바인딩',
  UPLOAD_IMAGE: '이미지 업로드', RECORD_BMU: 'BMU 데이터',
  REGISTER_MATERIAL: '원자재 등록',
  REQUEST_MAINTENANCE: '정비 요청', LOG_MAINTENANCE: '정비 기록',
  LOG_ACCIDENT: '사고 기록',
  REQUEST_ANALYSIS: '분석 요청', SUBMIT_ANALYSIS: '분석 결과',
  SET_RECYCLE: '재활용 판정', EXTRACT_MATERIALS: '원자재 추출',
  DISPOSE_BATTERY: '배터리 폐기',
  ISSUE_VC: 'VC 발급', REVOKE_VC: 'VC 폐기', VERIFY_VC: 'VC 검증',
  QUERY: '조회', OTHER: '기타',
};

export const ACTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'CREATE_PASSPORT', label: '여권 생성' },
  { value: 'BIND_VEHICLE', label: 'VIN 바인딩' },
  { value: 'RECORD_BMU', label: 'BMU 데이터' },
  { value: 'REGISTER_MATERIAL', label: '원자재 등록' },
  { value: 'REQUEST_MAINTENANCE', label: '정비 요청' },
  { value: 'LOG_MAINTENANCE', label: '정비 기록' },
  { value: 'LOG_ACCIDENT', label: '사고 기록' },
  { value: 'REQUEST_ANALYSIS', label: '분석 요청' },
  { value: 'SUBMIT_ANALYSIS', label: '분석 결과' },
  { value: 'DISPOSE_BATTERY', label: '배터리 폐기' },
  { value: 'ISSUE_VC', label: 'VC 발급' },
  { value: 'LOGIN', label: '로그인' },
];

export const METHOD_COLORS: Record<string, string> = {
  GET: 'var(--color-accent)',
  POST: 'var(--color-success)',
  PUT: 'var(--color-warning)',
  DELETE: 'var(--color-danger)',
  PATCH: 'var(--color-text-2)',
};

export function formatTime(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

export function relativeTime(ts?: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return '방금';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return '';
}

export function getStatusStyle(code?: number): { color: string; bg: string; label: string } {
  if (!code) return { color: 'var(--color-text-3)', bg: 'var(--color-surface-alt)', label: '상태 없음' };
  if (code < 300) return { color: 'var(--color-success)', bg: 'var(--color-success-soft)', label: '성공' };
  if (code < 400) return { color: 'var(--color-accent)', bg: 'var(--color-surface-accent)', label: '전환' };
  if (code < 500) return { color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', label: '클라이언트 오류' };
  return { color: 'var(--color-danger)', bg: 'var(--color-danger-soft)', label: '서버 오류' };
}

export function isWithinHours(ts: string | undefined, hours: number): boolean {
  if (!ts) return false;
  return Date.now() - new Date(ts).getTime() < hours * 3600 * 1000;
}
