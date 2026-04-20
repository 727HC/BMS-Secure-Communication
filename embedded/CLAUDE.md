# Embedded 세션 — BMU/CMU

## 범위
- `embedded/` — BMU/CMU 구현
- `firmware/` — S32K3 펌웨어

## 수정 금지
- `webapp/`, `bmu-agent/` → Passport 세션
- `chaincode/`, `passport-network/` → 블록체인 세션
- `mcp-monitor/` → MCP 세션

## 임베디드 규칙
- CAN-FD 메시지: AES-128 CMAC + Frame Counter 필수
- HSE 키: ADKP 통한 인증 후 접근
- Ed25519 서명: TweetNaCl 사용
- BMU 데이터 포맷: 48바이트 고정

## 작업 완료 시
- `wiki/embedded/activity-log.md`에 세션 단위로 기록
