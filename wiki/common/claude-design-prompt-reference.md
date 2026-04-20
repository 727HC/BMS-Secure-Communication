---
title: "Claude 디자인 프롬프트 참조"
date: 2026-04-20
tags: [design, ui, reference, prompt]
doc_type: reference
status: historical
external_source: "https://github.com/elder-plinius/CL4R1T4S/blob/main/ANTHROPIC/Claude-Design-Sys-Prompt.txt"
---

# Claude 디자인 프롬프트 참조

> 과거/외부 참고 자료
>
> 이 문서는 현재 프로젝트 기준 문서가 아니라, 외부 디자인 프롬프트에서 차용 가능한 원칙을 정리한 background reference다.

Claude.ai 웹앱의 design-mode 내부 시스템 프롬프트를 참조용으로 보관. 원본 파일은 `claude-design-prompt-reference.raw.txt` (422줄). 이 문서는 **Claude Code 환경에서 차용 가능한 원칙**만 정리한 요약.

## 주의
- 원본은 Claude.ai 웹 환경 전용 (`done`, `fork_verifier_agent`, `<mentioned-element>`, `window.claude.complete` 등 Claude Code에 없는 도구 다수)
- 제품 디자인/HTML artifact 생성 관점 — Claude Code의 소스 편집 플로우와 직접 매핑되지 않음
- **Claude Code용 skill 버전**은 `~/.claude/skills/design-craft/SKILL.md`에 별도로 정리

## 차용 가능한 원칙

### 디자인 프로세스
- 질문 많이 하기 — 컨텍스트, variation 개수, UI kit/브랜드, 강조 축(UX/visual/copy)
- 디자인 컨텍스트 획득이 최우선: 코드베이스/스크린샷/기존 컴포넌트 → 맨땅 mock-up은 최후의 수단
- 3+ variation 주기 — by-the-book부터 시작해서 점점 창의적으로. visuals/interactions/color/type/layout 다축 탐색

### 시각적 일관성
- 기존 UI vocabulary 먼저 파악: 색상 팔레트, tone, hover/click 상태, shadow/card 패턴, density
- "Think out loud" — 관찰한 내용을 먼저 말로 정리
- 컬러는 브랜드/디자인 시스템에서 사용, 부족하면 oklch로 조화롭게 확장. 맨땅 색상 발명 금지
- 기존 토큰 (CSS variables, tailwind scale)이 있으면 그 안에서 움직이기

### 콘텐츠 가드레일
- Filler content 금지 — 빈 공간 채우려 dummy 섹션 만들지 말 것
- Data slop 금지 — 의미 없는 숫자/아이콘/통계 추가 금지
- 섹션/페이지/카피 추가는 **사용자에게 먼저 질문**
- One thousand no's for every yes

### AI slop 안티패턴 (모두 금지)
- 과도한 gradient 배경
- 브랜드가 요구하지 않는 emoji
- `rounded corner + left-border accent color` 컨테이너 패턴
- 실제 이미지 대신 SVG로 그린 가짜 일러스트 (placeholder가 낫다)
- 과용 폰트 (Inter, Roboto, Arial, Fraunces, system fonts)

### 타이포/크기 규칙
- 1920x1080 슬라이드: 최소 24px, 이상적으로는 훨씬 크게
- 프린트 문서: 최소 12pt
- 모바일 hit target: 최소 44px

### React + Babel (inline JSX)
- 버전 고정 + integrity hash 필수 (`react@18.3.1`, `react-dom@18.3.1`, `@babel/standalone@7.29.0`)
- **스타일 오브젝트 이름 충돌 금지** — `const styles = {}` 쓰지 말고 `const terminalStyles = {}`처럼 고유 이름
- `<script type="text/babel">` 간 scope 독립 → 공유 컴포넌트는 `Object.assign(window, {...})`로 globalize
- `type="module"` 회피

### CSS
- `text-wrap: pretty` 활용
- CSS grid + 고급 CSS 효과 적극 활용
- `scrollIntoView` 금지 — 다른 DOM scroll 방식 사용

### 파일 구성
- 파일당 ≤1000줄 — 넘으면 분할
- 큰 변경 시 버전 복사본 유지 (`My Design.html` → `My Design v2.html`)
- 리소스는 참조 말고 복사 — 단, 20+개 bulk-copy 금지, 필요한 것만 타겟

### GitHub/Codebase 참조 시
- tree만 보고 추정 금지 — 실제 파일 import 후 **이론 값 그대로 읽어서 사용**
- 타겟: theme/color tokens (`theme.ts`, `tokens.css`), 특정 컴포넌트, 글로벌 stylesheet
- 트레이닝 기억으로 대충 흉내 내지 말고 픽셀 단위 fidelity

## Claude Code 적용 시사점
- BATP React 프로젝트에 이미 적용 중: `design-tokens.md` + `sn-*.css` + oklch 회피 + Pretendard/Outfit/JetBrains Mono (허용된 폰트)
- Anti-pattern과 이미 합치: 다크 카드/글래스모피즘/AI 글로우 금지 룰은 같은 결
- 디자인 시스템 기반 색상 사용 규칙이 우리 `var(--color-*)` 토큰 체계와 정확히 일치

## 관련 문서
- [[common/README|common/ 허브]]
- [[passport/design-tokens]] — 프로젝트 실제 디자인 토큰
- [[passport/ui-references]] — UI 레퍼런스 및 실패 방향 기록
- `claude-design-prompt-reference.raw.txt` — 원본 전체
