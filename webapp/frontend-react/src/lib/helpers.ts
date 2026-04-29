// BMU/DBC 인코딩: SOC raw = SOC% × 65535 / 100 (DBC factor 0.001525902)
// percent = raw × 0.001525902 = raw / 65535 × 100
export const SOC_DBC_FACTOR = 100 / 65535;
// Temperature는 milli-degree 인코딩 (raw / 1000 = °C)
export const TEMP_SCALE_DIVISOR = 1000;

export function scaleSOC(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  // raw uint16 → percent. n이 100 이하면 이미 percent로 들어온 것으로 간주 (구버전/모킹 호환).
  return n > 100 ? +(n * SOC_DBC_FACTOR).toFixed(1) : +n.toFixed(1);
}

export function scaleTemp(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return n > 100 ? +(n / TEMP_SCALE_DIVISOR).toFixed(1) : +n.toFixed(1);
}

export const STATUS_LIST = ['MANUFACTURED', 'ACTIVE', 'MAINTENANCE', 'ANALYSIS', 'RECYCLING', 'DISPOSED'] as const;

export const STATUS_LABELS: Record<string, string> = {
  MANUFACTURED: '제조완료',
  ACTIVE: '운행중',
  MAINTENANCE: '정비중',
  ANALYSIS: '분석중',
  RECYCLING: '재활용',
  DISPOSED: '폐기',
};

export interface StatusConfig {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  MANUFACTURED: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500',    label: '제조완료' },
  ACTIVE:       { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: '운행중'   },
  MAINTENANCE:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500',   label: '정비중'   },
  ANALYSIS:     { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  dot: 'bg-purple-500',  label: '분석중'   },
  RECYCLING:    { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500',  label: '재활용'   },
  DISPOSED:     { bg: 'bg-slate-100',  text: 'text-slate-500',   border: 'border-slate-300',   dot: 'bg-slate-400',   label: '폐기'     },
};

export function getStatusBadge(status: string): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.DISPOSED;
}

export const STATUS_DOT_COLORS: Record<string, string> = {
  MANUFACTURED: '#3b82f6',
  ACTIVE:       '#10b981',
  MAINTENANCE:  '#f59e0b',
  ANALYSIS:     '#8b5cf6',
  RECYCLING:    '#06b6d4',
  DISPOSED:     '#94a3b8',
};

export function fmtDate(v: unknown): string {
  if (!v) return '-';
  try {
    return new Date(v as string).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch {
    return String(v);
  }
}
