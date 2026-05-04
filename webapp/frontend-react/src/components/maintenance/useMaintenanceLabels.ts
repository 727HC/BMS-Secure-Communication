interface Args {
  isEVManufacturer: boolean;
  isService: boolean;
}

export function useMaintenanceLabels({ isEVManufacturer, isService }: Args) {
  const docketScopeLabel = isEVManufacturer
    ? 'EV manufacturer service desk'
    : isService
      ? '서비스 완료 데스크'
      : 'Read-only docket view';

  const docketSummary = isEVManufacturer
    ? 'EV 제조사는 운행 중인 VIN 파일을 service task로 접수하고 사고 기록을 docket에 남깁니다.'
    : isService
      ? '정비 조직은 접수된 service task를 완료 기록으로 마감하고 사고 기록을 docket에 남깁니다.'
      : '현재 권한에서는 task docket을 열람하며 접수, 완료, 사고 기록 조치는 숨겨집니다.';

  return { docketScopeLabel, docketSummary };
}
