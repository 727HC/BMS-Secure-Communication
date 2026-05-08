---
title: "배터리 여권 세션 개요"
date: 2026-04-20
tags: [passport, overview]
doc_type: overview
status: current
---
# 배터리 여권 세션

> 현재 기준 문서
>
> Passport 세션의 현재 기준 UI는 VELKERN React 작업 공간이며, 과거 UI 흐름은 historical record로만 참고한다.

## 담당 범위
- `bmu-agent/` — Node.js API 서버
- `webapp/frontend-react/` — 현재 배터리 여권 UI 작업 공간
- 레거시 프런트 호환 경로 — historical 참고용 유지

> 체인코드(`chaincode/`)는 블록체인 세션 범위다.

## 현재 상태
- 배터리 여권 UI의 현재 제품명은 VELKERN이며, 기준 구현은 React 기반 화면군이다.
- 랜딩/로그인/대시보드/등록부/상세/원자재/BMU/정비/재활용/QR/감사 로그가 현재 흐름으로 정리돼 있다.
- 2026-05-08 기준 MATLAB/BMU live demo는 `PASSPORT-E2E-20260508040123`을 대상으로 동작한다.
- cloud-agent read model `localhost:3002`가 꺼져 있어도 `bmu-agent`가 Fabric fallback + runtime BMU snapshot overlay로 dashboard/detail 개요에 최신 BMU 값을 표시한다.
- live Fabric 기준 chaincode는 `passport-contract` Version `1.4`, Sequence `5`다. Agent/UI는 sequence를 직접 지정하지 않고 chaincode name `passport-contract`로 호출한다.
- 과거 UI 개편 과정은 activity-log와 archive에서 추적한다.

## 핵심 기술 스택
- Hyperledger Fabric 2.5, Go 1.22
- Node.js (Express), Fabric SDK, ACA-Py
- React 19, TypeScript, Vite, React Router
- Tailwind 4 + 공용 스타일 토큰

## 현재 사용자 흐름
1. 랜딩 또는 로그인 진입
2. 조직별 인증 후 대시보드 / 대기 항목 / 등록부로 이동
3. 배터리 여권 상세에서 dossier, traceability, trust 흐름 확인
4. 정비 / 분석 / 재활용 / QR 식별 / 감사 로그로 후속 작업 수행

## 백엔드 표면
### API 엔드포인트 그룹
| 그룹 | 경로 | 주요 엔드포인트 |
|------|------|----------------|
| auth | `/api/auth` | POST login, POST register |
| passport | `/api/passports` | GET /, POST /, GET /:id, PUT /:id/bind, POST /:id/correct, POST /:id/extended-attributes, POST /:id/bms-binding, POST /:id/source-verification |
| realtime | `/api/realtime` | GET /passports, GET /passports/:id, GET /bmu/:passportId, GET /stats |
| material | `/api/materials` | GET /, POST /, POST /:id/materials |
| bmu | `/api/bmu` | POST /data, GET /records/:passportId, POST /invalidate/:recordId |
| maintenance | `/api/maintenance` | POST /:id/request, POST /:id/log, POST /:id/accident |
| analysis | `/api/analysis` | POST /:id/request, POST /:id/result |
| recycling | `/api/recycling` | PUT /:id/availability, POST /:id/extract, POST /:id/dispose |
| vc | `/api/vc` | POST /issue, POST /revoke, GET /verify/:credentialId |
| did | `/api/did` | GET /verkey/:did, POST /schemas, POST /credential-definitions |

### RBAC 요약
| 조직 | 주요 권한 |
|------|----------|
| Manufacturer (Org1) | 여권 생성, 데이터 정정, BMU 기록, 원자재 등록 |
| EVManufacturer (Org2) | VIN 바인딩, 정비/분석 요청, 사고 기록 |
| Service (Org3) | 정비 완료, 분석 결과 제출 |
| Regulator (Org4) | 재활용 설정, 소재 추출, 폐기 처리 |

## 현재 기준 문서
- [[passport/live-bmu-runtime-2026-05-08|2026-05-08 MATLAB/BMU live runtime 기준]]
- [[passport/bms-1-3-year-mapping-2026-05-08|BMS PDF 1~3차년도 Passport 반영 매핑]]
- [[passport/cross-session-handoff-2026-05-08|2026-05-08 4세션 전달 내용 및 리스크]]
- [[passport/frontend|프론트엔드 구조]]
- [[passport/design-tokens|디자인 토큰]]
- [[passport/ui-references|UI 레퍼런스]]
- [[common/architecture|시스템 아키텍처]]

## 기록/보관 경로
- historical 작업 로그: [[passport/activity-log|활동 로그 인덱스]]
- 상세 archive: [[passport/_archive/README|archive 허브]]
- handoff 기록: [[handoffs/passport/README|Passport handoff 허브]]
- review 기록: [[reviews/passport/README|Passport review 허브]]
