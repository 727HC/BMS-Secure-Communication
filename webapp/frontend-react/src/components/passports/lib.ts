/**
 * PassportsPage 도메인 타입/헬퍼.
 */

export interface Passport {
  passportId?: string;
  batteryId?: string;
  did?: string;
  model?: string;
  serialNumber?: string;
  manufacturerName?: string;
  chemistry?: string;
  vin?: string;
  status?: string;
  evManufacturer?: string;
  evAssemblyCountry?: string;
  manufactureCountry?: string;
  cellManufacturer?: string;
  cellManufactureCountry?: string;
  manufactureDate?: string;
  cellType?: string;
  cellCount?: number;
  weight?: number;
  totalEnergy?: number;
  energyDensity?: number;
  ratedCapacity?: number;
  expectedLifespan?: number;
  voltageRange?: string;
  temperatureRange?: string;
  currentSoc?: number;
  soc?: number;
  currentSoh?: number;
  recycleAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ListResponse<T> {
  records?: T[];
}

export const PAGE_SIZE = 12;
export type GbaFilter = 'all' | 'complete' | 'incomplete';

export const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'MANUFACTURED', label: '제조완료' },
  { value: 'ACTIVE', label: '운행중' },
  { value: 'MAINTENANCE', label: '정비중' },
  { value: 'ANALYSIS', label: '분석중' },
  { value: 'RECYCLING', label: '재활용' },
  { value: 'DISPOSED', label: '폐기' },
];

export const STATUS_COLORS: Record<string, string> = {
  MANUFACTURED: '#1769e0',
  ACTIVE: '#0ea5e9',
  MAINTENANCE: '#f59e0b',
  ANALYSIS: '#8b5cf6',
  RECYCLING: '#0f766e',
  DISPOSED: '#94a3b8',
};

export const CHEMISTRY_COLORS: Record<string, string> = {
  NCM: '#1769e0',
  LFP: '#0ea5e9',
  NCA: '#8b5cf6',
  LMO: '#f59e0b',
  기타: '#94a3b8',
};

export const GBA_FIELDS: (keyof Passport)[] = [
  'passportId', 'model', 'serialNumber', 'status', 'evManufacturer', 'evAssemblyCountry',
  'manufacturerName', 'manufactureCountry', 'cellManufacturer', 'cellManufactureCountry',
  'manufactureDate', 'cellType', 'chemistry', 'cellCount', 'weight', 'totalEnergy',
  'energyDensity', 'ratedCapacity', 'expectedLifespan', 'voltageRange', 'temperatureRange',
];

export function getGbaPct(p: Passport): number {
  let filled = 0;
  GBA_FIELDS.forEach((k) => {
    const v = p[k];
    if (v != null && v !== '' && v !== 0 && !(Array.isArray(v) && v.length === 0)) filled++;
  });
  return Math.round((filled / 21) * 100);
}
