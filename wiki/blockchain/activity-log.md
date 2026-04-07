---
title: 블록체인 세션 활동 로그
date: 2026-04-06
tags: [blockchain, log]
---

# 블록체인 세션 — 활동 로그

> 세션(컨텍스트) 단위로 기록. 컨텍스트가 차서 다음 세션으로 넘어갈 때 작성.

## Session 1 (2026-04-02 ~ 04-06)

### 작업 내용
- Codex 코드 리뷰로 bmu-agent 보안/안정성 이슈 8건 발견 및 전수 수정
  - Critical: loginUser 비밀번호 검증 우회 차단 (항상 CA enroll)
  - High: 읽기 API에 authenticateToken + userCtx 전달, /register 인가 추가
  - Medium: BMU 48바이트 강제, 입력 검증, API 에러 처리 통일, truthiness 수정
  - Low: QueryPassportsWithPagination 페이지네이션 지원
- 커밋: `f97125c` — bmu-agent 보안/안정성 8건 수정
- claw-code, claude-code-system-prompts 레포 분석 (블록체인 세션 적용 대상 없음)
- 세션 범위 재배분 (ADR-002): `chaincode/` Passport → Blockchain 이관

### 변경 파일
- `bmu-agent/services/fabric.service.js` — loginUser 항상 CA enroll
- `bmu-agent/routes/auth.routes.js` — register에 ALLOW_OPEN_REGISTRATION 토글
- `bmu-agent/routes/material.routes.js` — authenticateToken 추가
- `bmu-agent/routes/vc.routes.js` — query 함수에 userCtx 전달
- `bmu-agent/services/vc.service.js` — query 함수에 userCtx 파라미터 추가
- `bmu-agent/services/bmu-parser.service.js` — 48바이트 !== 강제
- `bmu-agent/routes/analysis.routes.js` — 필수 필드 null 체크
- `bmu-agent/routes/recycling.routes.js` — available boolean 검증
- `bmu-agent/routes/passport.routes.js` — truthiness 수정 + 페이지네이션
- `bmu-agent/server.js` — /api/* 404 핸들러 + 중앙 에러 미들웨어

### 미완료
- TPS KPI 달성 작업 (읽기 1500+, 쓰기 150+)
- passport-network/ Fabric 인프라 최적화
- chaincode/ 코드 리뷰 (새 담당 범위, 아직 미착수)

### 교훈
- bmu-agent는 원래 Passport 세션 범위였으나 보안 리뷰를 블록체인 세션에서 수행 → ADR-002로 범위 재정리
- RBAC 변경 시 각 기관별 데이터 가시성 변화에 주의 (다른 기관에서 목록 안 보이는 혼동 발생)
- RequestMaintenance/RequestAnalysis는 EVManufacturer 권한이 비즈니스상 맞음 (Passport 세션 확인)
- 외부 레포(claw-code, system-prompts)는 블록체인 세션에 직접 적용할 내용 없음

## Session 1 continued (2026-04-07)

### 작업 내용
- EVManufacturer RBAC 완화: MANUFACTURED 상태 여권도 조회 가능하도록 변경
  - `buildPassportQuery` — EVMfg 쿼리에 MANUFACTURED OR 조건 추가
  - `checkPassportAccess` — EVMfg에 MANUFACTURED 상태 접근 허용
  - 커밋: `6a6a55b`
- evBinderMsp `omitempty` 제거 — Fabric contract API 스키마 검증 오류 해결
  - MANUFACTURED 여권에 evBinderMsp 필드 생략 → required 위반 에러
  - 커밋: `6af5007`
- 체인코드 재배포: v1.1 → v1.2 → v1.3 (sequence 3)
- 재배포 스크립트 `upgrade_chaincode.sh` 작성
- wiki 보충: architecture.md (Fabric 네트워크 상세, 체인코드 함수 분류, RBAC 매트릭스), terminology.md (Fabric 용어 7개)

### 변경 파일
- `chaincode/passport-contract/passport_contract.go` — RBAC 완화 + omitempty 제거
- `upgrade_chaincode.sh` — 체인코드 재배포 자동화 스크립트
- `wiki/common/architecture.md` — Fabric 상세 + RBAC 매트릭스
- `wiki/common/terminology.md` — Fabric 인프라 용어 추가
- `wiki/blockchain/overview.md` — 세션 범위 + 현황 보충

### 미완료
- TPS KPI 달성 작업 (읽기 1500+, 쓰기 150+)
- passport-network/ Fabric 인프라 최적화
- chaincode/ 전체 코드 리뷰 (아직 미착수)

### 교훈
- 체인코드 재배포는 4 peer × (install + approve) + commit = 작업량 많음 → 스크립트 필수
- `omitempty`가 Fabric contract API 스키마 검증과 충돌할 수 있음 — 선택적 필드라도 빈 값은 포함시키는 게 안전
- RBAC 변경 시 닭과 달걀 문제 주의 (EVMfg가 바인딩 전 여권을 봐야 바인딩 가능)
- 배포 스크립트가 없으면 재배포 절차 자체를 잊어버릴 수 있음

<!--
## Session N 템플릿

### 작업 내용
- 

### 변경 파일
- 

### 미완료
- 

### 교훈
- 
-->
