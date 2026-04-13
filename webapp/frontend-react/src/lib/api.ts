const API_BASE = window.location.origin + '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
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
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch { /* noop */ }
    throw new Error(message);
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

export const STATUS_LABELS: Record<string, string> = {
  MANUFACTURED: '제조 완료',
  ACTIVE: '운행 중',
  MAINTENANCE: '정비 중',
  ANALYSIS: '분석 중',
  RECYCLING: '재활용 중',
  DISPOSED: '폐기',
};

export const STATUS_LIST = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'] as const;
