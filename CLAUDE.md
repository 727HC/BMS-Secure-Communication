# BMS Blockchain Platform

xEV BMS 보안 플랫폼 — 배터리 여권, Hyperledger Fabric, 임베디드 보안, MCP 모니터링.

## Multi-Session Architecture

4개 세션이 병렬로 작업 중. **자기 담당 범위만 수정할 것.**

| Session | Scope | Directories |
|---------|-------|-------------|
| Passport | 배터리 여권, GBA 21, DID/VC | `chaincode/`, `webapp/` |
| Blockchain | Fabric 인프라, 채널, 피어, CA | `passport-network/`, `bmu-agent/` |
| Embedded | BMU/CMU, S32K, CAN-FD, HSE | `embedded/`, `firmware/` |
| MCP | MCP 모니터링 서버 | `mcp-monitor/` |

## Rules

- 다른 세션 디렉토리의 파일을 수정하지 말 것
- 공통 파일(이 CLAUDE.md, 루트 설정) 수정 시 다른 세션과 합의 필요
- `logs/`, `node_modules/`, `wallet/`는 런타임 산출물 — 커밋하지 말 것

## Stack

- **Blockchain**: Hyperledger Fabric 2.5, 4-org network, CouchDB, Go chaincode
- **Agent**: Node.js (Express), Fabric SDK, ACA-Py (Aries)
- **Frontend**: Vanilla JS SPA, Tailwind CSS
- **Embedded**: NXP S32K3, CAN-FD, HSE
- **MCP**: @modelcontextprotocol/sdk, stdio transport

## Conventions

- Commit message: 한글 or 영어, `feat:/fix:/refactor:` prefix
- 테스트: 수정 후 `node -c` 구문 검증 필수
- 환경변수: `.env` 파일로 관리, 커밋 금지
