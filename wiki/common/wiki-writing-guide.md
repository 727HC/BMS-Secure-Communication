---
title: "위키 작성 가이드"
date: 2026-04-14
tags: [common, workflow, wiki]
doc_type: guide
---
# 위키 작성 가이드

## 핵심 원칙
- 공통 사실은 한 번만 쓴다.
- 같은 내용을 agent별 문서로 복제하지 않는다.
- 문서 하나에는 목적 하나만 둔다.
- raw log보다 정제된 사실 / 결정 / 기준을 남긴다.

## 어느 폴더에 둘까

| 문서 성격 | 위치 |
|-----------|------|
| 공통 구조, 용어, 규칙 | `common/` |
| 기술 결정 | `decisions/` |
| 세션/도메인 상세 | 각 도메인 폴더 (`passport/`, `blockchain/` 등) |
| handoff / task packet | `handoffs/` |
| review 기준 / 리뷰 메모 | `reviews/` |
| 외부 PDF / 참고 원문 | `Object/` |

## 새 문서를 쓰는 게 좋은 경우
- 반복해서 다시 설명하는 구조/흐름/제약이 있을 때
- 다음 작업자가 이어받아야 할 맥락이 있을 때
- 코드만 보면 안 보이는 결정 근거가 있을 때
- 리뷰 기준을 문서화해야 할 때

## 굳이 새 문서를 만들지 않아도 되는 경우
- 하루짜리 임시 메모
- 검증 안 된 추측
- 동일 내용을 다른 관점으로 복제하는 문서

## 권장 구성
1. 목적
2. 범위
3. 핵심 포인트
4. 관련 경로 / 링크
5. 다음 액션

## frontmatter 표준
- 기본 키: `title`, `date`, `tags`, `doc_type`
- 선택 키: `updated`, `status`, `aliases`
- `doc_type` 권장값
  - `index` — README, 지식 맵, 로그 인덱스
  - `guide` — 작성 규칙, agent 진입 가이드
  - `template` — 재사용 템플릿
  - `overview` — 도메인/세션 개요
  - `reference` — 구조/규칙/참고 노트
  - `adr` — 결정 기록
  - `handoff` — 작업 인수인계 문서
  - `review` — QA / 리뷰 / 리스크 기록
  - `log` — 활동 로그 / 날짜별 기록

## 파일 규칙
- 파일명: `kebab-case.md`
- frontmatter 기본 키: `title`, `date`, `tags`, `doc_type`
- 선택 frontmatter: `updated`, `status`, `aliases`
- 이미지: 가까운 `assets/`
- 외부 자료: `Object/`

## 허브 체크리스트
위키 구조를 바꾸거나 새 문서를 추가할 때는 아래 허브가 계속 유효한지 함께 확인한다.

- 루트 허브: `wiki/README.md`
- 공통 허브: `wiki/common/knowledge-map.md`
- 도메인 허브: `passport/README.md`, `blockchain/README.md`, `embedded/README.md`, `mcp/README.md`
- 도메인 개요: `passport/overview.md`, `blockchain/overview.md`, `embedded/overview.md`, `mcp/overview.md`
- 운영 허브: `handoffs/README.md`, `reviews/README.md`
- 참고 자료 허브: `Object/README.md`

새 문서가 특정 허브에서만 발견 가능하다면 링크를 추가하거나, 허브가 이미 같은 역할의 문서를 충분히 가리키는지 확인한다.

## source ↔ mirror parity 확인
- canonical source: `/path/to/bms-blockchain/wiki`
- mirror vault: `/path/to/BMS-Knowledge`
- parity 확인 명령:
  - `rsync -aunv --delete --exclude='.obsidian' --exclude='.trash' wiki/ /path/to/BMS-Knowledge/`
- `.obsidian/`, `.trash/`는 사용자별 상태 폴더라 parity 비교에서 제외한다.
- dry-run 출력이 비어 있으면 관리 대상 문서는 source와 mirror가 같은 상태다.

## 운영 메모
source는 `/path/to/bms-blockchain/wiki`다.  
Windows Obsidian vault는 mirror 결과로 본다.
