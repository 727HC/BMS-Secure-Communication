interface Args {
  isManufacturer: boolean;
  isRegulator: boolean;
}

export function usePassportsLabels({ isManufacturer, isRegulator }: Args) {
  const registerScopeLabel = isManufacturer
    ? '제조사 등재 데스크'
    : isRegulator
      ? '규제기관 검토 데스크'
      : '공유 등록부 뷰';

  const registerSummary = isManufacturer
    ? '제조사는 신규 여권을 접수하고, 차량 연결과 GBA 21 문서 완성도를 같은 등록부에서 확인합니다.'
    : isRegulator
      ? '검증기관은 검토 대기 문서, 보완 필요 항목, 회수 전환 대상을 등록부 기준으로 확인합니다.'
      : '조직 권한 안에서 열람 가능한 배터리 여권과 상태 증빙을 등록부 기준으로 확인합니다.';

  return { registerScopeLabel, registerSummary };
}
