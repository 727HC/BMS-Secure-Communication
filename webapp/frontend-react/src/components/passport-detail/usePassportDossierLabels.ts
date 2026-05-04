import type { Passport, GbaCompliance } from './types';

interface Args {
  passport: Passport;
  gbaCompliance: GbaCompliance;
  bmuRecordsCount: number;
  isManufacturer: boolean;
  isEV: boolean;
  isService: boolean;
  isRegulator: boolean;
}

export function usePassportDossierLabels({
  passport,
  gbaCompliance,
  bmuRecordsCount,
  isManufacturer,
  isEV,
  isService,
  isRegulator,
}: Args) {
  const warningMessages = [
    passport.status === 'MAINTENANCE' ? '정비가 진행 중입니다. 작업 완료 후 결과를 먼저 등록해야 합니다.' : null,
    passport.status === 'ANALYSIS' ? '분석 결과가 아직 닫히지 않았습니다. 결과 등록이 필요합니다.' : null,
    gbaCompliance.pct < 100 ? `GBA 규제 준수 항목이 ${21 - gbaCompliance.filled}개 비어 있습니다. 보완이 필요합니다.` : null,
    passport.currentSoh != null && passport.currentSoh < 80 ? '배터리 상태(SOH)가 낮습니다. 사용 지속 여부를 우선 검토해야 합니다.' : null,
    !passport.vin ? '차량 연결이 아직 완료되지 않았습니다. 상세 검토 전에 VIN 등록부터 확인해야 합니다.' : null,
  ].filter((m): m is string => Boolean(m));

  const lifecycleLabel = passport.status === 'MAINTENANCE'
    ? '정비 진행 중'
    : passport.status === 'ANALYSIS'
      ? '점검 결과 대기'
      : passport.status === 'RECYCLING'
        ? '회수·재활용 검토 중'
        : !passport.vin
          ? 'VIN 등록 대기'
          : '운행 중';

  const roleDeskLabel = isManufacturer
    ? '제조사 등재 데스크'
    : isEV
      ? 'EV binding desk'
      : isService
        ? '서비스 근거 데스크'
        : isRegulator
          ? '규제기관 검토 데스크'
          : '공유 자료 뷰';

  const dossierSummary = isManufacturer
    ? '제조사는 원본 여권 파일, GBA 21 보완 상태, VC 발급 작업을 같은 dossier에서 확인합니다.'
    : isEV
      ? 'EV 제조사는 차량 연결 상태와 정비·분석 요청 가능 여부를 dossier 기준으로 확인합니다.'
      : isService
        ? '정비/분석 조직은 작업 대기 상태와 BMU 원장 근거를 dossier 안에서 이어봅니다.'
        : isRegulator
          ? '검증기관은 규제 증빙, 실물 이력 검증, 폐기 판단을 dossier 기준으로 검토합니다.'
          : '조직 권한 안에서 열람 가능한 배터리 여권 근거를 dossier 기준으로 확인합니다.';

  const filingStateLabel = gbaCompliance.pct < 100
    ? '문서 보완 필요'
    : !passport.vin
      ? 'VIN 연결 대기'
      : '검토 준비';

  const actionContext = isManufacturer
    ? '제조 파일 정정과 VC 발급 작업을 실행할 수 있습니다.'
    : isEV
      ? '차량 연결, 정비 요청, 분석 요청은 상태와 VIN 조건에 맞을 때 열립니다.'
      : isService
        ? '정비 또는 분석 상태의 여권에 결과 등록 작업을 남깁니다.'
        : isRegulator
          ? '검증기관 권한으로 폐기 판단과 증빙 발급을 처리합니다.'
          : '현재 조직에서 허용된 작업만 표시합니다.';

  const bmuRecordLabel = bmuRecordsCount > 0 ? `${bmuRecordsCount}건 수집` : '수집 이력 없음';
  const vinLabel = passport.vin || '미바인딩';

  return {
    warningMessages,
    lifecycleLabel,
    roleDeskLabel,
    dossierSummary,
    filingStateLabel,
    actionContext,
    bmuRecordLabel,
    vinLabel,
  };
}
