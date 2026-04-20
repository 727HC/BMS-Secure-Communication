---
title: "BMS-Blockchain Knowledge Base"
date: 2026-04-20
tags: [wiki, index, common]
doc_type: index
status: current
---

# BMS-Blockchain Knowledge Base

xEV BMS 보안 플랫폼용 공용 Obsidian vault다.  
이 허브는 **현재 기준 문서**, **기록성 문서**, **보관 문서**를 분리해서 안내한다.

## 현재 기준 진입점
1. [[common/knowledge-map|지식 맵]]
2. [[common/README|common/ 허브]]
3. [[decisions/README|decisions/ 허브]]
4. 도메인별 current 허브
   - [[passport/README|Passport]]
   - [[blockchain/README|Blockchain]]
   - [[embedded/README|Embedded]]
   - [[mcp/README|MCP]]

## 폴더 구조

| 구역 | 경로 | 용도 |
|------|------|------|
| 공통 기준 | `common/` | 현재 기준 아키텍처, 용어, 지식 맵, 작성 규칙 |
| 결정 기록 | `decisions/` | ADR, 세션 간 공통 결정 |
| 도메인 노트 | `passport/`, `blockchain/`, `embedded/`, `mcp/` | 현재 기준 설명과 도메인 상세 맥락 |
| 작업 운영 기록 | `handoffs/`, `reviews/` | 인수인계, QA, review 기록 |
| 세부 보관 | `passport/_archive/` | 공통 로그에 바로 올리지 않는 상세 시행착오 / Codex 기록 |
| 참고 자료 | `Object/` | PDF, 외부 기준 문서, 원본 자료 |

> `Object/`는 기존 Obsidian 링크 호환성을 위해 이름을 유지한다.

## 자주 찾는 현재 기준 문서
### 공통
- [[common/README|common/ 허브]]
- [[common/knowledge-map|지식 맵]]
- [[common/architecture|시스템 아키텍처]]
- [[common/terminology|용어 사전]]
- [[common/wiki-writing-guide|위키 작성 가이드]]
- [[common/task-packet-template|Task Packet 템플릿]]
- [[decisions/README|ADR 허브]]

### Passport
- [[passport/README|Passport 허브]]
- [[passport/overview|세션 개요]]
- [[passport/frontend|프론트엔드 구조]]
- [[passport/design-tokens|디자인 토큰]]
- [[passport/assets/README|UI asset 허브]]

### Blockchain
- [[blockchain/README|Blockchain 허브]]
- [[blockchain/overview|세션 개요]]
- [[blockchain/kpi-targets|KPI 목표]]
- [[blockchain/assets/README|KPI asset 허브]]

## 기록성 문서
- [[passport/activity-log|Passport 활동 로그 인덱스]]
- [[handoffs/README|handoff 기록 허브]]
- [[reviews/README|review / QA 기록 허브]]

## 보관 문서
- [[passport/_archive/README|Passport archive 허브]]
- [[Object/README|참고 자료 안내]]

## 정리 원칙
1. 새 공통 기준은 `common/`에 둔다.
2. 세션/도메인 상세는 각 도메인 폴더에 둔다.
3. handoff / review / activity-log는 기록성 문서로 다룬다.
4. archive와 원문 자료는 현재 onboarding의 1차 진입점으로 쓰지 않는다.
5. 파일명은 `kebab-case.md`, frontmatter는 `title`, `date`, `tags`, `doc_type`를 기본으로 맞춘다.

## 동기화 규칙
- **Canonical source**: `/home/heechan/bms-blockchain/wiki`
- **Windows Obsidian vault**: `C:\Users\heechan\Documents\BMS-Knowledge`
- **자동 미러링**: `scripts/wiki-mirror.sh` (`wiki/` → Windows vault)

새 문서는 source 쪽(`wiki/`)에 먼저 정리하고, Windows vault는 mirror 결과를 사용한다.
