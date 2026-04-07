# BMS-Blockchain Knowledge Base

xEV BMS 보안 플랫폼 — 전 세션 공유 지식 베이스

## 구조

| 폴더 | 용도 | 담당 |
|------|------|------|
| `common/` | 프로젝트 전체 공통 (아키텍처, 용어, 규칙) | 전체 |
| `passport/` | API 서버, 프론트엔드, 디자인 토큰, UI 레퍼런스 | Passport 세션 |
| `blockchain/` | Fabric 인프라, 체인코드, 채널, 피어, CA | Blockchain 세션 |
| `embedded/` | BMU/CMU, S32K, CAN-FD, HSE, 펌웨어 | Embedded 세션 |
| `mcp/` | MCP 모니터링 서버, 도구 | MCP 세션 |
| `decisions/` | 기술 결정 기록 (ADR) | 전체 |

## 사용 규칙

1. 각 세션은 자기 폴더 + `common/`만 수정
2. `decisions/`는 모든 세션이 작성 가능 (ADR 번호 충돌 주의)
3. 이미지/레퍼런스는 각 폴더 내 `assets/`에 저장
4. 파일명: `kebab-case.md`
5. 프론트매터 필수: `title`, `date`, `tags`

## 도구 연동

- **Obsidian**: `\\wsl$\Ubuntu\home\<USER>\bms-blockchain\wiki\`로 vault 열기
- **Claude Code**: `/path/to/bms-blockchain/wiki/` 직접 Read
- **Codex CLI**: 프로젝트 내 `wiki/` 경로로 자동 접근
