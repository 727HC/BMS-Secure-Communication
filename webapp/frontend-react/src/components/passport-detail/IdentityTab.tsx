import SpecRow from '../ui/SpecRow';
import { formatDate, parseVoltageRange, parseTempRange } from './helpers';
import { scaleSOC } from '../../lib/helpers';
import type { Passport } from './types';

export default function IdentityTab({ passport }: { passport: Passport }) {
  const voltage = parseVoltageRange(passport.voltageRange);
  const temp = parseTempRange(passport.temperatureRange);
  const formatExtraValue = (value: unknown) => {
    if (value == null || value === '') return '정보 없음';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '정보 없음';
      }
    }
    return String(value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="sn-detail-section-head">
        <h2 className="sn-detail-section-title">개요 / 기술 명세</h2>
      </div>

      {/* Dossier 1: 배터리 스펙 — 식별정보(10) + 성능/내구(9) = 19 fields, +2 filler = 21 (7행×3열) */}
      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">배터리 스펙</h3>
          <span className="sn-detail-inline-stamp">{passport.chemistry || '미분류'}</span>
        </div>
        <div className="sn-detail-spec-sheet">
          <div className="sn-detail-spec-row">
            <SpecRow k="여권 ID" v={passport.passportId} mono />
            <SpecRow k="배터리 ID" v={passport.batteryId} mono />
            <SpecRow k="시리얼번호" v={passport.serialNumber} />
            <SpecRow k="모델" v={passport.model} />
            <SpecRow k="제조사" v={passport.manufacturerName} />
            <SpecRow k="제조일자" v={formatDate(passport.manufactureDate)} />
            <SpecRow k="제조국가" v={passport.manufactureCountry} />
            <SpecRow k="셀 유형" v={passport.cellType} />
            <SpecRow k="셀 제조사" v={passport.cellManufacturer} />
            <SpecRow k="셀 제조국가" v={passport.cellManufactureCountry} />
            <SpecRow k="정격용량" v={`${passport.ratedCapacity || '--'} Ah`} />
            <SpecRow k="총 에너지" v={`${passport.totalEnergy || '--'} kWh`} />
            <SpecRow k="공칭 전압" v={`${voltage.nom} V`} />
            <SpecRow k="전압 범위" v={`${voltage.min} ~ ${voltage.max} V`} />
            <SpecRow k="에너지밀도" v={`${passport.energyDensity || '--'} Wh/kg`} />
            <SpecRow k="셀 수" v={`${passport.cellCount || '--'} 개`} />
            <SpecRow k="예상수명" v={`${passport.expectedLifespan || '--'} 사이클`} />
            <SpecRow k="사용 온도" v={`${temp.min}°C ~ ${temp.max}°C`} />
            <SpecRow k="중량" v={`${passport.weight || '--'} kg`} />
            <div style={{ flex: 1 }} />
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>

      {/* Dossier 2: EV 연결 · 환경 · 현재 상태 — EV(4) + 환경(5) + 상태(4) = 13 fields, +2 filler = 15 (5행×3열) */}
      <div className="sn-detail-dossier">
        <div className="sn-detail-dossier-head">
          <h3 className="sn-detail-dossier-title">EV 연결 · 환경 · 현재 상태</h3>
        </div>
        <div className="sn-detail-spec-sheet">
          <div className="sn-detail-spec-row">
            <SpecRow k="차대번호(VIN)" v={passport.vin || '미등록'} mono />
            <SpecRow k="EV 제조사" v={passport.evManufacturer || '미등록'} />
            <SpecRow k="EV 조립국가" v={passport.evAssemblyCountry || '미등록'} />
            <SpecRow k="장착일자" v={passport.installDate ? formatDate(passport.installDate) : '미등록'} />
            <SpecRow k="제조 공정" v={passport.manufacturingProcess || '정보 없음'} />
            <SpecRow k="폐기 방법" v={passport.disposalMethod || '정보 없음'} />
            <SpecRow k="탄소 발자국" v={formatExtraValue(passport.carbonFootprint)} />
            <SpecRow k="재활용 원료 비율" v={formatExtraValue(passport.recycledElementContent)} />
            <SpecRow k="확장 정보" v={formatExtraValue(passport.extensionInfo)} />
            <SpecRow k="SOC" v={passport.currentSoc != null ? `${scaleSOC(passport.currentSoc)}%` : '--%'} />
            <SpecRow k="SOH" v={passport.currentSoh != null ? `${passport.currentSoh}%` : '--%'} />
            <SpecRow k="SOCE" v={passport.soce != null ? `${passport.soce}%` : '--%'} />
            <SpecRow k="누적 방전" v={passport.totalDischargeCycles != null ? `${passport.totalDischargeCycles} 사이클` : '-'} />
            <div style={{ flex: 1 }} />
            <div style={{ flex: 1 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
