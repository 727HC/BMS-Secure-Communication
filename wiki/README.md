---
title: "BMS-Blockchain Knowledge Base"
date: 2026-04-18
tags: [wiki, index, common]
doc_type: index
---

# BMS-Blockchain Knowledge Base

xEV BMS 보안 플랫폼용 공용 Obsidian vault다.  
지금은 **도메인 노트 / 결정 기록 / 작업 운영 문서 / 참고 자료**를 분리해서 관리한다.

## 빠른 시작

1. [[common/knowledge-map|지식 맵]]
2. [[common/README|common/ 허브]]
3. [[decisions/README|decisions/ 허브]]
4. 도메인별 허브
   - [[passport/README|Passport]]
   - [[blockchain/README|Blockchain]]
   - [[embedded/README|Embedded]]
   - [[mcp/README|MCP]]

## 폴더 구조

| 구역 | 경로 | 용도 |
|------|------|------|
| 공통 기준 | `common/` | 아키텍처, 용어, 지식 맵, 작성 규칙 |
| 결정 기록 | `decisions/` | ADR, 세션 간 공통 결정 |
| 도메인 노트 | `passport/`, `blockchain/`, `embedded/`, `mcp/` | 세션/기능별 상세 맥락 |
| 작업 운영 | `handoffs/`, `reviews/` | handoff, QA, review 기준, 실행 패킷 |
| 세부 보관 | `passport/_archive/` | 공통 로그에 바로 올리지 않는 상세 시행착오 / Codex 기록 |
| 참고 자료 | `Object/` | PDF, 외부 기준 문서, 원본 자료 |

> `Object/`는 기존 Obsidian 링크 호환성을 위해 이름을 유지한다.

## 자주 찾는 문서

### 공통
- [[common/README|common/ 허브]]
- [[common/knowledge-map|지식 맵]]
- [[common/architecture|시스템 아키텍처]]
- [[common/terminology|용어 사전]]
- [[common/wiki-writing-guide|위키 작성 가이드]]
- [[common/agent-wiki-writing-guide|Agent wiki writing guide]]
- [[common/agent-entrypoints|Agent별 시작점]]
- [[decisions/README|ADR 허브]]

### Passport
- [[passport/README|Passport 허브]]
- [[passport/overview|세션 개요]]
- [[passport/frontend|프론트엔드 구조]]
- [[passport/design-tokens|디자인 토큰]]
- [[passport/assets/README|UI asset 허브]]
- [[passport/activity-log|활동 로그 인덱스]]
- [[reviews/passport/manual-qa-checklist|수동 QA 체크리스트]]

### Blockchain
- [[blockchain/README|Blockchain 허브]]
- [[blockchain/overview|세션 개요]]
- [[blockchain/kpi-targets|KPI 목표]]
- [[blockchain/assets/README|KPI asset 허브]]
- [[blockchain/chaincode-security-fixes|체인코드 보안 수정 이력]]
- [[handoffs/blockchain/passport-handoff-2026-04-13|Passport 세션 handoff]]

### Embedded / MCP
- [[embedded/README|Embedded 허브]]
- [[mcp/README|MCP 허브]]

### 운영 문서
- [[handoffs/README|handoff 작성 위치]]
- [[handoffs/passport/README|Passport handoff 허브]]
- [[handoffs/blockchain/README|Blockchain handoff 허브]]
- [[reviews/README|review / QA 문서 위치]]
- [[reviews/passport/README|Passport review 허브]]
- [[reviews/blockchain/README|Blockchain review 허브]]

## 정리 원칙

1. 새 공통 기준은 `common/`에 둔다.
2. 세션/도메인 상세는 각 도메인 폴더에 둔다.
3. handoff / review / task packet은 루트 운영 폴더(`handoffs/`, `reviews/`)에 둔다.
4. 이미지와 첨부는 해당 폴더의 `assets/` 또는 `Object/`에 둔다.
5. 파일명은 `kebab-case.md`, frontmatter는 `title`, `date`, `tags`, `doc_type`를 기본으로 맞춘다.

## 허브 규칙

- 각 최상위 폴더는 `README.md` 또는 `overview.md` 중 최소 하나의 명시적 진입 문서를 가진다.
- 도메인 폴더는 가능하면 `README.md`(허브) → `overview.md`(상세 개요) 순으로 탐색한다.
- cross-folder 링크는 `folder/file` 형태를 우선 사용해 링크 해석 모호성을 줄인다.

## 동기화 규칙

- **Canonical source**: `/path/to/bms-blockchain/wiki`
- **Windows Obsidian vault**: `C:\path\to\BMS-Knowledge`
- **자동 미러링**: `scripts/wiki-mirror.sh` (`wiki/` → Windows vault)
- **Parity check baseline (2026-04-18)**: source ↔ repo wiki는 `.obsidian/workspace.json` 외 동일, mirror는 activity-log 계열 갱신 후 parity 확인

새 문서는 가능하면 source 쪽(`wiki/`)에 먼저 정리하고, Windows vault는 mirror 결과를 사용한다.
