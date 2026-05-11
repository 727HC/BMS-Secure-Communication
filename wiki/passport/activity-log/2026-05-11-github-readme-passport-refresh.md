---
title: "2026-05-11 GitHub README 배터리여권 최신화"
date: 2026-05-11
tags: [passport, readme, docs, github]
doc_type: activity-log
status: current
---
# 2026-05-11 GitHub README 배터리여권 최신화

## 작업 주체
- Codex / 배터리여권 세션

## 작업 내용
- GitHub 진입 문서에서 배터리여권 API/Web 최신 기준을 보강했다.
- 루트 `README.md` 상단 설명, 구성 표, 섹션 제목에 `배터리여권(Passport)` 표현을 명시해 GitHub 첫 화면에서 바로 보이게 했다.
- GitHub 첫 화면 문구가 보고서/AI 톤으로 보이지 않도록 `검증`, `최신 커밋`, `fallback/overlay` 중심 표현을 줄이고 제품 설명 중심으로 정리했다.
- 루트 `README.md`의 Quick Start에서 React build 후 `bmu-agent` 기동 순서가 더 정확하도록 정리했다.
- 루트 `README.md`에 Passport/API/Web 최신 기준 섹션을 추가했다.
  - 최신 기준 커밋 `8b5db6e`
  - `bmu-agent` test 40개, `webapp` Vitest 1,270개 통과
  - live `passport-contract` Version 1.4 / Sequence 5
  - `SetPassportExtendedAttributes`, `BindBMSIdentifier`, `RecordSourceVerification`, `RecordBMUDataWithPayload`
  - `bmsBindingCode32=0x2c9a0e0c`, rawPayload bytes `44..47 = 0c 0e 9a 2c`
  - cloud-agent unavailable 시 Fabric + runtime BMU snapshot fallback
- `bmu-agent/README.md`에 `/api/realtime` 라우트와 실시간 snapshot/fallback 설명을 추가했다.
- `webapp/frontend-react/README.md`에 dashboard/detail의 실시간 표시 기준과 SOCE `미수집` 표시 기준을 추가했다.
- 루트 `README.md`의 MCP 관찰 항목에 남아 있던 BMS binding 관련 `Sequence 3` 표기를 live 기준 `Sequence 5`로 정정했다.

## 변경 파일
- `README.md`
- `bmu-agent/README.md`
- `webapp/frontend-react/README.md`
- `wiki/passport/activity-log.md`
- `wiki/passport/activity-log/2026-05-11-github-readme-passport-refresh.md`

## 검증
- Markdown frontmatter check pass
- README 내 BMS binding 관련 `Sequence 3` 표기는 `Sequence 5`로 정정했다.
- `git diff --check -- README.md bmu-agent/README.md webapp/frontend-react/README.md wiki/passport/activity-log.md wiki/passport/activity-log/2026-05-11-github-readme-passport-refresh.md` → pass

## 미완료 / 리스크
- 다른 세션 변경이 워킹트리에 있으므로 커밋 시 배터리여권 문서 파일만 stage해야 한다.

## 교훈
- `bmu-agent`는 시작 시점에 React build 존재 여부를 체크하므로 배포 문서에서는 `npm run build` 후 Agent 기동 순서가 안전하다.
