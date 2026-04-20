---
title: "Task Packet 템플릿"
date: 2026-04-20
tags: [common, workflow, template]
doc_type: template
status: current
---
# Task Packet

> 현재 기준 문서
>
> 작업을 시작하기 전에 이 형식으로 계약을 작성한다.
> 반복 실패를 줄이고, 작업 범위와 검증 기준을 먼저 고정하기 위한 구조화된 작업 정의다.

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
- 사용 금지 패턴
- 반드시 따를 규칙

### Escalation
- 2회 실패 시: 방향 확인
- 3회 실패 시: 접근 방식 전환
```

## 사용 예시

```markdown
## Task: 대시보드 리디자인

### Objective
- 현재 React 배터리 여권 작업 공간의 대시보드 정보를 운영 중심으로 재정리

### Scope
- 수정: webapp/frontend-react/src/pages/DashboardPage.tsx
- 제외: 다른 페이지, 서버 코드, 체인코드

### Acceptance Tests
- [ ] 본문 텍스트 14px 이상
- [ ] 현재 디자인 토큰 규칙 준수
- [ ] `npm run build` 통과
- [ ] 콘솔 에러 없음
- [ ] 관련 wiki 문서/스크린샷 필요 시 함께 갱신

### Constraints
- design-tokens.md 색상만 사용
- 작은 장식성 위젯 추가 금지
- 구현 범위를 벗어난 코드 수정 금지

### Escalation
- 2회 실패: 현재 화면/데이터 우선순위 재확인
- 3회 실패: 단일 화면 개선 대신 요구사항 재분해
```

## 언제 이 템플릿을 쓰나
- 범위를 먼저 고정하고 싶을 때
- acceptance test를 사전에 명시해야 할 때
- 여러 작업자가 같은 목표를 이어받아야 할 때

## 함께 보는 문서
- [[common/README|common/ 허브]]
- [[common/wiki-writing-guide|위키 작성 가이드]]
- [[passport/design-tokens|디자인 토큰]]
