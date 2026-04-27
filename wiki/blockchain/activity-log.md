---
title: "블록체인 세션 활동 로그"
date: 2026-04-06
tags: [blockchain, log]
doc_type: log
status: historical
---
# 블록체인 세션 — 활동 로그

> 과거 기준 기록
>
> 이 문서는 블록체인 세션의 시계열 작업 로그를 보존한다.
> 현재 구조/정책 설명은 [[blockchain/overview|세션 개요]]와 [[blockchain/README|Blockchain 허브]]를 먼저 본다.

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

## Session 1 continued (2026-04-09 #2)

### 작업 내용
- 코드 리뷰 Warning 항목 수정 (W1/W2/W3)
  - W1: RecordBMUData에 EVManufacturerMSP 허용 (M2M 수집 조직 확장)
  - W2: BMUSnapshot에 Temperature, StatusFlags 필드 추가
  - W3: Service 사후 조회 — maintenanceLogs 이력 기반 접근 허용 + $elemMatch 쿼리
- 커밋: `bf3fa2a`
- 체인코드 v1.4 / sequence 4 재배포 완료
- W6(FC 리셋)은 임베디드 세션 FC 시나리오 대기 중

### 변경 파일
- `chaincode/passport-contract/passport_contract.go` — W1/W2/W3 반영
- `wiki/common/architecture.md` — RBAC 매트릭스 업데이트

### 미완료
- W6: FC 리셋 API (임베디드 세션 시나리오 대기)
- TPS KPI 달성 작업
- chaincode 전체 코드 리뷰

### 교훈
- SOH/SOCE는 BMU 데이터가 아닌 분석 결과 → snapshot에 넣을 근거 없음 (설계 의도)
- CouchDB $elemMatch로 배열 내부 필드 검색 가능 — Service 사후 조회에 활용
- upgrade_chaincode.sh 스크립트 덕분에 재배포가 1분 이내로 완료

## Session 1 continued (2026-04-09 #3)

### 작업 내용
- W6: ResetFCForDID 체인코드 함수 구현 및 배포
  - ManufacturerMSP + RegulatorMSP만 호출 가능
  - lastFc 키 삭제 + FCResetLog 감사 로그 기록
  - 커밋: `67508ab`, 체인코드 v1.5 / sequence 5

### 변경 파일
- `chaincode/passport-contract/passport_contract.go` — ResetFCForDID + FCResetLog 구조체 추가, docTypeFCReset 상수 추가

### 미완료
- TPS KPI 달성 작업 (읽기 1500+, 쓰기 150+)
- ResetFCForDID Agent API 엔드포인트 → Passport 세션 담당
- chaincode 전체 코드 리뷰

### 교훈
- FC 리셋은 보안 민감 작업 — 감사 로그 필수 (이전 FC 값, 리셋 사유, 실행자 MSP 기록)
- 임베디드와 블록체인 공동 작업은 ADR로 시나리오/옵션 먼저 정리 후 구현이 효율적

## Session 2 (2026-04-09)

### 작업 내용
- snapshot merge 누락 수정: BatteryPassport에 currentTemperature/currentStatusFlags 추가, merge 1:1 반영
  - 커밋: `6fdd081`, 체인코드 v1.6 / sequence 6 배포
- 2차 코드 리뷰 검증 (7건 중 3건 정확, 2건 부분오류, 2건 수정완료)
  - 리뷰어가 수정 전 코드를 본 것으로 판단

### 변경 파일
- `chaincode/passport-contract/passport_contract.go` — BatteryPassport struct + mergeSnapshot 반영

### 미완료
- TPS KPI 달성 작업
- chaincode 전체 코드 리뷰

### 교훈
- 구조체 필드 추가 시 merge/read path까지 전부 따라가야 함 — 반쪽 수정 주의
- 리뷰어가 보는 코드 버전과 실제 배포 버전이 다를 수 있음 — 동기화 확인 필수

## Session 2 continued (2026-04-10)

### 작업 내용
- 외부 코드 리뷰 2건 검증 (디자인 리뷰 13건, 보안 리뷰 13건)
  - 디자인 리뷰: 13건 중 명확 거짓 4건 (materials 페이지 sync, pageSize 하드코딩, isEV 버그, empty state CTA 미존재)
  - 보안 리뷰: 13건 중 사실 5건, 부분 사실 4건, 거짓/과장 2건, 판정 불가 2건
- 체인코드 보안 수정 5건 (이전)
  - RecordBMUData: DID↔passport 매칭 강제 — passport.DID != did면 거부
  - BindToVehicle: ACTIVE 상태 + 기존 VIN 있으면 재바인딩 거부
  - QueryCredential: checkCredentialAccess RBAC 추가 (연관 passport 접근 권한 확인)
  - GetCredentialHistory: checkCredentialAccess RBAC 추가 (무인증 이력 조회 차단)
  - InvalidateBMURecord snapshot 재계산: Temperature/StatusFlags 누락 보정
- 3차 코드 리뷰 검증 (8건: critical 2, warning 4, suggestion 2)
  - 사실 7건, 부분 사실 1건 — 리뷰 정확도 높음
  - critical 2건은 실질 동일 이슈 (BMU DID lookup privileged 우회)
- 4차 코드 리뷰 검증 (8건: critical 4, warning 4)
  - 거짓 2건: wallet 유출 (.gitignore에 있음, 저장소에 없음)
  - 과장 2건: JWT/Fabric secret fallback — production에서는 서버 시작 거부
  - 사실 4건: register RBAC 체인 (Passport 세션 전달), BMU snapshot 재계산 필드 누락 (수정됨)
- 5차 코드 리뷰 (내부 code-reviewer 에이전트, 18건): critical 3, warning 7, suggestion 8
- 체인코드 보안 수정 6건 (5차 리뷰 반영)
  - C1: CouchDB JSON injection 방지 — sanitizeSelector 헬퍼 추가, 전체 fmt.Sprintf 쿼리(14곳)에 적용
  - C2: VerifyCredentialStatus JSON injection — fmt.Sprintf → json.Marshal struct 교체
  - W2: ResetFCForDID 감사로그 ID 충돌 — timestamp → GetTxID() 교체
  - W3: AddMaintenanceLog 상태 가드 — MAINTENANCE/ACTIVE만 허용
  - W4: RequestAnalysis/SubmitAnalysisResult 상태 가드 — ACTIVE/MAINTENANCE→ANALYSIS, ANALYSIS→결과제출
  - W5: ExtractMaterials/DisposeBattery 상태 가드 — ACTIVE/ANALYSIS→RECYCLING, DISPOSED/MANUFACTURED 거부

### 변경 파일
- `chaincode/passport-contract/passport_contract.go` — DID 매칭 + 재바인딩 방지 + VC RBAC + snapshot 보정 + CouchDB injection 방어 + JSON injection 방어 + 감사로그 ID + 상태 전이 가드 6개 함수

### 미완료
- 체인코드 v1.8 재배포 (위 수정 전체 반영)
- TPS KPI 달성 작업

### 교훈
- 외부 리뷰어가 수정 전 코드를 보고 지적하는 경우가 반복됨 — 리뷰 전 최신 코드 동기화 필수
- CouchDB JSON injection은 fmt.Sprintf 패턴의 구조적 취약점 — 새 쿼리 추가 시 sanitizeSelector 사용 필수
- 상태 전이 가드 없으면 DISPOSED→ACTIVE 같은 비논리적 역전이 가능 — 상태 머신 invariant 필수
- RecordBMUData에서 passport 존재만 확인하고 DID 소유 관계를 안 본 건 실제 논리 결함
- BindToVehicle 재바인딩은 비즈니스 invariant — 코드 리뷰 없었으면 놓쳤을 것

## Session 2 continued (2026-04-13)

### 작업 내용
- 국가과제 1~3차년도 요구사항 vs 체인코드 갭 분석 (ralplan 컨센서스 워크플로우)
  - Planner → Architect → Critic 3단계 리뷰
  - 국가과제 계획서(BMS__.pdf) + 프론트 handoff 문서 기준 누락 항목 전수 점검
- 체인코드 국가과제 갭 필 구현 (총 ~200행 추가)
  - P0: BatteryPassport struct 메타 필드 4개 추가 (manufacturingProcess, disposalMethod, recycledElementContent, extensionInfo)
  - P0: GBA 21 필드 전수 점검 완료 (12개 카테고리 전부 대응)
  - P0: fieldCorrectors 4개 필드 추가 + CorrectPassportData switch 4개 case 추가
  - P1: 규제 검증 상태 필드 4개 추가 (regulatoryVerificationStatus, regulatoryVerifiedAt, regulatoryVerifier, regulatoryEvidenceIds)
  - P1: QueryVerificationsByCredential — VC 검증 이력 조회 (credential별, checkCredentialAccess RBAC)
  - P1: QueryVerificationsByVerifier — 검증자별 검증 이력 조회 (RegulatorMSP only)
  - P1: UpdateRegulatoryVerification — 규제 검증 상태 업데이트 (RegulatorMSP only)
  - P2: PhysicalVerification struct + VerifyPhysicalHistory 함수 (ManufacturerMSP + RegulatorMSP, 고정 signal 키)
  - normalizePassport() 확장 (RecycledElementContent, ExtensionInfo, RegulatoryEvidenceIds)
  - PaginatedVerificationResult struct 추가
  - CouchDB 인덱스 2개 추가 (vcVerification by credential/verifier)
- RBAC 매트릭스 업데이트 (architecture.md)

### 변경 파일
- `chaincode/passport-contract/passport_contract.go` — struct 확장 + 신규 함수 4개 + CorrectPassportData 확장
- `chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexVCVerificationByCredential.json` — 신규
- `chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexVCVerificationByVerifier.json` — 신규
- `wiki/common/architecture.md` — RBAC 매트릭스 4행 추가

### 미완료
- 체인코드 v1.8 재배포 (보안 수정 11건 + 국가과제 갭 필 전체 반영)
- TPS KPI 달성 작업
- Passport 세션 handoff: 신규 4개 함수에 대한 bmu-agent API 라우트 추가 요청

### 교훈
- 프론트와 체인코드 개발 phase mismatch가 발생 — 프론트가 먼저 슬롯 만들면 체인코드 갭이 즉시 가시화됨
- CreateBatteryPassport 시그니처 변경 대신 CorrectPassportData 사후 설정이 하위 호환 유지의 핵심
- omitempty 컨벤션은 struct 전체에서 일관성 유지해야 — 혼용 시 프론트에서 필드 존재/부재 혼동
- Architect 리뷰에서 PhysicalVerification nil 초기화 금지 지적이 실제 함정 방지에 유효

## Session 2026-04-18: Sentinel 3차 리뷰 대응 + C3 git history 정리

### 작업 내용
- Sentinel 3차 리뷰 블록체인 범위 16건 전부 수정 (P0~LOW)
- 3차 리뷰 C3 git history 정리: filter-repo로 시크릿 제거
- 전 세션(블록체인/배터리여권/임베디드/MCP) 합동 작업

### 변경 파일
**P0 (크레덴셜 env화)**
- `passport-network/compose/compose-couch.yaml`, `compose-ca.yaml`
- `passport-network/network.sh`, `.env.template`
- `start_passport_network.sh`
- `scripts/tps-benchmark*.js`
- `.gitignore`

**P1 (결정성 + timing-safe)**
- `chaincode/passport-contract/helpers.go` (txTimestamp 시그니처 변경)
- `chaincode/passport-contract/{bmu_tx,passport_tx,vc_tx,query}.go` (30개 호출자 수정)
- `cloud-agent/server.js` (timingSafeEqual)

**P2+MEDIUM+LOW**
- `cloud-agent/server.js` (CORS, 127.0.0.1 bind, fatal sanitize)
- `cloud-agent/services/fabric-listener.js`, `initial-sync.js` (TLS 강제, trustedRoots 파일)
- `passport-network/compose/docker/peercfg/core.yaml` (TLS 기본 true)
- chaincode `sanitizeSelector` → `buildQuery` (json.Marshal) 10곳 전환
- `.env.example` 템플릿 (cloud-agent)

### 커밋 + history 정리
- 3개 커밋으로 보안 수정 완료
- `git filter-repo`로 `adminpw`, `change-me-in-production`, DID seed, wallet key 전 history 제거
- `cloud-agent/.env` 파일 history 완전 제거
- 불필요 브랜치 4개 원격 삭제 (feature/react-rebuild, fix/sentinel-review-round1 등)
- 백업: `master-backup-pre-filterrepo`

### 미완료 / 후속 작업
- Risk-acceptance 4건 (C6 namespace, H9 Docker socket, H11 base TLS, 컨테이너 root)
- 배터리여권 세션이 bmu-agent/.env 재생성 후 E2E 재검증 (block 아닌 후속)

### 추가 수행 — 같은 세션 내 2차 사이클 (2026-04-18 후반)

#### filter-repo 부작용 복구 (전 세션 합동)

filter-repo가 `adminpw`, `change-me-in-production` 등을 `REMOVED_SECRET_ROTATED_2026_04_18`로 자동 치환한 부작용을 전 세션이 협업하여 복구:

- **블록체인 세션**: `start_all.sh` ACAPY_SEED/ACAPY_WALLET_KEY fallback 제거, `docs/ARCHITECTURE.md` 표 정정, `wiki/decisions/003-mcp-monitor-read-only.md` 맥락 정리 (커밋 `5308b11`)
- **임베디드 세션**: `firmware/tools/serial_to_agent.py:11` docstring 예시 복구 (커밋 `c913f37`)
- **MCP 세션**: `mcp-monitor/.env.example:10` dead var `FABRIC_ADMIN_SECRET` 완전 삭제 (ADR 003 read-only 원칙에 맞춰 삭제 채택) (커밋 `20e676b`)
- **배터리여권 세션**: `bmu-agent/config/fabric.js` fallback 제거, `.env.example` placeholder 정리, `e2e-tests/auth-fixture.js` 신규로 e2e 14개 파일 env 기반 credential 전환 (커밋 `f118767`, `98a3801`, `51a98b2`, `c72ba9b`, `7b7bf69`)

검증: `REMOVED_SECRET_ROTATED_2026_04_18` 등 3종 치환 문자열 잔존 0건 (activity-log 제외)

#### 시크릿 실제 로테이션 완료

- `passport-network/.env`, `cloud-agent/.env` 생성 (git-ignored)
- `openssl rand -hex 24/32`로 강력한 랜덤 값 생성
- 네트워크 재기동 + 5개 Fabric CA에 `fabric-ca-client identity modify`로 admin 비밀번호 실제 변경
- 검증: 옛 `admin:adminpw` enroll 시도 → Error Code 20 (Authentication failure)로 거부 확인
- 새 크레덴셜로 `testmfg / testpass123` 테스트 사용자 등록 완료 (ManufacturerMSP)
- 세션 간 공유는 `.omc/secrets-rotation-2026-04-18/shared-secrets.txt` (chmod 600, gitignored) 파일 경유 패턴 확립

#### 원격 브랜치 정리

- `origin/master-backup-pre-filterrepo` 삭제 (롤백 불필요 확정)
- 원격 브랜치 `master` 단일화

### 교훈 추가

- CA 비밀번호 로테이션은 `identity modify`가 DB 재생성보다 안전 — 기존 peer MSP/orderer MSP 인증서 영향 없음
- 평문 시크릿을 채팅에 노출하는 건 나중에 발견해도 되돌릴 수 없음 — 처음부터 gitignored 파일 경유 패턴 사용 권장 (배터리여권 세션 지적이 옳았음)
- filter-repo는 "과거에 시크릿이었던 문자열"을 치환하므로, 해당 문자열이 **코드 fallback, 테스트 값, 문서 예시**에 참조돼 있으면 실제 동작을 깨뜨림 — 사전에 grep으로 참조 위치 식별 필요
- MCP 세션의 "adversarial probe" (단순 가이드 수용이 아닌 실제 코드 사용 여부 검증) 패턴이 전 세션에 확산되면 리뷰 품질 향상

### 교훈
- filter-repo는 `--refs master` 로 특정 브랜치만 재작성하고 백업 브랜치 보존 가능 — 롤백 안전성 확보
- LevelDB → CouchDB 전환 시 write TPS 급락은 snapshot PutState 제거 + 보증 정책 완화로 회복 가능 (93.8 → 173.1 TPS)
- 여러 세션이 병렬 작업하는 monorepo에서는 lock-and-coordinate 절차가 필수 (한 명이 history 재작성 시 다른 세션 push 일시 중지)
- Risk acceptance 문서화가 리뷰 사이클 축소에 유효 — "이미 평가됨" 표시

## Session 2026-04-20: 네트워크 재기동 + /api/passports 500 디버깅 2계층

### 작업 내용
- Docker Desktop WSL hang 재발 → taskkill + 재기동 playbook 반복 적용 (이전 세션과 동일 증상)
- 전체 Fabric 네트워크 재기동 (compose-net + **compose-couch** + compose-ca)
- VON Network 재기동 (Indy 4노드 + webserver)
- 배터리여권 세션이 보고한 `GET /api/passports` 500 간헐적 에러 2계층 디버깅 + 수정
- Docker 대청소 (컨테이너 57→24, 이미지 64→52, 구버전 체인코드 16종 삭제)

### 변경 파일
- `passport-network/network.sh` (`COMPOSE_FILE_COUCH` 상수 추가, networkUp/networkDown 양쪽에 CouchDB 포함)
- `chaincode/passport-contract/query.go` (9개 Query 함수의 nil slice → empty slice 초기화)

### 커밋
- `d0956a6` — fix(blockchain): network.sh에 compose-couch.yaml 기본 포함
- `1f02568` — fix(chaincode): Query 함수 nil slice → empty slice 초기화 (체인코드 v2.0 업그레이드)

### 핵심 발견

**Layer 1: peer가 LevelDB로 떠 있었음**
- 증상: `ExecuteQueryWithMetadata not supported for leveldb` (peer 로그)
- 원인: `start_passport_network.sh` → `network.sh up` 흐름에서 compose-couch.yaml 누락. peer가 기본 LevelDB로 가동 → rich query 실패
- 수정: network.sh에 compose-couch 기본 포함
- 검증: `docker exec peer0.* env | grep CORE_LEDGER_STATE_STATEDATABASE` 로 CouchDB 확인

**Layer 2: Go nil slice 버그**
- 증상: peer가 CouchDB로 전환돼도 500 유지
- 실제 에러 메시지 (구조화 로그 추가 후): `"return.records: Invalid type. Expected: array, given: null"`
- 원인: Query 함수들이 `var records []*Type`(nil slice)를 반환 → 빈 결과 시 JSON `null` → Fabric contract-api-go response schema validation 실패
- 수정: 9개 함수 일괄 `records := []*Type{}` (sed 치환)
- 체인코드 v2.0 배포 후 `GET /api/passports?pageSize=5` → 200 `{"records":[],"bookmark":"nil","count":0}`

### 미완료 / 후속
- 없음 (blockchain 세션 범위는 완료)

### 교훈
- **배터리여권 세션의 구조화 에러 로그 추가가 결정적** — 라우트 catch에서 에러 swallow하면 원인 추적 불가
- **Fabric contract API JSON schema는 런타임 검증** — Go에선 문제없던 nil slice가 JSON 직렬화 경계에서 터짐
- **network.sh는 compose 파일 리스트 전수 확인** — networkUp/networkDown 양쪽 모두 수정해야 down -v 시 CouchDB 볼륨도 정리됨
- WSL2 Docker Desktop hang은 재발 가능 — playbook 기록해두면 다음에 빠르게 복구

## Session 2026-04-22: 네트워크 재기동 트러블슈팅 + 재부트스트랩 경로 복구

### 작업 내용
- 도커 콜드 재기동 후 `start_all.sh` 기동 실패 디버깅 (초기 증상: orderer MSP 로드 panic)
- `./network.sh down` 으로 조직 crypto 일괄 정리 후 재기동 시 재부트스트랩 경로가 완전히 깨져 있음을 확인
  - **근본 원인 1**: 2026-03-27 `00c9987` (임베디드 CRC/TRNG 변경) 커밋이 `passport-network/organizations/` 4개 필수 파일을 부수적으로 삭제 → 25일간 잠재
    - `registerEnroll.sh`, `ccp-generate.sh`, `ccp-template.json`, `ccp-template.yaml`
    - `createOrgs()` 는 `organizations/peerOrganizations` 디렉토리가 없을 때만 호출되기 때문에, 기존 crypto 를 얹어 재기동하는 한 발견 불가 — `down` 이 방아쇠
  - **근본 원인 2**: 2026-04-18 CA 시크릿 rotation 설계가 반쪽 구현
    - `.env` 에만 `ca-admin:<hex>` 기록하고 `fabric-ca-server-config.yaml` 의 `registry.identities: admin/adminpw` 는 그대로 둠
    - fabric-ca-server 는 `registry.identities` 가 존재하면 compose 의 `-b` flag 를 무시 → DB 가 초기화될 때마다 `admin:adminpw` 로 원복
    - rotation 시도 2 (`registry.identities: []` 로 비우고 `-b` flag 의존) 도 실패 — v1.5.17 은 빈 리스트로 들어와도 `-b` 를 identity 로 병합하지 않음
- 실용적 복구 경로 채택
  - `registerEnroll.sh` 를 `cae71e5` 기준으로 복원 + filter-repo 치환문 정리 (`${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}` 로 9 군데, `adminpw` 로 4 군데)
  - `ccp-generate.sh` / 템플릿 2 개 동일 방식 복원
  - `.env` 를 `admin:adminpw` 로 되돌리고 TODO 주석 추가 (`identity modify` 를 post-up 로 통합하는 후속 과제 명시)
  - 5 개 CA 의 `fabric-ca-server-config.yaml` 을 docker fabric-ca init 의 기본 템플릿으로 재생성 후 git 추적 대상으로 전환
- 재기동 검증: Fabric 4 peer + orderer + 5 CA + 4 CouchDB 정상, chaincode v2.0 배포, Agent `/api/status` `fabric:connected`

### 변경 파일
- `passport-network/organizations/registerEnroll.sh` — 복원 + CA admin enroll URL 을 `.env` 참조로 교체
- `passport-network/organizations/ccp-generate.sh` — 복원
- `passport-network/organizations/ccp-template.json` — 복원
- `passport-network/organizations/ccp-template.yaml` — 복원
- `passport-network/organizations/fabric-ca/{evmanufacturer,manufacturer,ordererOrg,regulator,service}/fabric-ca-server-config.yaml` — fresh default 로 재작성 후 git 추적
- `.gitignore` — `passport-network/organizations/fabric-ca/*/` 블랭킷 무시를 `msp/·ca-cert.pem·tls-cert.pem·fabric-ca-server.db·Issuer*Key` 로 쪼개 config.yaml 은 추적
- `passport-network/.env` — `CA_ADMIN_USER/PASSWORD` 를 `admin/adminpw` 로 원복 + rotation 제약 TODO 주석

### 커밋
- `4cc246d` — fix(blockchain): restore registerEnroll.sh / ccp-generate.sh — 네트워크 재부트스트랩 경로 복구
- `e461e7e` — chore(blockchain): track fabric-ca-server-config.yaml, keep runtime artifacts ignored

### 미완료 / 후속
- CA bootstrap 시크릿 실제 rotation: `start_passport_network.sh up` 다음에 `fabric-ca-client identity modify` 로 `admin` → 강한 랜덤 비밀번호 교체하는 단계 추가. 동일 값을 `.env` 에 주입해 downstream 에서 사용 (commit 된 config.yaml 값과 실제 런타임 비밀번호를 분리)
- Docker Desktop WSL 콜드 기동 직후 bind mount race 로 orderer MSP 로드 실패하는 패턴은 지난 2026-04-20 과 동일 — playbook 이 유효함을 재확인

### 교훈
- **`network.sh down` 은 `organizations/peerOrganizations` / `ordererOrganizations` 를 물리 삭제한다** — 이 순간에만 `createOrgs()` 재경로가 실제로 실행되므로 registerEnroll.sh 같은 의존 스크립트 누락이 이때만 폭발. 테스트 관점에서 "정상 재기동" 은 잠재 버그를 가릴 수 있다
- **대규모 커밋의 `git status --porcelain=v1 --find-renames=100%` 검토** — 00c9987 커밋이 임베디드 변경 외에 `passport-network/organizations/*.sh`, `compose/*.yaml`, `scripts/*.sh` 등 네트워크 인프라 파일을 대량 삭제했다. 향후 대형 삭제 blast radius 는 리뷰 게이트 필요
- **fabric-ca `-b` flag 는 registry.identities 와 배타적이지 않다** — 문서와 달리 v1.5.17 은 `identities` 가 존재하면 (빈 리스트 포함) `-b` 를 bootstrap 으로 쓰지 않는다. rotation 을 원하면 실제 동작을 실험으로 확인 후 설계해야
- **잠재 버그는 "중간 커밋" 으로 격리** — Commit 1 (파일 복원) 은 명백한 fix 라 바로 세이프 포인트. Commit 2 시도가 실패하면 되돌리기만 하면 1 은 유지. 두 단계 분리 덕분에 rotation 실험 실패해도 핵심 복구는 보존됨

### 후속 — 같은 세션 내 벤치마크 재현

- 기동 검증 후 Caliper 실행 → Round 0 에서 `EndorseError: 10 ABORTED` + `x509: ECDSA verification failure` 대량 발생
  - **근본 원인 3 (명명): Docker named volume 생존** — `compose_orderer.battery.com` / `compose_peer0.*.battery.com` 등 오더러·피어의 ledger 데이터 볼륨이 `docker compose down --volumes` 의 anonymous volume 제거 범위를 벗어나 생존
  - 결과적으로 매 재기동마다 새 CA crypto 는 생성되지만 **오더러는 옛 제네시스 블록(옛 MSP 임베드)** 을 유지 → 피어가 채널 join 시도 → 채널 이미 존재, MSP 불일치, x509 검증 실패
  - 해결: `docker volume rm compose_orderer.battery.com compose_peer0.{manufacturer,evmanufacturer,service,regulator}.battery.com` 로 5 개 명시 삭제 후 `start_all.sh` 재실행
- bmu-agent / cloud-agent `.env` 의 `FABRIC_ADMIN_SECRET` 도 2026-04-18 rotation hex 잔재 — `adminpw` 로 되돌림
- bmu-agent / cloud-agent 의 `wallet/` 디렉토리도 옛 CA 로 enroll 된 identity 가 잔존 → 전체 삭제 후 재enroll
- cloud-agent block listener 는 MongoDB `_sync_meta` 컬렉션의 `lastBlock` 체크포인트에서 재개. ledger 가 초기화된 후 옛 block number(1960) 를 찾아 `TypeError: null.toNumber()` crash — `_sync_meta` 컬렉션 비우고 재기동해야 block 0 부터 정상 재동기화

### KPI 측정 결과 (2026-04-22)

| KPI | 목표 | 측정값 | 경로 |
|-----|------|--------|------|
| 쓰기 TPS | 150 | **194.9** | Caliper `benchconfig.yaml` (15 worker × fixed-rate 200, NUM_PASSPORTS=500, 1-of-4 endorsement) |
| 읽기 TPS | 1,500 | **1,810.2** | `scripts/tps-benchmark-cloud.js` → cloud-agent `:3002` → MongoDB (concurrency 200, total 5000) |

측정 조건 상세 및 재현 절차는 [[blockchain/benchmark-methodology|벤치마크 측정 방법론]] 참조.

### 추가 커밋
- `65d2634` — docs(blockchain): activity-log 2026-04-22 — 재부트스트랩 경로 복구 세션 기록 (중간 snapshot)
- `cdc473c` — perf(blockchain): deployCC 에 -ccep 1-of-4 OR endorsement 복원 — 쓰기 KPI 재달성

### 추가 교훈
- **Docker named volume 은 `docker compose down -v` 를 이겨낸다** — 오더러·피어의 ledger 데이터 볼륨은 이름이 지정돼 있으면 anonymous volume 제거 대상이 아니다. network.sh down 이 이를 명시적으로 제거하지 않으면 crypto 는 새로 만들어도 채널 상태는 유지된다. `down` 보강 필요 (향후 네트워크 완전 리셋 시 `docker volume rm compose_orderer.* compose_peer0.*` 명시 필수)
- **rotation 후 .env / wallet 을 공유하는 모든 컴포넌트 업데이트 필요** — passport-network/.env, bmu-agent/.env, cloud-agent/.env 세 개 모두 `FABRIC_ADMIN_SECRET` 가지고 있음. 한쪽만 고치면 다른 쪽이 auth failure 로 중단
- **cloud-agent block listener 의 checkpoint 재개 안정성 취약** — ledger 가 wipe 되면 `_sync_meta.lastBlock` 도 함께 비워야 한다. 방어 코드로 NOT_FOUND 응답 받으면 0부터 재시작 fallback 필요
- **KPI 측정은 Caliper 의 Throughput 컬럼이 공식 수치** — (성공+실패)/elapsed 가 Caliper Throughput 정의. "실효 성공 TPS" 는 별도 파생 지표. 이전 세션의 173.1 TPS 도 동일 정의


---

## Session 2026-04-27 (chaincode 계약 감사)

### 의도

velkern-brand-assets 브랜치 UI 대수정 후 패스포트 세션이 "엔드포인트는 있는데 validation/RBAC/evidence 갭" 을 지목. 블록체인 세션은 chaincode 영역만 정확히 갭 분석.

### 산출물

- [[blockchain/chaincode-contract-audit-2026-04-27|chaincode 계약 감사 보고서]] — UI 40+ action 모두 chaincode 함수 매핑 확인, 미지원 0건. 부분 지원/하드닝 갭 16건 식별, P0/P1/P2 우선순위 배정.

### 핵심 결론

- **기능 미지원 0건**. UI/agent 의 모든 mutation/query 에 대응 chaincode 함수 존재.
- **P0**: `CorrectPassportData` 의 ownership 미검증 — Manufacturer/EVManufacturer 가 임의 여권의 자기 권한 필드를 수정 가능. fieldCorrectors 가 MSP 종류만 보고 CreatorMSP/EvBinderMSP 일치를 확인하지 않음.
- **P1 다수**: RequestMaintenance/RequestAnalysis/AddAccidentLog/IssueCredential 도 동일 패턴(MSP 종류만 체크, ownership 누락). SubmitAnalysisResult 의 SOH/SOCE 범위 검증 부재. CreateBatteryPassport 의 음수 값 허용.
- **P2**: SetEvent 미사용, BMU/CredentialRequest history 래퍼 부재, AccidentLogs 전용 query 부재 (passport 전체 페이로드 비대화 위험).

### 수정 미실시

이번 세션은 read-only 갭 분석. chaincode patch 는 다음 세션에서 P0-1 부터 진행 권고.

### 후속 — chaincode P0/P1 hardening 패치 (같은 세션 후반)

감사 보고서 commit 직후 동일 세션에서 실제 코드 패치 진행. velkern-brand-assets 브랜치(프론트 작업 진행 중) 위에 chaincode 만 명시적으로 staged commit.

| commit | 범위 | 영향 함수 |
|--------|------|-----------|
| `4f2bb88` | P0-1 GAP-RBAC-1 | CorrectPassportData ownership 분기 (Manufacturer→CreatorMSP, EVManufacturer→EvBinderMSP) |
| `77321e2` | P1-1~4 GAP-RBAC-2/3/4/5 | RequestMaintenance, RequestAnalysis, AddAccidentLog, IssueCredential ownership 검증 |
| `6ef5633` | P1-5,6 GAP-VAL-1/2 | CreateBatteryPassport 음수 차단(7개 필드), SubmitAnalysisResult soh/soce [0,100] 범위 |

각 commit 마다 `go vet ./... && go build` 통과 확인.

#### KPI regression 미실시

본 세션에선 caliper 재측정 미수행. 5개 mutation 함수에 RBAC 분기/조건문 추가 → write TPS 영향 가능. 다음 세션에서 caliper write/read regression 권고. 영향 미미할 것으로 예상하나 (분기 비용은 마이크로초 미만), 객관 수치로 확인 필요.

#### 미실시 P2 (백로그)

- P2-1 (AddMaintenanceLog 매핑 정책) — UI 흐름 결정 선행 필요
- P2-2 (CreateBatteryPassport serialNumber mandatory) — 1줄 수정 가능
- P2-4 (ExtractMaterials recyclingRates 범위)
- P2-5 (SetRecycleAvailability DISPOSED 가드)
- P2-6 (SetEvent 추가) — 외부 통합 영향, 별도 설계
- P2-7 (BMU/CredentialRequest history wrappers) — 새 query 함수
- P2-8 (QueryAccidentsByPassport) — 페이지네이션 query 신규

#### 다음 세션 권고

1. caliper regression 측정으로 KPI 영향 확정
2. P2 small bundle (P2-2/4/5) 일괄 처리
3. P2-6/7/8 는 설계 논의 후 별도 PR

### 후속 — Stage 1/2 머지 인지 + wiki §2.1 부록 (같은 세션 후반)

Passport 세션이 §5.1 sync 책임 분담대로 Stage 1/2 머지 완료. blockchain 측은 wiki §2.1 informational 부록만 추가하고 caliper 세션 진입 대기.

| commit | 영역 | 내용 |
|--------|------|------|
| `b9acaf7` | blockchain | docs: §5.1 sync 책임 분담 명시 |
| `cbd2304` | blockchain | fix: ExtractMaterials JSON prefix 통일 (BREAKING — agent middleware sync required) |
| `ed2b977` | Passport | feat: bmu-agent chaincode 에러 매핑 미들웨어 + 7 route 통일. 헤더 `// synced from chaincode-error-contract.md @cbd2304` 박힘 |
| `d8d1f1c` | Passport | feat: webapp 한국어 토스트 dictionary + ApiError + 4 mutation 페이지 통일. 동일 SHA sync |

§5.1 운영 규칙 검증:
- BREAKING commit (`cbd2304`) 메시지에 표식 명시 → Passport 가 grep 으로 인지 → 미들웨어가 §3.6 예외 분기 1줄 단축 적용. 운영 규칙 의도대로 동작.
- 미들웨어 헤더 `Sync history:` 섹션이 commit chain 추적 가능하게 박힘 (운영 규칙 3 충실 이행).

#### wiki §2.1 부록 추가 (informational)

ed2b977 미들웨어가 처리하는 Fabric wrap prefix 4종 (`Failed to evaluate transaction:` / `Failed to submit transaction:` / `transaction returned with failure:` / `error in simulation:`) 과 반복 strip 패턴을 wiki §2.1 에 informational 로 옮김. 진실 공급원은 미들웨어 코드, wiki 는 cross-check 용 reference.

#### 다음 caliper 세션 시 진입 절차

1. `wiki/blockchain/activity-log.md` 에 "Session 2026-04-XX caliper start" 마커 commit (Passport Stage 3 진행 신호)
2. caliper write/read regression baseline 측정 (P0/P1 패치 후 첫 측정)
3. 결과 동일 activity-log 에 commit
4. KPI 안전 마진 확인되면 P2 small bundle (P2-2/4/5) 묶음 PR 진행
5. P2-6 (SetEvent) 진행 시 baseline → SetEvent 전후 비교 측정 의무

---

## Session 2026-04-27 caliper start

P0/P1 chaincode 패치 (4f2bb88 ~ cbd2304) 가 적용된 후 첫 KPI regression 측정.

### 측정 전 상태

- Fabric 4-org + couchdb + ca + orderer 모두 5일 기동 유지 (재기동 없음)
- 현재 deploy 된 chaincode container hash `18a2a36d437b...` 는 P0 commit (KST 16:00) 보다 **3시간 먼저 기동** 된 `dev-peer0-*-passport-contract` 컨테이너 — 즉 패치 이전 binary. 패치 적용본 측정 위해 redeploy 선행 필요.
- bmu-agent / cloud-agent 정상 응답 확인

### 측정 항목

1. caliper write KPI (RecordBMUData, NUM_PASSPORTS=500, 1-of-4 OR endorsement) — 목표 150 TPS, 이전 측정 194.9 TPS
2. cloud-agent HTTP read KPI — 목표 1500 TPS, 이전 측정 1810.2 TPS

### 트리거 — Passport Stage 3

본 마커 commit push 후 Passport 측 e2e 거부 케이스 픽스처 (a85c6e1) 실행 가능.
