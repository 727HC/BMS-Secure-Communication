# OpenClaw Project Guide

이 저장소에서 작업할 때는 아래 원칙을 따른다.

## Language

- 항상 한국어로 답한다.
- 설명은 짧고 직접적으로 한다.
- 코드, 경로, 명령어, 에러 메시지는 원문 그대로 유지한다.

## Working Style

- 허락을 반복해서 묻지 말고, 로컬에서 확인 가능한 것은 먼저 확인하고 진행한다.
- 질문만 길게 하지 말고 실제 수정, 검증, 산출물 생성까지 이어간다.
- 부분 땜질보다 제품 언어와 화면 구조를 통째로 다시 쓰는 방향을 우선한다.

## Current Product Context

- 현재 주력 작업은 프론트엔드 재작성이다.
- 디자인 방향은 admin CRUD가 아니라 filing surface, dossier, ledger, register 같은 제품 언어다.
- dashboard, passports, passport-detail, login, maintenance, bmu-data는 이미 재작성 흐름이 있다. 새 작업도 그 결을 유지한다.

## Knowledge Base

- 프로젝트 지식 베이스는 `wiki/` 디렉토리에 있다 (Obsidian vault).
- 작업 전 관련 문서를 먼저 확인한다:
  - `wiki/common/` — 아키텍처, 용어 사전
  - `wiki/passport/design-tokens.md` — 디자인 토큰, UI 레퍼런스, anti-pattern
  - `wiki/passport/` — 배터리여권 세션 컨텍스트
  - `wiki/blockchain/` — 블록체인 세션 컨텍스트
  - `wiki/embedded/` — 임베디드 세션 컨텍스트
  - `wiki/mcp/` — MCP 세션 컨텍스트
  - `wiki/decisions/` — 기술 결정 기록 (ADR)
- UI 작업 시 `wiki/passport/design-tokens.md`의 색상, 폰트, 크기 규칙을 반드시 따른다.
- 새로운 기술 결정을 내릴 때 `wiki/decisions/`에 ADR을 작성한다.
- **세션 종료 시 반드시** `wiki/{세션}/activity-log.md`에 활동 기록을 남긴다 (작업 내용, 변경 파일, 미완료, 교훈).

## Repository Rules

- 반드시 먼저 [CLAUDE.md](./CLAUDE.md)를 읽고 현재 멀티 세션 범위를 확인한다.
- 자기 작업 범위와 무관한 디렉터리 변경은 피한다.
- `logs/`, `node_modules/`, `wallet/` 같은 런타임 산출물은 커밋하지 않는다.
- 수정 후 가능한 범위에서 구문 검증과 화면 검증을 직접 수행한다.

## User Preferences

- 사용자는 한국어를 선호한다.
- 짧고 명확한 보고를 원한다.
- 중간 허락 요청을 싫어한다.
- 현재 작업 루트는 `/home/heechan/bms-blockchain` 이다.

