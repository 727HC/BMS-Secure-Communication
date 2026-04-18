# Wiki Editing Guide for Agents

This file governs `wiki/` and every child path under it.

## 목적
- 위키 문서를 추가/수정할 때 note 위치, 메타데이터, 링크 정리를 일관되게 유지한다.
- 자세한 정책/예시는 `wiki/common/agent-wiki-writing-guide.md`를 기준으로 본다.

## 먼저 확인할 문서
1. `wiki/common/agent-wiki-writing-guide.md` — agent용 정본 가이드
2. `wiki/common/wiki-writing-guide.md` — 사람/운영 관점의 상위 가이드
3. 관련 도메인 허브 (`wiki/*/README.md`, `overview.md`)

## note routing 규칙
- `wiki/common/` — 여러 도메인에서 재사용하는 구조/규칙/템플릿/공통 가이드
- `wiki/decisions/` — 세션 간 유지해야 하는 ADR / 결정 기록
- `wiki/passport/`, `wiki/blockchain/`, `wiki/embedded/`, `wiki/mcp/` — 도메인 전용 지식 노트
- `wiki/handoffs/` — 작업 인수인계, task packet, 다음 owner 전달 문서
- `wiki/reviews/` — QA, review memo, 리스크 수용, release/readiness 기록
- `wiki/*/activity-log*.md` 또는 `wiki/*/activity-log/*.md` — 날짜별/세션별 활동 기록
- `wiki/Object/` — PDF, 원문, 이미지 같은 참고 원본 (markdown note 금지)

## 작성 규칙
- 기존 문서가 맞으면 새 문서를 만들지 말고 기존 문서를 확장한다.
- 임시 메모, 추측, scratch note는 위키에 남기지 않는다.
- 파일명은 `kebab-case.md`를 기본으로 한다. 허브는 `README.md`를 사용한다.
- 모든 markdown note는 최소 frontmatter `title`, `date`, `tags`, `doc_type`를 가진다.
- 새 문서를 만들면 관련 허브(`README.md`, `knowledge-map.md`, 운영 README`)에서 발견 가능한지 확인한다.
- 문서를 이동/추가/삭제하면 관련 wikilink와 markdown link를 함께 수정한다.
- 구조 변경 후에는 repo root에서 `python3 scripts/verify_wiki.py`를 실행한다.

## 활동 로그 규칙
- substantial 작업이면 해당 도메인의 activity-log에도 요약을 남긴다.
- 세부 시행착오는 archive 트랙이 있으면 그곳으로 보낸다.
- QA / handoff / review 결과를 activity-log 본문에 중복 복사하지 않는다. 링크만 남긴다.

## drift 방지
- 이 파일은 짧고 강제적인 규칙만 둔다.
- rationale, 예시, note 예문은 `wiki/common/agent-wiki-writing-guide.md` 한 곳에만 둔다.
- 이 파일과 정본 가이드가 충돌하면 정본 가이드를 먼저 고치고, 그 다음 이 파일을 맞춘다.
