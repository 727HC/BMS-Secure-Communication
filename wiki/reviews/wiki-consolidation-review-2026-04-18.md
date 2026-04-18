---
title: "위키 통합 점검 기록"
date: 2026-04-18
updated: 2026-04-18
tags: [review, wiki, taxonomy, mirror]
doc_type: review
---
# 위키 통합 점검 기록

## 범위
- 위키 taxonomy가 루트/공통/도메인/운영/참고 자료 구조로 일관되는지 확인
- 허브 문서(README, knowledge map, overview, 운영 README) 존재 여부 확인
- source(`wiki/`)와 Windows mirror(`BMS-Knowledge`)의 관리 대상 문서 parity 확인

## 점검 결과

### 1. taxonomy 정규화 상태
현재 top-level taxonomy는 아래 5개 구역으로 안정화되어 있다.

| 구역 | 경로 | 관리 기준 |
|------|------|-----------|
| 루트 허브 | `README.md` | 전체 진입점과 상위 분류를 요약 |
| 공통 기준 | `common/` | architecture, terminology, knowledge map, writing guide |
| 도메인 문서 | `passport/`, `blockchain/`, `embedded/`, `mcp/` | 기능/세션별 overview와 상세 노트 |
| 운영 문서 | `handoffs/`, `reviews/` | handoff, review, QA, verification 기록 |
| 참고 자료 | `Object/` | PDF와 원문 보관 |

상위 폴더별 markdown 개수(점검 시점):

| 경로 | 파일 수 |
|------|--------:|
| `README.md` | 1 |
| `common/` | 6 |
| `decisions/` | 6 |
| `passport/` | 19 |
| `blockchain/` | 7 |
| `embedded/` | 3 |
| `mcp/` | 2 |
| `handoffs/` | 4 |
| `reviews/` | 5 |
| `Object/` | 1 |

### 2. 허브 문서 상태
아래 허브 문서는 모두 존재했다.

- `README.md`
- `common/knowledge-map.md`
- `handoffs/README.md`
- `reviews/README.md`
- `Object/README.md`
- `passport/overview.md`
- `blockchain/overview.md`
- `embedded/overview.md`
- `mcp/overview.md`

해석:
- 루트 → 공통 → 도메인/운영/참고 자료로 내려가는 허브 체인은 이미 완성되어 있다.
- 이번 점검에서는 구조 재배치보다 **허브 유지 규칙과 parity 검증 절차를 문서화**하는 쪽이 안전하다고 판단했다.

### 3. 문서 메타데이터 상태
전체 markdown 문서를 점검한 결과:

- 모든 `*.md` 문서가 YAML frontmatter를 가진다.
- 모든 문서가 기본 키 `title`, `date`, `tags`, `doc_type`를 포함한다.

## source ↔ mirror parity

### 최초 확인
관리 대상 파일 비교 결과, mirror에 아래 1개 문서가 누락되어 있었다.

- `passport/activity-log/2026-04-18.md`

원인 추정:
- 자동 mirror 프로세스가 아직 해당 일자 로그를 반영하지 못했거나, 점검 시점에 프로세스가 비활성 상태였다.

### 조치
다음 명령으로 source 기준 one-shot sync를 수행했다.

```bash
rsync -au --exclude='.obsidian' --exclude='.trash' wiki/ /path/to/BMS-Knowledge/
```

### 재검증
재검증 기준:
- source와 mirror의 관리 대상 파일 수가 같아야 한다.
- `rsync -aunv --delete --exclude='.obsidian' --exclude='.trash' ...` dry-run 출력이 비어야 한다.

점검 결론:
- 관리 대상 parity를 다시 맞췄다.
- `.obsidian/`, `.trash/`는 사용자별 상태 폴더이므로 parity 대상에서 제외한다.

## 후속 규칙
1. 새 문서를 만들면 먼저 `wiki/` source에 저장한다.
2. 구조를 바꿀 때는 `README.md` 또는 관련 허브에서 진입 링크가 유지되는지 같이 본다.
3. 세션 종료 전에는 parity dry-run을 한 번 실행해 mirror 누락을 확인한다.
