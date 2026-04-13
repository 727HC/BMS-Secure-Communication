import type { Passport, GbaCompliance } from './types';

export const GBA_21_FIELDS: { idx: number; key: keyof Passport; label: string; group: string }[] = [
  { idx: 1, key: 'passportId', label: '배터리 여권 ID', group: '기본정보' },
  { idx: 2, key: 'model', label: '배터리 모델', group: '기본정보' },
  { idx: 3, key: 'serialNumber', label: '배터리 일련 번호', group: '기본정보' },
  { idx: 4, key: 'status', label: '배터리 상태', group: '기본정보' },
  { idx: 5, key: 'evManufacturer', label: 'EV 제조업체', group: 'EV정보' },
  { idx: 6, key: 'evAssemblyCountry', label: '전기차 조립 국가', group: 'EV정보' },
  { idx: 7, key: 'manufacturerName', label: '배터리 생산업체', group: '제조정보' },
  { idx: 8, key: 'manufactureCountry', label: '배터리 생산 국가', group: '제조정보' },
  { idx: 9, key: 'cellManufacturer', label: '배터리 셀 생산업체', group: '제조정보' },
  { idx: 10, key: 'cellManufactureCountry', label: '셀 생산 국가', group: '제조정보' },
  { idx: 11, key: 'manufactureDate', label: '제조 날짜', group: '제조정보' },
  { idx: 12, key: 'cellType', label: '배터리 셀 유형', group: '제조정보' },
  { idx: 13, key: 'chemistry', label: '화학', group: '제조정보' },
  { idx: 14, key: 'cellCount', label: '배터리당 셀 수', group: '기술사양' },
  { idx: 15, key: 'weight', label: '무게', group: '기술사양' },
  { idx: 16, key: 'totalEnergy', label: '총 에너지', group: '기술사양' },
  { idx: 17, key: 'energyDensity', label: '에너지 밀도', group: '기술사양' },
  { idx: 18, key: 'ratedCapacity', label: '정격 용량', group: '기술사양' },
  { idx: 19, key: 'expectedLifespan', label: '예상 수명', group: '기술사양' },
  { idx: 20, key: 'voltageRange', label: '전압(최소-공칭-최대)', group: '기술사양' },
  { idx: 21, key: 'temperatureRange', label: '온도 범위', group: '기술사양' },
];

export function fieldFilled(p: Passport | null, key: keyof Passport): boolean {
  if (!p) return false;
  const v = p[key];
  if (v == null || v === '') return false;
  if (typeof v === 'object' && Object.keys(v as object).length === 0) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function computeGbaCompliance(passport: Passport | null): GbaCompliance {
  if (!passport) return { filled: 0, total: 21, pct: 0, allFilled: false, groups: [] };
  let filled = 0;
  const fields = GBA_21_FIELDS.map((f) => {
    const isFilled = fieldFilled(passport, f.key);
    if (isFilled) filled++;
    return { ...f, filled: isFilled };
  });
  const groups = ['기본정보', '제조정보', '기술사양', 'EV정보'].map((g) => ({
    name: g,
    fields: fields.filter((f) => f.group === g),
  }));
  return { filled, total: 21, pct: Math.round((filled / 21) * 100), allFilled: filled === 21, groups };
}

export function complianceGrade(pct: number): 'A' | 'B' | 'C' | 'D' {
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

export function formatDate(ts?: string): string {
  if (!ts) return '-';
  try { return new Date(ts).toLocaleString('ko-KR'); }
  catch { return ts; }
}

export function parseVoltageRange(str?: string): { min: string; nom: string; max: string } {
  if (!str) return { min: '--', nom: '--', max: '--' };
  const parts = String(str).replace(/[VvＶ]/g, '').split(/[~\-,]/);
  if (parts.length >= 3) return { min: parts[0].trim(), nom: parts[1].trim(), max: parts[2].trim() };
  if (parts.length === 2) return { min: parts[0].trim(), nom: '--', max: parts[1].trim() };
  return { min: '--', nom: str.trim(), max: '--' };
}

export function parseTempRange(str?: string): { min: string; max: string } {
  if (!str) return { min: '--', max: '--' };
  const m = String(str).replace(/[°CcＣ]/g, '').match(/([-\d.]+)[~\s]+([\d.]+)/);
  if (m) return { min: m[1], max: m[2] };
  return { min: '--', max: str.trim() };
}
