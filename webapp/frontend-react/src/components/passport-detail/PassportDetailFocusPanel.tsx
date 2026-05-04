export default function PassportDetailFocusPanel() {
  return (
    <div className="sn-panel" style={{ padding: '1rem 1.2rem', background: 'var(--color-surface-alt)', borderStyle: 'dashed' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
        <div>
          <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>자료 초점</p>
          <p className="sn-caption">배터리 상태(SOH), 충전 상태(SOC), 규제 준수율, VIN 연결 여부</p>
        </div>
        <div>
          <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>등록부 작업</p>
          <p className="sn-caption">권한과 상태 조건을 통과한 작업만 표시합니다.</p>
        </div>
        <div>
          <p className="sn-eyebrow" style={{ marginBottom: '0.35rem' }}>근거 탭</p>
          <p className="sn-caption">소재, 운영 이력, 진단 데이터, 증빙은 탭에서 이어서 확인</p>
        </div>
      </div>
    </div>
  );
}
