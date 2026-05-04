interface Args {
  isEVManufacturer: boolean;
  isService: boolean;
  isRegulator: boolean;
}

export function useRecyclingLabels({ isEVManufacturer, isService, isRegulator }: Args) {
  const deskLabel = isEVManufacturer
    ? 'EV제조사 분석 요청 데스크'
    : isService
      ? '서비스 분석 데스크'
      : isRegulator
        ? '규제기관 회수 권한'
        : '생애 주기 등록부';

  const pageSummary = isEVManufacturer
    ? 'EV 제조사는 운행 중인 여권을 분석 요청으로 넘기고 회수 준비 상태를 같은 ESG 등록부에서 확인합니다.'
    : isService
      ? '정비·분석 조직은 분석 결과와 재활용 가능 판정을 제출해 회수 준비 근거를 남깁니다.'
      : isRegulator
        ? '검증기관은 회수 가능 여권의 소재 추출 근거와 폐기 승인을 lifecycle register 기준으로 관리합니다.'
        : '조직 권한 안에서 전주기 회수 준비도, 추출 근거, 폐기 승인 상태를 확인합니다.';

  return { deskLabel, pageSummary };
}
