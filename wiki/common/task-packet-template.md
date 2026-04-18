---
title: "Task Packet 템플릿"
date: 2026-04-07
tags: [common, workflow, template]
doc_type: template
---
# Task Packet

> 작업을 시작하기 전에 이 형식으로 계약을 작성한다.
> 반복 실패를 줄이고, 작업 범위를 명확히 하기 위한 구조화된 작업 정의.

## 템플릿

```markdown
## Task: {제목}

### Objective
- 한 줄로 목표 정의

### Scope
- 수정 대상 파일/디렉토리
- 수정하지 않을 파일 (명시적 제외)

### Acceptance Tests
- [ ] 테스트 1: {구체적 검증 기준}
- [ ] 테스트 2: {구체적 검증 기준}
- [ ] 테스트 3: {구체적 검증 기준}

### Constraints
- 사용 금지 패턴 (예: 10px 이하 텍스트, 다크 배경 카드)
- 반드시 따를 규칙 (예: design-tokens.md 색상만 사용)

### Escalation
- 2회 실패 시: 사용자에게 방향 확인
- 3회 실패 시: 접근 방식 전환
```

## 사용 예시

```markdown
## Task: 대시보드 리디자인

### Objective
- EV Data Interface 레퍼런스 기반 대시보드 재설계

### Scope
- 수정: webapp/frontend/pages/dashboard.js
- 제외: index.html, app.js, 다른 페이지

### Acceptance Tests
- [ ] 본문 텍스트 14px 이상
- [ ] Playwright 스크린샷에서 빈 공간 < 30%
- [ ] 모든 KPI 숫자가 읽히는지 확인
- [ ] node -c 구문 검증 통과
- [ ] 콘솔 에러 없음

### Constraints
- design-tokens.md 색상만 사용
- 다크 배경 카드 금지
- 10px 이하 텍스트 금지
- 외부 차트 라이브러리 금지

### Escalation
- 2회 실패: 사용자에게 스크린샷 보여주고 방향 확인
- 3회 실패: 레퍼런스 복제 포기, BATP 데이터 기반 설계로 전환
```
