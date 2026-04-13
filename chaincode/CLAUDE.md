# Blockchain 세션 — chaincode

## 범위
- `chaincode/passport-contract/` — Go 체인코드 (40개 함수)
- `passport-network/` — 4-Org Fabric 네트워크

## 수정 금지
- `webapp/`, `bmu-agent/` → Passport 세션
- `embedded/`, `firmware/` → 임베디드 세션
- `mcp-monitor/` → MCP 세션

## 체인코드 규칙
- RBAC: requireMSP() 체크 필수
- 상태 변경 함수는 UpdatedAt 갱신
- 에러 메시지: fmt.Errorf 사용, 구체적 이유 명시
- 함수 추가 시 wiki/common/architecture.md RBAC 매트릭스 업데이트

## 작업 완료 시
- `wiki/blockchain/activity-log.md`에 세션 단위로 기록
- 체인코드 변경이 API에 영향 주면 Passport 세션에 알리기
