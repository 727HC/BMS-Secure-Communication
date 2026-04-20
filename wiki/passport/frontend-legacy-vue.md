---
title: "레거시 프론트엔드 개요 (Vue)"
date: 2026-04-20
tags: [passport, frontend, legacy]
doc_type: reference
status: historical
---
# 레거시 프론트엔드 개요 (Vue)

> 과거 기준 기록
>
> 이 문서는 예전 `webapp/frontend/` 기반 UI 구조를 요약한 historical note다.
> 현재 onboarding과 설계 설명은 [[passport/frontend|프론트엔드 구조]]를 우선 본다.

## 당시 기술 스택
- Vue 3 (CDN)
- Tailwind CSS (CDN)
- Pretendard Variable + Outfit + JetBrains Mono
- 인라인 `app.component()` 패턴

## 당시 파일 구조

```text
webapp/frontend/
├── index.html
├── app.js
└── pages/
    ├── login.js
    ├── dashboard.js
    ├── passports.js
    ├── passport-detail.js
    ├── materials.js
    ├── bmu-data.js
    ├── maintenance.js
    ├── recycling.js
    ├── qr-scan.js
    └── audit-log.js
```

## 당시 역할
- 사이드바/상단바 기반 업무 UI
- 여권 등록부, 상세, 원자재, BMU, 정비, 재활용, QR, 감사 로그 화면 제공
- `/legacy` 보조 경로로 호환 유지

## 왜 historical로 남기나
- activity-log에 흩어진 Vue 시절 UI 맥락을 한 문서에서 요약해 볼 수 있다.
- 현재 React 기준 문서에서 레거시 설명을 길게 유지하지 않아도 된다.
- 레거시 흐름을 유지보수하거나 과거 변경을 추적할 때 배경 문서로 쓸 수 있다.

## 함께 보는 문서
- [[passport/frontend|현재 프론트엔드 구조]]
- [[passport/overview|배터리 여권 세션 개요]]
- [[passport/activity-log|Passport 활동 로그 인덱스]]
- [[passport/_archive/README|Passport archive 허브]]
