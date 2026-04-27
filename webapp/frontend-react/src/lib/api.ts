import { STATUS_LABELS, STATUS_LIST } from './helpers';

const API_BASE = window.location.origin + '/api';

function getToken(): string | null {
  return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
}

export type ApiErrorCategory =
  | 'AUTHZ'
  | 'VAL'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PRECONDITION'
  | 'INTERNAL';

export class ApiError extends Error {
  status: number;
  category?: ApiErrorCategory;
  constructor(message: string, status: number, category?: ApiErrorCategory) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.category = category;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let category: ApiErrorCategory | undefined;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.category) category = data.category as ApiErrorCategory;
    } catch { /* noop */ }
    throw new ApiError(message, res.status, category);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
};

export const MSP = {
  Manufacturer: 'ManufacturerMSP',
  EVManufacturer: 'EVManufacturerMSP',
  Service: 'ServiceMSP',
  Regulator: 'RegulatorMSP',
} as const;

export const MSP_LABELS: Record<string, string> = {
  ManufacturerMSP: '제조사',
  EVManufacturerMSP: 'EV제조사',
  ServiceMSP: '정비/분석',
  RegulatorMSP: '검증기관',
};

export { STATUS_LABELS, STATUS_LIST };
