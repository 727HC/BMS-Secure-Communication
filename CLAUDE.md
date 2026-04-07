# BMS Blockchain Platform

xEV BMS 보안 플랫폼 — 배터리 여권, Hyperledger Fabric, 임베디드 보안, MCP 모니터링.

## Multi-Session Architecture

4개 세션이 병렬로 작업 중. **자기 담당 범위만 수정할 것.**

| Session | Scope | Directories |
|---------|-------|-------------|
| Passport | API 서버, 프론트엔드 | `bmu-agent/`, `webapp/` |
| Blockchain | Fabric 인프라, 체인코드 | `passport-network/`, `chaincode/` |
| Embedded | BMU/CMU, S32K, CAN-FD, HSE | `embedded/`, `firmware/` |
| MCP | MCP 모니터링 서버 | `mcp-monitor/` |

## Knowledge Base

프로젝트 지식 베이스: `wiki/` (Obsidian vault). 작업 전 관련 문서 확인할 것.
- `wiki/passport/design-tokens.md` — UI 색상, 폰트, 크기 규칙 (프론트 작업 시 필수)
- `wiki/common/` — 아키텍처, 용어 사전
- `wiki/decisions/` — 기술 결정 기록 (ADR)
- **세션 종료 시** `wiki/{세션}/activity-log.md`에 활동 기록 필수 (작업 내용, 변경 파일, 미완료, 교훈)

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
