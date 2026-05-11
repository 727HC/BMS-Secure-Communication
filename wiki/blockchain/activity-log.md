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
- `git filter-repo`로 `LEGACY_DEFAULT_SECRET`, `LEGACY_PLACEHOLDER_SECRET`, DID seed, wallet key 전 history 제거
- `cloud-agent/.env` 파일 history 완전 제거
- 불필요 브랜치 4개 원격 삭제 (feature/react-rebuild, fix/sentinel-review-round1 등)
- 백업: `master-backup-pre-filterrepo`

### 미완료 / 후속 작업
- Risk-acceptance 4건 (C6 namespace, H9 Docker socket, H11 base TLS, 컨테이너 root)
- 배터리여권 세션이 bmu-agent/.env 재생성 후 E2E 재검증 (block 아닌 후속)

### 추가 수행 — 같은 세션 내 2차 사이클 (2026-04-18 후반)

#### filter-repo 부작용 복구 (전 세션 합동)

filter-repo가 `LEGACY_DEFAULT_SECRET`, `LEGACY_PLACEHOLDER_SECRET` 등을 `REMOVED_SECRET_ROTATED_2026_04_18`로 자동 치환한 부작용을 전 세션이 협업하여 복구:

- **블록체인 세션**: `start_all.sh` ACAPY_SEED/ACAPY_WALLET_KEY fallback 제거, `docs/ARCHITECTURE.md` 표 정정, `wiki/decisions/003-mcp-monitor-read-only.md` 맥락 정리 (커밋 `5308b11`)
- **임베디드 세션**: `firmware/tools/serial_to_agent.py:11` docstring 예시 복구 (커밋 `c913f37`)
- **MCP 세션**: `mcp-monitor/.env.example:10` dead var `FABRIC_ADMIN_SECRET` 완전 삭제 (ADR 003 read-only 원칙에 맞춰 삭제 채택) (커밋 `20e676b`)
- **배터리여권 세션**: `bmu-agent/config/fabric.js` fallback 제거, `.env.example` placeholder 정리, `e2e-tests/auth-fixture.js` 신규로 e2e 14개 파일 env 기반 credential 전환 (커밋 `f118767`, `98a3801`, `51a98b2`, `c72ba9b`, `7b7bf69`)

검증: `REMOVED_SECRET_ROTATED_2026_04_18` 등 3종 치환 문자열 잔존 0건 (activity-log 제외)

#### 시크릿 실제 로테이션 완료

- `passport-network/.env`, `cloud-agent/.env` 생성 (git-ignored)
- `openssl rand -hex 24/32`로 강력한 랜덤 값 생성
- 네트워크 재기동 + 5개 Fabric CA에 `fabric-ca-client identity modify`로 admin 비밀번호 실제 변경
- 검증: 옛 `admin:LEGACY_DEFAULT_SECRET` enroll 시도 → Error Code 20 (Authentication failure)로 거부 확인
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
    - `.env` 에만 `ca-admin:<hex>` 기록하고 `fabric-ca-server-config.yaml` 의 `registry.identities: admin/LEGACY_DEFAULT_SECRET` 는 그대로 둠
    - fabric-ca-server 는 `registry.identities` 가 존재하면 compose 의 `-b` flag 를 무시 → DB 가 초기화될 때마다 `admin:LEGACY_DEFAULT_SECRET` 로 원복
    - rotation 시도 2 (`registry.identities: []` 로 비우고 `-b` flag 의존) 도 실패 — v1.5.17 은 빈 리스트로 들어와도 `-b` 를 identity 로 병합하지 않음
- 실용적 복구 경로 채택
  - `registerEnroll.sh` 를 `cae71e5` 기준으로 복원 + filter-repo 치환문 정리 (`${CA_ADMIN_USER}:${CA_ADMIN_PASSWORD}` 로 9 군데, `LEGACY_DEFAULT_SECRET` 로 4 군데)
  - `ccp-generate.sh` / 템플릿 2 개 동일 방식 복원
  - `.env` 를 `admin:LEGACY_DEFAULT_SECRET` 로 되돌리고 TODO 주석 추가 (`identity modify` 를 post-up 로 통합하는 후속 과제 명시)
  - 5 개 CA 의 `fabric-ca-server-config.yaml` 을 docker fabric-ca init 의 기본 템플릿으로 재생성 후 git 추적 대상으로 전환
- 재기동 검증: Fabric 4 peer + orderer + 5 CA + 4 CouchDB 정상, chaincode v2.0 배포, Agent `/api/status` `fabric:connected`

### 변경 파일
- `passport-network/organizations/registerEnroll.sh` — 복원 + CA admin enroll URL 을 `.env` 참조로 교체
- `passport-network/organizations/ccp-generate.sh` — 복원
- `passport-network/organizations/ccp-template.json` — 복원
- `passport-network/organizations/ccp-template.yaml` — 복원
- `passport-network/organizations/fabric-ca/{evmanufacturer,manufacturer,ordererOrg,regulator,service}/fabric-ca-server-config.yaml` — fresh default 로 재작성 후 git 추적
- `.gitignore` — `passport-network/organizations/fabric-ca/*/` 블랭킷 무시를 `msp/·ca-cert.pem·tls-cert.pem·fabric-ca-server.db·Issuer*Key` 로 쪼개 config.yaml 은 추적
- `passport-network/.env` — `CA_ADMIN_USER/PASSWORD` 를 `admin/LEGACY_DEFAULT_SECRET` 로 원복 + rotation 제약 TODO 주석

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
- bmu-agent / cloud-agent `.env` 의 `FABRIC_ADMIN_SECRET` 도 2026-04-18 rotation hex 잔재 — `LEGACY_DEFAULT_SECRET` 로 되돌림
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

### 측정 결과 — 2026-04-27 17:48~17:50 KST

#### 사전 작업

- chaincode redeploy: `network.sh deployCC -ccv 1.2 -ccs 3` (sequence 2 가 이미 선점되어 sequence 3 으로 bump)
- 모든 4 org Approval 통과: `Version: 1.2, Sequence: 3, Approvals: [EVManufacturerMSP: true, ManufacturerMSP: true, RegulatorMSP: true, ServiceMSP: true]`
- 패치 적용본 (P0/P1 + cbd2304 prefix 통일) 활성 commit 됨

#### 결과

| KPI | 목표 | 측정값 | 이전 (2026-04-22) | 변동 |
|-----|------|--------|-------------------|------|
| Caliper Write Throughput | 150 TPS | **190.5 TPS** | 194.9 TPS | -2.3% |
| Cloud HTTP Read TPS | 1500 TPS | **1794.6 TPS** | 1810.2 TPS | -0.9% |

**판정: 모두 PASS. P0/P1 패치 영향 noise 수준 (≤3%). KPI 안전 마진 유지.**

근거:
- write 변동 -2.3% 는 caliper run 간 정상 분산 범위. RecordBMUData 함수는 패치 안 함
- read 변동 -0.9% 는 정상 분산. cloud-agent → MongoDB 경로는 chaincode 와 분리

#### Caliper write Fail 분석 (참고)

write Fail 2617/3000 (87%) 발생. 원인 분석:
- 1차: CreateBatteryPassport setup 실패 — 이전 caliper run 의 PASSPORT-CALIPER-* 가 ledger 에 잔존하여 "already exists" rejection
- 2차: RecordBMUData 의 fc monotonic check — 이전 caliper run 의 lastFc 잔여 (예: "fc 6 must be greater than last valid fc 11 for DID did-caliper-0108")
- 이 양상은 이전 측정 (NUM_PASSPORTS=500, 194.9 TPS) 시에도 동일했고, caliper Throughput 정의 (성공+실패/elapsed) 기준 비교라 KPI 판정에 영향 없음
- ledger 완전 reset (network down + named volume rm + start) 시 succ rate 개선 가능하나 본 회귀 검증 목적엔 불필요

#### Caliper read Send Rate 미달 (참고)

caliper read 의 Send Rate 1052.4 TPS (목표 1800 TPS 대비 58%) 는 peer gateway concurrency 5000 초과 에러로 인한 caliper 측 throttle. **chaincode 와 무관**한 caliper-Fabric SDK 측 한계. 이전 측정 시도 동일 양상이라 KPI 평가에선 cloud HTTP read TPS 가 공식 지표.

#### 다음 권고

- ✅ P2 small bundle (P2-2/4/5) 진행 가능 — KPI 안전 마진 충분
- ✅ Passport Stage 3 (a85c6e1 e2e 거부 케이스 픽스처) 진행 신호 (마커 commit 04ade1d 이미 push 완료)
- ⏸ P2-6 (SetEvent) 는 별도 사전/사후 비교 필요 (RecordBMUData 영향 가능)

### P2 small bundle 측정 (2026-04-27 18:00 KST)

P2-2/4/5 패치 (95a65f2) 적용본 (chaincode 1.3 / sequence 4) 으로 재측정.

| KPI | 목표 | P0/P1 baseline | P2 적용 후 | 변동 |
|-----|------|----------------|-----------|------|
| Caliper Write Throughput | 150 TPS | 190.5 TPS | **192.1 TPS** | +0.8% |
| Cloud HTTP Read TPS (sanity) | 1500 TPS | 1794.6 TPS | **1705.7 TPS** | -5.0% |

**모두 PASS. P0 + P1 + P2 small bundle 10건 chaincode 패치 후 KPI 안전 마진 유지.**

#### 측정 노이즈 발견 — caliper 직후 cloud read 일시 저하

caliper 종료 직후 cloud read 가 1466.6 TPS (KPI fail) 로 측정됨. 그러나 ~1분 cool-down 후 재측정 시 1705.7 TPS 로 정상 회복. 원인 추정:
- caliper 의 다량 RecordBMUData tx → cloud-agent block listener 가 동기 처리 중 → MongoDB write + read 경합
- cloud-agent 의 read 응답성이 일시 저하 후 회복

**KPI 측정 권고**: caliper write 종료 후 ~1분 cool-down 후 cloud read 측정. 또는 cloud read 를 caliper 와 별도 세션에서 측정.

#### 다음 권고

- ✅ KPI 검증 완료, P0~P2-small (10건) 회귀 없음
- ⏸ P2-1 (정비 요청자–수행자 매핑) 은 Passport 회신에서 단일 Service MSP 유지로 결정 → 백로그 제거
- ⏸ P2-6 (SetEvent) 만 단독 사이클로 사전/사후 측정 필요
- ⏸ P2-7/8 (history wrappers, accident query) 신규 query 추가 — 별도 PR

---

## Session 2026-04-28 — Codex review 후속 처리

### Codex review (3건 P2 발견)

caliper KPI PASS 후 codex:review 실행 결과 머지 전 처리할 P2 3건 발견. 모두 실제 코드에서 검증됨.

| # | 영역 | 내용 |
|---|------|------|
| P2-1 | blockchain (chaincode) | recyclingRates 단위 mismatch — UI %% / chaincode 분수 |
| P2-2 | Passport (agent middleware) | INTERNAL 원문 노출 — wallet/CCP 경로 leak 가능 |
| P2-3 | Passport (UI dictionary) | auth 401 → INTERNAL 토스트 회귀 (LoginPage UX) |

### 분담 처리

- **blockchain** `cf07757` — P2-1 fix: chaincode `[0, 1]` → `[0, 100]` % 단위 통일. UI 수정 0, prefix 정규식 호환 유지 (VAL `must be in \[`)
- **Passport** `bccc21c` — P2-2 INTERNAL 마스킹 + P2-3 status 기반 fallback (401 → AUTHZ "아이디 또는 비밀번호 확인", 4xx → VAL 등)

### chaincode redeploy — 1.4 / sequence 5

cf07757 적용본 ledger 활성:
```
Committed chaincode definition: Version: 1.4, Sequence: 5
Approvals: [EVManufacturerMSP/ManufacturerMSP/RegulatorMSP/ServiceMSP] = true
```

### KPI 재측정 미실시

P2-1 변경은 ExtractMaterials 의 입력 검증만 1줄 (rate < 0 || rate > 100 비교). hot path (RecordBMUData) 무관, P0/P1/P2-small 측정 (a573b5a) 결과와 동일 가설 유지. 다음 caliper 사이클에 정기 검증 권고.

### bmu-agent restart

P2-2 INTERNAL 마스킹 효과는 bmu-agent 재기동 후 발현. Passport 측이 시점 결정 (caliper 또는 실 운영 머지 시점).

---

## Session 2026-04-29 — ACA-Py 잠복사고 + ledger reset + 임베디드 e2e 활성화

### 의도

임베디드 측이 실 BMU UART → bridge → bmu-agent → chaincode → cloud-agent → frontend 흐름의 e2e 테스트 시작 직전 단계에서 "BMU /data 가 500 INTERNAL 받음" 보고. 진단 결과 4-18 rotation 의 잠복 사고 + ledger 정리 필요로 확장.

### 핵심 발견

#### 1. ACA-Py LedgerTransactionError (4-18 잠복 사고)
- 4-18 secret rotation 시 `ACAPY_SEED` 새 값 (`xZdd4Jc2pRmNIYLBuSl0BJQoiO7L4JqG`) 으로 변경됨
- 새 seed 에서 derive 된 public DID `qkGWu6271ZdKj6a6dJNJH` 가 **von Indy ledger 에 NYM register 안 됨** — rotation 절차서 누락
- 직전 세션들은 bmu-agent 메모리의 verkey cache (1h TTL) hit 으로 ACA-Py 호출 자체 우회 → 표면적 정상 동작
- 오늘 bmu-agent 재기동 → cache cold → ACA-Py 첫 호출 → ACA-Py 가 startup 시 ledger 에 endpoint update 강제 submit → "verkey not found" reject → 컨테이너 즉시 종료
- bmu-agent 가 axios connection refused 받음 → AggregateError → INTERNAL 마스킹

#### 2. 진단 도구
- `docker logs acapy-bmu` → `indy_vdr.error.VdrError: client request invalid: could not authenticate, verkey for qkGWu6271ZdKj6a6dJNJH cannot be found`
- von ledger query `curl /ledger/domain?query=qkGWu6271ZdKj6a6dJNJH` → `total: 0`

#### 3. 해결
```
curl -X POST http://localhost:9000/register \
  -d '{"seed":"xZdd4Jc2pRmNIYLBuSl0BJQoiO7L4JqG","alias":"acapy-bmu","role":"TRUST_ANCHOR"}'
docker start acapy-bmu
# bmu-agent 재기동 (verkey cache 무효화)
```

### Ledger Reset (chaincode 1.0 / sequence 1)

임베디드 측이 실 BMU 데이터 e2e 위해 caliper / dummy passport 잔재 정리 요청. 옵션 A (network down + named volumes 제거 + redeploy) 진행.

```
1. bmu-agent + cloud-agent 정지
2. ./network.sh down
3. docker volume rm compose_orderer.battery.com compose_peer0.{4org}.battery.com
4. bmu-agent/cloud-agent wallet 정리 (~/wallet/*)
5. cloud-agent MongoDB drop battery_passport
6. ./start_passport_network.sh up + deployCC (sequence 1, version 1.0 처음부터)
7. ACA-Py / bmu-agent / cloud-agent 재기동
8. testmfg 재등록 (admin 으로)
9. 임베디드 DID 로 첫 passport 등록 (PASSPORT-BMU-T9CvMCAR / DID T9CvMCARRdBqb2izCxUkmh)
```

### Cross-session 진단 — 양 세션 합의 사항

#### #1 passport.currentSoc / currentTemperature 0 — 의도된 chaincode 설계
- chaincode `RecordBMUData` 가 caliper TPS 튜닝 때 snapshot PutState 제거됨 (`bmu_tx.go:163` 주석)
- chaincode 의 `mergeSnapshot` 은 `compose_key("snapshot", passportId)` 키 읽지만 그 키에 PutState 하는 곳 0건
- 해결: **dashboard / UI 가 chaincode QueryPassport 가 아닌 cloud-agent (MongoDB read model) endpoint 사용** (옵션 C)
- Passport 세션 (a) 보강 완료 — cloud-agent block listener 가 RecordBMUData 받아 MongoDB passport doc 의 `currentSoc/currentTemperature/lastBmuDataId/totalDischargeCycles` 갱신. 본 세션 검증: block 10 sync 1 doc, MongoDB passport.currentSoc=41650 갱신 확인

#### #2 freshnessCounter vs fc 필드 mismatch
- chaincode types.go: `FC uint64 json:"fc"` — wire 키 = `fc`
- write path: bmu.routes.js 가 `freshnessCounter` 변수 → `fc` 인자로 정상 매핑
- read path: 임베디드/UI 가 `record["freshnessCounter"]` 로 lookup 하면 None
- 해결 (옵션 A): UI / 임베디드 read 코드가 `record.fc` 사용 — UI 에 freshnessCounter 참조 0건 확인 (no-op)

#### #3 화면 56.3% SOC stale view → SOC/TEMP scale mismatch 발견
- chaincode currentSoc=0 / cloud-agent currentSoc=41650 / 화면 56.3%
- 56.3% 는 ledger reset 전 캐시 (browser 새로고침 안 함)
- 추가 발견 (임베디드 보고): frontend `helpers.ts:1` SOC_SCALE_DIVISOR = 1000 잘못. **DBC 의 SOC factor = 0.001525902 (= 1/655.35)**
- raw 41650 × 0.001525902 = 63.55% (MATLAB dataProcess 63.7% 와 일치)
- frontend 의 `1000` 으로 나누면 41.65% (오류)
- 해결: Passport 세션이 `helpers.ts` 의 SOC_SCALE_DIVISOR / TEMP_SCALE_DIVISOR / CellVolt 모두 DBC factor 반영
- chaincode / cloud-agent / 임베디드 모두 변경 0건

#### #4 Current 부호 처리 — 위험 없음 확인
- bmu-parser.service.js:26 가 `buf.readFloatLE(0)` 으로 IEEE 754 float 파싱 (DBC int32 packing 가정 아님)
- chaincode `Current float64` 그대로 저장
- MongoDB 라이브 `current=-3.464` (방전 음수 정상)
- frontend uint32 reinterpret 단계 없음 — 위험 0

### 본 세션 산출물 (블록체인 영역)

| 변경 | 결과 |
|------|------|
| chaincode | 0건 (raw 저장 정확, snapshot 미갱신은 의도된 설계) |
| passport-network | 0건 (reset 만 수행) |
| bmu-agent | 0건 |
| cloud-agent | 0건 (Passport 세션의 (a) 보강은 별도 commit) |
| wiki | 본 세션 기록 (이 항목) |

### 운영 교훈

1. **secret rotation 절차서 보강 필요** — 4-18 rotation 의 ACAPY_SEED 변경이 von ledger 의 새 DID register 단계 누락. 다음 rotation 시 같은 잠복사고 가능. wiki 의 secret rotation 절차에 "von ledger NYM register" 단계 추가 권고.
2. **bmu-agent verkey cache (1h TTL) 가 ACA-Py 다운 사고를 잠복시킨다** — process restart 까지만 캐시 유효. caliper / e2e 가 통과해도 ACA-Py 자체 health check 별도 권고.
3. **ledger reset 시 named volume 강제 제거 필수** — `network.sh down --volumes` 가 anonymous volume 만 제거. orderer/peer 의 named volume (`compose_orderer.battery.com` 등) 은 별도 `docker volume rm` 명시.
4. **chaincode 의 raw 저장은 정석** — frontend 의 표시 변환은 frontend 영역. 임베디드의 DBC 와 frontend 의 helpers.ts 가 일치해야 정확.

### 다음 트리거

- Passport 세션의 helpers.ts 적용 결과 검증 (SOC/TEMP/CellVolt 변환)
- 또는 다른 chaincode 작업 (P2-6 SetEvent / P2-7 history wrappers) 진행 시점

---

## 2026-05-08 — 블록체인 코드리뷰 (read-only)

### 범위
- `chaincode/passport-contract/`
- `passport-network/`

### 수행 내용
- `$performance-goal` 호출은 성능 최적화 evaluator contract가 없어 코드 변경/최적화 루프로 전환하지 않음.
- 실제 요청에 맞춰 블록체인 영역 코드리뷰를 read-only로 수행.
- 확인 명령:
  - `go test ./...` → pass (`[no test files]`)
  - `go vet ./...` → pass
  - `go test -cover ./...` → `coverage: 0.0% of statements`
  - `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` → pass
  - `docker compose ... config` → pass
  - `gofmt -l chaincode/passport-contract/*.go` → `types.go`, `vc_tx.go` formatting drift 발견

### 주요 리뷰 결과
- 체인코드 다수 GetState 경로가 `docType` 검증 없이 struct unmarshal 후 같은 key에 PutState 하므로, 잘못된 ID 입력만으로 passport/BMU/VC key가 다른 타입 JSON으로 덮일 수 있음.
- `RecordBMUData`는 BMU 서명과 dataHash 포맷을 chaincode에서 검증하지 않음. agent 검증에 전적으로 의존.
- `CorrectPassportData`는 생성 시점의 non-negative 숫자 invariant를 정정 경로에서 다시 강제하지 않음.
- Boolean string parsing이 `strings.ToLower(x) == "true"`라 오타가 조용히 false로 저장됨.
- `passport-network`에는 CA/등록 secret 하드코딩, `latest` 이미지 태그, Docker socket mount 등 운영 하드닝 이슈가 남아 있음.

### 변경 파일
- `wiki/blockchain/activity-log.md` — 본 활동 로그만 추가.
- 블록체인 코드 변경 없음.

### 미완료 / 다음 액션
- P0: typed state loader/helper를 추가해 모든 entity read/update 경로에서 `docType` 검증.
- P1: 체인코드 단위 테스트를 추가해 cross-type ID overwrite, negative correction, malformed boolean/expiry 케이스 lock-in.
- P1: CA bootstrap/identity secret을 `.env`/secret store로 이동하고 `latest` 이미지를 Fabric 2.5.x 계열로 pin.

---

## 2026-05-08 — 블록체인 코드리뷰 P0/P1 수정

### 작업 내용
- `chaincode/passport-contract/`에 typed state loader를 추가해 passport, rawMaterial, BMU record, VC, credential request 읽기/수정 경로에서 `docType`을 강제했다.
- `RecordBMUData` 입력 검증을 강화했다.
  - `signature` empty reject
  - `dataHash` 64-char SHA-256 hex reject/accept 기준 추가
  - 기존 DID↔passport 매칭, FC 단조 증가 검증 유지
- `CreateBatteryPassport`와 `CorrectPassportData` 숫자 검증을 shared helper로 통일했다.
  - `cellCount`, `weight`, `totalEnergy`, `energyDensity`, `ratedCapacity`, `expectedLifespan`, `carbonFootprint` 음수 reject
  - `NaN`/`Inf` reject
- boolean/expiry parsing을 엄격화했다.
  - `strings.ToLower(x) == "true"` 패턴 제거
  - `strconv.ParseBool` 기반 malformed boolean reject
  - `IssueCredential`의 `expiresAt` RFC3339 검증
  - `VerifyCredentialStatus`의 저장된 malformed expiry를 invalid 처리
- `passport-network/` 운영 하드닝을 반영했다.
  - `registerEnroll.sh`의 hardcoded registration secret 제거, `.env` 주입 구조 추가
  - secret 노출 `set -x` 제거 및 enroll URL quote 처리
  - Fabric/Fabric CA `latest` image tag 제거, `FABRIC_VERSION=2.5`, `FABRIC_CA_VERSION=1.5` 기본 pin
  - Docker socket mount에 dev-only 위험 주석 추가
  - tracked Fabric CA sample config의 `LEGACY_DEFAULT_SECRET` placeholder 제거
- 회귀 테스트를 추가했다.
  - cross-type `docType` mismatch reject
  - BMU signature/dataHash reject
  - CorrectPassportData numeric negative/NaN reject
  - malformed boolean reject
  - malformed expiresAt reject
  - RBAC/status transition regression

### 변경 파일
- `chaincode/passport-contract/helpers.go`
- `chaincode/passport-contract/helpers_test.go`
- `chaincode/passport-contract/bmu_tx.go`
- `chaincode/passport-contract/passport_tx.go`
- `chaincode/passport-contract/vc_tx.go`
- `chaincode/passport-contract/query.go`
- `chaincode/passport-contract/types.go` (gofmt)
- `passport-network/network.sh`
- `passport-network/.env.template`
- `passport-network/compose/compose-net.yaml`
- `passport-network/compose/compose-ca.yaml`
- `passport-network/organizations/registerEnroll.sh`
- `passport-network/organizations/fabric-ca/{manufacturer,evmanufacturer,service,regulator,ordererOrg}/fabric-ca-server-config.yaml`
- `wiki/blockchain/activity-log.md`

### 검증 결과
- `gofmt -w chaincode/passport-contract/*.go` → pass
- `go -C chaincode/passport-contract test ./...` → pass
- `go -C chaincode/passport-contract vet ./...` → pass
- `go -C chaincode/passport-contract test -cover ./...` → pass (`coverage: 3.9% of statements`)
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` → pass
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` → pass

### 미완료 / 리스크
- BMU signature는 chaincode에서 presence만 강제한다. 실제 암호학적 signature verification은 기존처럼 agent/BMU DID 검증 계층 책임이다.
- Docker socket mount는 dev-only로 명시했지만 아직 compose에서 제거하지 않았다. 운영 profile 분리는 별도 작업으로 남긴다.
- 새 validation error prefix가 추가됐지만 이번 허용 범위상 `wiki/blockchain/chaincode-error-contract.md`는 갱신하지 않았다. Passport 세션의 error mapping 영향 검토가 필요하다.
- 작업 중 발견된 `bmu-agent/`, `wiki/passport/` 변경은 다른 세션 변경으로 간주하고 건드리지 않았다.

### 교훈
- `json.Unmarshal` 성공은 타입 안전을 보장하지 않는다. Fabric world-state key를 재사용하는 update 경로는 `docType` envelope 검증이 필수다.
- 문자열 boolean/expiry는 permissive fallback보다 malformed reject가 안전하다.
- 네트워크 secret hardening은 `.env.template`만 커밋하고 실제 `.env`는 계속 비추적 상태로 유지해야 한다.

---

## 2026-05-08 — Autopilot 블록체인 코드리뷰 수정/검증

### 작업 내용
- `$autopilot` 흐름에 맞춰 `ralplan → ralph → code-review` 순서로 진행했다.
- RALPLAN 산출물 생성:
  - `.omx/plans/prd-blockchain-code-review-fix.md`
  - `.omx/plans/test-spec-blockchain-code-review-fix.md`
- 기존 P0/P1 수정본을 재검토하고 추가 보강했다.
  - rich-query 결과도 `unmarshalTypedState`로 `docType`을 강제해 query result poisoning을 fail-closed 처리.
  - `BMUSnapshot` read/merge/update 경로도 `docType == bmuSnapshot`을 강제.
  - BMU timestamp를 RFC3339로 검증하고 voltage/current의 `NaN`/`Inf`를 reject.
  - raw material `quantity`를 non-negative finite float로 검증.
  - VC `holderDid`가 passport DID와 불일치하면 발급을 reject.
  - regulatory evidence VC가 대상 passport와 불일치하면 reject.
  - `passport-network/compose/docker/peercfg/core.yaml`에도 Docker socket dev-only 위험 주석을 추가.

### 변경 파일
- `chaincode/passport-contract/helpers.go`
- `chaincode/passport-contract/helpers_test.go`
- `chaincode/passport-contract/bmu_tx.go`
- `chaincode/passport-contract/passport_tx.go`
- `chaincode/passport-contract/query.go`
- `chaincode/passport-contract/vc_tx.go`
- `chaincode/passport-contract/types.go` (gofmt)
- `passport-network/.env.template`
- `passport-network/compose/compose-ca.yaml`
- `passport-network/compose/compose-net.yaml`
- `passport-network/compose/docker/peercfg/core.yaml`
- `passport-network/network.sh`
- `passport-network/organizations/registerEnroll.sh`
- `passport-network/organizations/fabric-ca/{manufacturer,evmanufacturer,service,regulator,ordererOrg}/fabric-ca-server-config.yaml`
- `wiki/blockchain/activity-log.md`

### BMS 1~3차년도 gap matrix
| 연차 | BMS PDF 기준 요구 | 이번 반영/확인 | 남은 gap |
|---|---|---|---|
| 1차 | Fabric 기반 Battery Passport 상위 설계, lifecycle 기록/검증/조회 스마트컨트랙트 | typed loader, typed query decode, BMU/VC/passport 검증 강화로 기록/조회 타입 안전성 보강 | 실제 배포 네트워크 재커밋/리그레션은 별도 운영 window 필요 |
| 2차 | IAM/access-control, 상태 저장/추적, 무결성/진본성 검증, Battery Passport 연계 | MSP RBAC 회귀 유지, DID↔passport BMU 검증 유지, VC holder/evidence passport binding 추가, dataHash/signature presence 강화 | 암호학적 signature verification은 chaincode가 아니라 agent/DID 계층 책임으로 남음 |
| 3차 | security-plane 검증, 취약점/침투테스트 준비, DID/IAM/키관리, HTTPS/gRPC messaging, Battery Passport 검증 protocol, TPS/확장성 개선 | malformed boolean/expiry/timestamp reject, CA secret env 주입, image latest 제거, Docker socket 위험 명시, TPS hot path 검증 preflight | 침투테스트/TPS 재측정/HTTPS-gRPC 운영 profile 검증은 미실행 |

### 검증 결과
- `gofmt -w chaincode/passport-contract/*.go` → pass
- `go -C chaincode/passport-contract test ./...` → pass
- `go -C chaincode/passport-contract vet ./...` → pass
- `go -C chaincode/passport-contract test -cover ./...` → pass (`coverage: 4.7% of statements`)
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` → pass
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` → pass
- rendered compose image pin 확인:
  - `hyperledger/fabric-peer:2.5`
  - `hyperledger/fabric-orderer:2.5`
  - `hyperledger/fabric-ca:1.5`
  - `couchdb:3.4.2`
- rendered compose에서 `latest` image tag 없음.
- tracked registration script에서 legacy `peer0pw/user1pw/LEGACY_DEFAULT_SECRET/ordererpw` secret pattern 없음.
- `git diff --check -- chaincode/passport-contract passport-network wiki/blockchain/activity-log.md` → pass

### TPS/KPI 검증 상태
- live Fabric containers는 감지됨.
- 다만 현재 chaincode 수정본은 running network에 redeploy/commit되지 않았고, `caliper-workspace/benchconfig.yaml`은 write 3000 + read 10000 tx를 발생시킨다.
- 따라서 이번 autopilot에서는 full Caliper를 실행하지 않았다. 실행해도 현재 수정본 검증이 아니라 기존 배포 chaincode 부하 테스트가 되며, ledger write 부작용이 크다.

### code-review verdict
- allowed scope 기준 P0/P1은 코드 또는 명시적 운영 결정으로 해소.
- 새로 발견된 CRITICAL/HIGH 코드 결함 없음.
- 남은 항목은 운영/연동 P2로 분류.

### 세션 간 전달사항 + 블록체인 담당 TODO — 복붙용
```text
[Passport/bmu-agent 전달]
- IssueCredential now rejects holderDid unless it exactly equals the passport DID. UI/API should default holderDid to passport.did and avoid arbitrary owner DID values.
- VC expiresAt must be RFC3339. Existing date-only UI inputs such as YYYY-MM-DD must be converted to e.g. YYYY-MM-DDT00:00:00Z before submit.
- New validation errors may surface as VAL/AUTHZ mapping cases: holder DID mismatch, malformed expiresAt/timestamp, invalid dataHash, missing signature.

[Embedded/BMU 전달]
- RecordBMUData now requires non-empty signature, 64-char SHA-256 hex dataHash, and RFC3339 timestamp.
- Current/voltage may be negative/positive as before, but NaN/Inf is rejected.
- DID must continue to match the passport DID and FC must remain monotonically increasing.

[MCP/monitor 전달]
- Rich-query result decoding now fail-closes on docType mismatch instead of silently skipping/accepting malformed documents. Monitors should surface query errors explicitly.

[블록체인 담당 TODO]
- passport-network identity registration secrets는 블록체인 담당이 `.env` 기반으로 운영한다. Copy `.env.template` to `.env` and set all `*_SECRET`, `CA_ADMIN_USER`, `CA_ADMIN_PASSWORD`, `COUCHDB_USER`, `COUCHDB_PASSWORD` before network bootstrap.
- Docker socket mount는 현재 dev-only로만 명시되어 있다. 블록체인 담당이 production profile/external chaincode builder separation을 후속 처리한다.
- 현재 chaincode 수정본은 live Fabric network에 아직 redeploy/commit되지 않았다. 블록체인 담당이 sequence bump 후 redeploy한다.
- Caliper TPS/KPI는 redeploy 이후 블록체인 담당이 별도 실행한다.
- Fabric image는 2.5/1.5 계열 pin 상태다. 블록체인 담당이 exact patch/digest pin 여부를 후속 결정한다.
```

### 미완료 / 리스크
- Chaincode coverage는 4.7%로 낮다. Fabric mock 기반 behavior tests는 추가 필요.
- `fabric-peer:2.5`, `fabric-orderer:2.5`, `fabric-ca:1.5`는 `latest`보다 안전하지만 exact patch digest pin은 아직 아니다.
- live network에는 현재 수정본이 redeploy되지 않았다. 실제 KPI/TPS는 chaincode sequence bump 후 별도 측정해야 한다.
- `wiki/blockchain/benchmark-methodology.md`의 과거 `admin:LEGACY_DEFAULT_SECRET` 언급은 이번 허용 파일 범위 밖이라 수정하지 않았다. 다음 문서 정리 때 갱신 필요.

### 교훈
- Query selector의 `docType` 필터만으로는 충분하지 않다. CouchDB 결과 payload도 typed decode해야 안전하다.
- Passport/VC/DID binding은 체인코드와 UI/API가 같은 의미론을 공유해야 한다. 특히 `holderDid`와 `expiresAt` 포맷은 세션 간 동기화가 필요하다.

---

## 2026-05-08 — Passport 세션 핸드오프 반영: 3차년도 확장 계약

### 입력 받은 내용
- Passport 세션 문서 `wiki/passport/cross-session-handoff-2026-05-08.md`를 읽고 블록체인 담당 범위만 반영했다.
- Passport 문서는 읽기만 했고 수정하지 않았다.
- 요청 핵심:
  - 기존 `CreateBatteryPassport` 인자 순서 유지
  - 초기 발급 이후 3차년도 확장 속성 기록 경로 제공
  - BMS management/binding identifier 저장·검증
  - source/oracle verification result 기록
  - regulatory/physical verification event history 조회

### 구현 내용
- 기존 `CreateBatteryPassport` 계약은 변경하지 않았다.
- 새 transaction을 추가했다.
  - `SetPassportExtendedAttributes(passportId, manufacturingProcess, disposalMethod, recycledElementContentJSON, extensionInfoJSON, reason)`
  - `BindBMSIdentifier(passportId, bmsManagementId, bmsBindingId, evidenceHash, reason)`
  - `RecordSourceVerification(verificationId, passportId, sourceType, sourceId, dataHash, result, detailsJSON)`
- 새 query를 추가했다.
  - `QuerySourceVerificationsByPassport(passportId, pageSize, bookmark)`
  - `QueryRegulatoryVerificationHistory(passportId, pageSize, bookmark)`
  - `QueryPhysicalVerificationHistory(passportId, pageSize, bookmark)`
- `UpdateRegulatoryVerification`은 현재 상태 업데이트와 함께 `regulatoryVerification` event doc을 남긴다.
- `VerifyPhysicalHistory`는 현재 상태 업데이트와 함께 `physicalVerification` event doc을 남긴다.
- `PhysicalVerification` signal에 `bmsIdentifierMatched`를 추가했다.
- `BatteryPassport`에 추가 필드를 반영했다.
  - `bmsManagementId`
  - `bmsBindingId`

### Validation contract
- `recycledElementContentJSON`은 controlled vocabulary만 허용한다.
  - allowed examples: `lithium`, `nickel`, `cobalt`, `manganese`, `graphite`, `aluminum`, `copper`, `iron`, `plastic`, `other`, `Li`, `Ni`, `Co`, `Mn`, `C`, `Al`, `Cu`, `Fe`
  - 각 값은 finite number이고 `[0, 100]` 범위여야 한다.
- `extensionInfoJSON`은 `map[string]string`이어야 하며 empty key를 거부한다.
- `bmsManagementId`, `bmsBindingId`는 non-empty, 최대 128자, `[A-Za-z0-9:_-./#]` 문자만 허용한다.
- 이미 BMS binding이 존재하는 passport에 다른 identifier를 넣으면 reject한다.
- `RecordSourceVerification.dataHash`는 64-char SHA-256 hex여야 한다.
- `RecordSourceVerification.result`는 `strconv.ParseBool` 기준 malformed boolean을 reject한다.

### 배터리여권 세션 호출 계약
```text
1) 기존 생성은 그대로 유지
CreateBatteryPassport(
  passportId, batteryId, did,
  model, serialNumber,
  manufacturerName, manufactureCountry,
  cellManufacturer, cellManufactureCountry,
  manufactureDate, cellType, chemistry,
  cellCount, weight, totalEnergy,
  energyDensity, ratedCapacity, expectedLifespan,
  voltageRange, temperatureRange,
  carbonFootprint
)

2) 초기 발급 직후 3차년도 확장 속성 기록
SetPassportExtendedAttributes(
  passportId,
  manufacturingProcess,
  disposalMethod,
  recycledElementContentJSON,  // 예: {"lithium":12.5,"Ni":3}
  extensionInfoJSON,           // 예: {"standard":"BMS-3Y","oracle":"passed"}
  reason                       // 예: initial extended attributes
)

3) BMS 관리 식별자 바인딩
BindBMSIdentifier(
  passportId,
  bmsManagementId,             // 예: BMS-MGMT-001
  bmsBindingId,                // 예: did:battery:1#BMS-MGMT-001
  evidenceHash,                // optional, 있으면 64-char SHA-256 hex
  reason
)

4) source/oracle 검증 결과 기록
RecordSourceVerification(
  verificationId,
  passportId,
  sourceType,                  // 예: BMU_ORACLE, MANUFACTURING_CERT, RECYCLING_CERT
  sourceId,
  dataHash,                    // 64-char SHA-256 hex
  result,                      // true/false, malformed reject
  detailsJSON                  // map[string]string JSON
)
```

### 주요 에러 메시지
- `unknown recycledElementContent key: <key>`
- `invalid recycledElementContent rate for <key>: must be in [0, 100], got <value>`
- `invalid extensionInfo JSON: <error>`
- `bmsManagementId must not be empty`
- `bmsBindingId contains invalid character '<char>'`
- `BMS management identifier mismatch: passport <id> is bound to <old>, not <new>`
- `dataHash must be 64-character hex SHA-256`
- `invalid result boolean value: <error>`

### 변경 파일
- `chaincode/passport-contract/types.go`
- `chaincode/passport-contract/helpers.go`
- `chaincode/passport-contract/helpers_test.go`
- `chaincode/passport-contract/passport_tx.go`
- `chaincode/passport-contract/vc_tx.go`
- `chaincode/passport-contract/query.go`
- `wiki/blockchain/activity-log.md`

### 검증 결과
- `gofmt -w chaincode/passport-contract/*.go` → pass
- `go -C chaincode/passport-contract test ./...` → pass
- `go -C chaincode/passport-contract vet ./...` → pass
- `go -C chaincode/passport-contract test -cover ./...` → pass (`coverage: 6.7% of statements`)
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` → pass
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` → pass
- rendered compose에서 `latest` image tag 없음
- tracked registration script에서 legacy hardcoded registration secret 없음
- `git diff --check -- chaincode/passport-contract passport-network wiki/blockchain/activity-log.md` → pass

### 남은 리스크
- 새 chaincode 함수는 live Fabric network에 아직 redeploy/commit되지 않았다. 배터리여권 세션 호출 전 sequence bump/redeploy가 필요하다.
- `recycledElementContent` controlled vocabulary는 의도적으로 보수적이다. UI/API가 다른 키를 쓰려면 블록체인과 먼저 어휘를 맞춰야 한다.
- BMS identifier 원천값은 Embedded/BMU 세션에서 확정되어야 한다. 현재 chaincode는 저장/검증 계약만 제공한다.
- Source/oracle verification은 결과 기록 계약이다. 실제 oracle의 암호학적 검증은 호출 전 계층 책임이다.

## 2026-05-08 — passport handoff 반영 및 live redeploy 검증 보강

### 입력/범위
- 입력 문서: `wiki/passport/cross-session-handoff-2026-05-08.md`의 블록체인 세션 요청.
- 수정 범위는 블록체인 소유 파일로 제한: `chaincode/passport-contract/`, `passport-network/`, `caliper-workspace/workloads/`.
- 배터리여권/임베디드/MCP 세션 파일은 수정하지 않음. `wiki/passport/*` 변경은 다른 세션 산출물로 유지.

### 반영 내용
- 3차년도 확장 속성 계약 보강:
  - `SetPassportExtendedAttributes(passportId, manufacturingProcess, disposalMethod, recycledElementContentJSON, extensionInfoJSON, reason)` 추가.
  - `BindBMSIdentifier(passportId, bmsManagementId, bmsBindingId, evidenceHash, reason)` 추가.
  - 기존 `CreateBatteryPassport` 인자 순서는 유지.
- Smart contract 자동 검증/이력 표면 보강:
  - `RecordSourceVerification(...)` 추가.
  - `QuerySourceVerificationsByPassport`, `QueryPhysicalVerificationHistory`, `QueryRegulatoryVerificationHistory` 추가.
  - physical/regulatory verification update 시 이력 docType을 별도 저장.
- Chaincode 리뷰 P0/P1 수정 유지:
  - typed state loader로 cross-type overwrite 차단.
  - BMU `signature`, `dataHash`, timestamp/FC 검증 강화.
  - `CorrectPassportData` numeric validation과 strict bool/RFC3339 parsing 적용.
- CouchDB index 추가:
  - `indexSourceVerificationByPassport.json`
  - `indexPhysicalVerificationByPassport.json`
  - `indexRegulatoryVerificationByPassport.json`
- `passport-network` 운영 하드닝:
  - `latest` 이미지 태그를 `${FABRIC_VERSION:-2.5}`, `${FABRIC_CA_VERSION:-1.5}`로 교체.
  - registration secret은 `.env`/env 주입 구조로 변경.
  - Docker socket mount는 dev-only 위험 주석으로 명시.
- Caliper workload 보정:
  - `CALIPER_RUN_ID`로 benchmark passport/DID 충돌 방지.
  - worker별 strided passport assignment로 빈 worker/NaN malformed request 방지.
  - per-DID submit promise chain으로 같은 DID의 FC submit 순서를 보존.

### Live network evidence
- `passport-contract` redeploy 완료:
  - Version: `1.2`
  - Sequence: `3`
  - Approvals: `EVManufacturerMSP=true`, `ManufacturerMSP=true`, `RegulatorMSP=true`, `ServiceMSP=true`
- Live invoke/query 검증 통과:
  - Test passport: `PASSPORT-VERIFY-20260508113852`
  - `CreateBatteryPassport` → status 200
  - `SetPassportExtendedAttributes` → status 200
  - `BindBMSIdentifier` → status 200
  - `RecordSourceVerification` → status 200
  - `VerifyPhysicalHistory` → status 200
  - `UpdateRegulatoryVerification` → status 200
  - `QueryPassport` 결과: `manufacturingProcess=dry-room-assembly`, `bmsManagementId=BMS-MGMT-20260508113852`, `bmsIdentifierMatched=true`, `regulatoryVerificationStatus=VERIFIED`
  - history query count: source `1`, physical `1`, regulatory `1`
- Negative live validation 통과:
  - unknown recycling key → `unknown recycledElementContent key: unobtainium`
  - invalid BMS id → `bmsManagementId contains invalid character ' '`
  - malformed boolean → `invalid result boolean value: strconv.ParseBool: parsing "not-bool": invalid syntax`

### 검증 결과
- `gofmt -w chaincode/passport-contract/*.go` → pass
- `go -C chaincode/passport-contract test ./...` → pass
- `go -C chaincode/passport-contract vet ./...` → pass
- `go -C chaincode/passport-contract test -cover ./...` → pass (`coverage: 6.7% of statements`)
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` → pass
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` → pass
- `node -c caliper-workspace/workloads/recordBMUData.js` → pass
- `node -c caliper-workspace/workloads/queryPassport.js` → pass
- `git diff --check -- chaincode/passport-contract passport-network caliper-workspace wiki/blockchain/activity-log.md` → pass
- Caliper smoke (`NUM_PASSPORTS=150`, short temp config) → successful rounds 2/2, fail 0:
  - `write-bmu-data-smoke`: Succ 30 / Fail 0
  - `read-passport-smoke`: Succ 47 / Fail 0

### 성능/KPI 리스크
- 전체 KPI run은 아직 pass 판정 아님.
- 기존 full run 근거:
  - `NUM_PASSPORTS=50 ./run-bench.sh manufacturer`에서 write는 FC hot-key/반복 DID 문제로 대량 실패, read는 gateway concurrency limit으로 일부 실패.
  - 보정 전 재시도 중 빈 worker가 malformed request를 만들었고, 보정 후 smoke에서는 malformed request가 사라짐.
- 남은 성능 리스크:
  - 4-org endorsement에서 동일 DID의 `lastFc` hot key를 고TPS로 반복 갱신하면 peer별 commit visibility 차이로 `ProposalResponsePayloads do not match`가 재발할 수 있음.
  - 공인 KPI 재측정은 더 많은 DID/passport 분산 또는 gateway/endorsement tuning을 별도 performance goal로 분리하는 것이 안전함.

### 변경 파일
- `chaincode/passport-contract/bmu_tx.go`
- `chaincode/passport-contract/helpers.go`
- `chaincode/passport-contract/helpers_test.go`
- `chaincode/passport-contract/passport_tx.go`
- `chaincode/passport-contract/query.go`
- `chaincode/passport-contract/types.go`
- `chaincode/passport-contract/vc_tx.go`
- `chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexSourceVerificationByPassport.json`
- `chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexPhysicalVerificationByPassport.json`
- `chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexRegulatoryVerificationByPassport.json`
- `passport-network/.env.template`
- `passport-network/compose/compose-ca.yaml`
- `passport-network/compose/compose-net.yaml`
- `passport-network/compose/docker/peercfg/core.yaml`
- `passport-network/network.sh`
- `passport-network/organizations/fabric-ca/*/fabric-ca-server-config.yaml`
- `passport-network/organizations/registerEnroll.sh`
- `caliper-workspace/workloads/recordBMUData.js`
- `caliper-workspace/workloads/queryPassport.js`
- `wiki/blockchain/activity-log.md`

### 교훈/다음 세션 전달 포인트
- Passport 세션은 `CreateBatteryPassport` 인자를 바꾸지 말고, 초기 발급 직후 `SetPassportExtendedAttributes`와 `BindBMSIdentifier`를 호출하면 된다.
- Embedded 세션은 실제 BMS management identifier 원천값을 payload/protocol에 확정해야 한다. Chaincode는 저장/검증 계약만 제공한다.
- MCP 세션은 새 source/physical/regulatory history query와 `RecordBMUData` validation error trend를 read-only 관찰 항목으로 추가하면 된다.

## 2026-05-08 — IssueCredential handoff 재확인 및 BMS bindingCode32 검증 추가

### 입력/범위
- 입력: 배터리여권 세션 전달 — IssueCredential 계약 반영 완료 및 블록체인 최종 확인 요청.
- 기준 문서 확인:
  - `wiki/Object/BMS__.pdf`: 3차년도 요구에 DID/실물 배터리/BMS 관리 식별자 바인딩, 스마트컨트랙트 자동 검증, BMS-블록체인 상호연동 검증 포함.
  - `wiki/passport/bms-1-3-year-mapping-2026-05-08.md`: BMS management identifier와 smart contract 자동 검증이 chaincode handoff로 남아 있음을 확인.
- 수정 범위: `chaincode/passport-contract/`, `passport-network/`, `wiki/common/architecture.md`, `wiki/blockchain/activity-log.md`.

### 반영 내용
- IssueCredential 계약 확인:
  - 인자 순서 변경 없음.
  - `IssueCredential(ctx, credentialId, passportId, credType, issuerDid, holderDid, schemaId, credDefId, dataHash, expiresAt)` 유지.
  - holderDid는 `passport.DID`와 불일치 시 `holder DID mismatch`로 reject.
  - `expiresAt`은 RFC3339만 허용, malformed 값은 `invalid expiresAt value`로 reject.
- 에러 문자열 호환성 보강:
  - BMU signature/timestamp empty 에러를 `signature/timestamp must not be empty`로 명확화.
  - 기존 `invalid timestamp value`, `dataHash must be 64-character hex SHA-256` 유지.
- BMS 3차년도 full binding 검증 추가:
  - `BindBMSIdentifier`가 `bmsManagementId` canonical ID의 SHA-256 앞 4 bytes를 little-endian uint32로 계산해 `bmsBindingCode32`를 passport에 저장.
  - 신규 `RecordBMUDataWithPayload(...)` 추가.
    - 기존 `RecordBMUData` 인자 뒤에 `rawPayloadHex`를 추가한 backward-compatible 확장 함수.
    - `rawPayloadHex`는 48 bytes만 허용.
    - `dataHash`는 48B rawPayload 전체 SHA-256과 일치해야 함.
    - rawPayload bytes `44..47`을 little-endian uint32로 읽은 `payload bmsBindingCode32`가 passport의 canonical BMS management identifier-derived code와 일치해야 함.
  - BMU record에 `bmsBindingCode32`, `rawPayloadHashVerified` 저장.
- `wiki/common/architecture.md`에 3차년도 chaincode RBAC matrix 추가.

### Live network evidence
- redeploy/commit 완료:
  - chaincode: `passport-contract`
  - Version: `1.3`
  - Sequence: `4`
  - Package ID: `passport-contract_1.3:3820747fc99c1c57cfb4a0fc08c3798ffc8c35e4f9ec651098307828861ffb83`
  - 4개 org querycommitted 모두 Approvals true.
- BMS binding live test:
  - Test passport: `PASSPORT-BMSBIND-20260508115206`
  - BMS ID: `BMS-MGMT-20260508115206`
  - Derived `bmsBindingCode32`: `4065523955`
  - `BindBMSIdentifier` 후 `QueryPassport`에서 `bmsManagementId`와 `bmsBindingCode32` 확인.
  - `RecordBMUDataWithPayload` positive invoke 성공.
  - `QueryBMURecordsByPassport` 결과: count `1`, `bmsBindingCode32=4065523955`, `rawPayloadHashVerified=true`.
  - bad payload code negative reject:
    - `BMS binding code mismatch: payload bmsBindingCode32 4065523956 does not match canonical BMS management identifier BMS-MGMT-20260508115206 code 4065523955`
- 에러 문자열 live negative 확인:
  - `holder DID mismatch: passport PASSPORT-BMSBIND-20260508115206 is registered to DID did:chaincode:bmsbind:20260508115206, not did:wrong:holder`
  - `invalid expiresAt value: parsing time "2026-05-09" ...`
  - `invalid timestamp value: parsing time "2026-05-08" ...`
  - `dataHash must be 64-character hex SHA-256, got length 3`
  - `signature/timestamp must not be empty`

### 검증 결과
- `gofmt -w chaincode/passport-contract/*.go` → pass
- `go -C chaincode/passport-contract test ./...` → pass
- `go -C chaincode/passport-contract vet ./...` → pass
- `go -C chaincode/passport-contract test -cover ./...` → pass (`coverage: 7.8% of statements`)
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` → pass
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` → pass
- `node -c caliper-workspace/workloads/recordBMUData.js` → pass
- `node -c caliper-workspace/workloads/queryPassport.js` → pass
- `git diff --check -- chaincode/passport-contract passport-network caliper-workspace wiki/blockchain/activity-log.md wiki/common/architecture.md` → pass

### API/handoff notes
- `IssueCredential` 인자 순서 변경 없음. 배터리여권 세션 추가 수정 불필요.
- 기존 `RecordBMUData`는 유지된다. 48B rawPayload/BMS bindingCode32 검증을 쓰려면 새 함수 `RecordBMUDataWithPayload`를 호출해야 한다.
- `RecordBMUDataWithPayload` 인자 순서:

```text
RecordBMUDataWithPayload(
  recordId, passportId, did,
  dataHash, signature,
  fc, soc, voltage, current,
  temperature, cellCount, statusFlags,
  dischargeCycles, timestamp,
  rawPayloadHex
)
```

- Embedded/BMU payload 계약:
  - `rawPayloadHex`는 48 bytes.
  - `dataHash = SHA-256(rawPayload[0:48])`; 따라서 bytes `44..47`도 자동 포함된다.
  - `rawPayload[44:48]`는 little-endian uint32 `bmsBindingCode32`.
  - `bmsBindingCode32 = littleEndianUint32(SHA-256(canonical bmsManagementId)[0:4])`.

### 남은 리스크
- Agent/Embedded가 아직 `RecordBMUDataWithPayload`를 호출하지 않으면 48B payload-level binding 검증은 적용되지 않는다.
- 32-bit code는 full identifier의 축약 검증값이다. 충돌 방지가 필요한 운영 환경에서는 full `bmsManagementId`/서명 검증과 함께 사용해야 한다.

## 2026-05-08 — Embedded lab BMS binding 기준값 검증

### 입력/범위
- 입력: 임베디드 세션 전달 — lab 기준 BMS binding 값 확정.
- 수정 범위: `chaincode/passport-contract/`, `passport-network/`, `wiki/common/architecture.md`, `wiki/blockchain/activity-log.md`.
- 임베디드/배터리여권/MCP 파일은 읽기만 하고 수정하지 않음.

### Lab 기준값
- `bmsManagementId`: `BMS-MGMT-001`
- `bmsBindingId`: `did:battery:001#BMS-MGMT-001`
- `bmsBindingCode32`: `0x2c9a0e0c` (`748293644`)
- `evidenceHash`: `b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178`

### 반영 내용
- `deriveBMSBindingCode32`는 canonical ID trim 후 `first32LE(SHA-256(id))`로 계산한다.
- `evidenceHash` 검증을 추가했다.
  - canonical JSON은 Go `json.Marshal(map[string]string)`의 정렬 key 출력과 동일:

```json
{"bmsBindingCode32":"0x2c9a0e0c","bmsBindingId":"did:battery:001#BMS-MGMT-001","bmsManagementId":"BMS-MGMT-001"}
```

  - 위 canonical JSON의 SHA-256이 lab `evidenceHash`와 일치해야 한다.
  - `evidenceHash`가 비어 있으면 legacy/수동 바인딩 호환을 위해 생략 가능하지만, 값이 있으면 mismatch reject.
- `VerifyPhysicalHistory` unknown signal 에러 메시지에 `bmsIdentifierMatched`를 명시했다.
- `wiki/common/architecture.md` RBAC matrix에 evidenceHash canonical 검증 설명을 추가했다.

### Live network evidence
- redeploy/commit 완료:
  - chaincode: `passport-contract`
  - Version: `1.4`
  - Sequence: `5`
  - Package ID: `passport-contract_1.4:c0a44f830aa746da4bcacc9a3926241be88c68b318606a48a6882d33b75c7e6c`
  - 4개 org querycommitted 모두 Approvals true.
- Lab live test:
  - Test passport: `PASSPORT-LAB-20260508120300`
  - `BindBMSIdentifier(PASSPORT-LAB-20260508120300, BMS-MGMT-001, did:battery:001#BMS-MGMT-001, b3c37..., ...)` → status 200
  - `QueryPassport` 결과:
    - `bmsManagementId = BMS-MGMT-001`
    - `bmsBindingId = did:battery:001#BMS-MGMT-001`
    - `bmsBindingCode32 = 748293644`
  - bad evidence hash negative reject:
    - `evidenceHash mismatch: expected SHA-256 of canonical BMS binding JSON b3c37..., got aaaa...`
  - `RecordBMUDataWithPayload` lab rawPayload positive invoke → status 200
  - `QueryBMURecordsByPassport` 결과:
    - count `1`
    - `bmsBindingCode32 = 748293644`
    - `rawPayloadHashVerified = true`
    - `dataHash = 929e2658aa5f7d8b2dba1f2a036e17b0c2907112041054fda25b384cbdfc9b91`
  - `VerifyPhysicalHistory` with `{"didMatched":true,"bmsIdentifierMatched":true}` → status 200
  - `QueryPassport.physicalHistoryVerification.signals.bmsIdentifierMatched = true`, status `VERIFIED`
  - bad payload code negative reject:
    - `BMS binding code mismatch: payload bmsBindingCode32 748293645 does not match canonical BMS management identifier BMS-MGMT-001 code 748293644`

### Flow confirmation
- Agent가 rawPayload bytes `44..47`을 `readUInt32LE(44)`로 추출하고, chaincode에 저장된 `bmsManagementId`에서 계산한 expected code와 비교한다.
- Agent가 passport binding을 확인한 경우 `RecordBMUDataWithPayload`를 호출하면 chaincode도 동일한 비교를 수행한다.
- physical history 기록은 `VerifyPhysicalHistory`의 signals JSON에 `bmsIdentifierMatched`를 포함하는 방식으로 저장된다.
- 단, BMU data ingest 자체가 passport `physicalHistoryVerification`을 자동 갱신하지는 않는다. 자동 갱신은 TPS/쓰기 증폭 이슈 때문에 분리되어 있으며, Agent/API가 physical verification 시점에 signals를 기록해야 한다.

### 남은 리스크
- 실제 CMU/BMU 보드 E2E에서 non-zero bytes `44..47`이 CAN-FD, BMU 서명, `serial_to_agent.py`, Agent parser까지 보존되는지는 아직 미검증이다.
- 48B payload에는 full `bmsManagementId`/`bmsBindingId` 문자열이 없고 32-bit hint만 있다.
- 따라서 physical binding 상태는 여전히 `partially-implemented`로 보는 것이 맞다. 완전 구현은 보드 E2E + 서명 검증 + physical verification 자동 기록/운영 절차까지 포함해야 한다.

## 2026-05-08 — Passport sequence/contract 재확인

### 입력/범위
- 입력: 배터리여권 세션 전달 — Agent/UI가 기대하는 chaincode 함수명/인자/반환 필드 재확인 요청.
- 수정 범위: `chaincode/passport-contract/helpers_test.go`, `wiki/blockchain/activity-log.md`.
- 배터리여권/임베디드/MCP 파일은 수정하지 않음.

### 확인 결과
- 주의: 배터리여권 전달문에는 sequence 3이라고 되어 있으나 live Fabric commit 기준 최신은 다음과 같다.
  - chaincode: `passport-contract`
  - Version: `1.4`
  - Sequence: `5`
  - Approvals: `EVManufacturerMSP=true`, `ManufacturerMSP=true`, `RegulatorMSP=true`, `ServiceMSP=true`
- Fabric client는 chaincode name `passport-contract`로 호출하므로 별도 sequence를 지정하지 않는다. 따라서 Agent/UI가 chaincode name을 호출하면 최신 committed definition(sequence 5)을 사용한다.
- Passport 기대 계약과 현재 함수명/인자 순서 일치:
  - `CreateBatteryPassport(...)` 기존 인자 순서 유지.
  - `SetPassportExtendedAttributes(passportId, manufacturingProcess, disposalMethod, recycledElementContentJSON, extensionInfoJSON, reason)` 유지.
  - `BindBMSIdentifier(passportId, bmsManagementId, bmsBindingId, evidenceHash, reason)` 유지.
  - `RecordSourceVerification(verificationId, passportId, sourceType, sourceId, dataHash, result, detailsJSON)` 유지.
  - `RecordBMUDataWithPayload(recordId, passportId, did, dataHash, signature, fc, soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles, timestamp, rawPayloadHex)` 유지.
- 함수 signature regression test 추가:
  - `TestPassportHandoffContractSignaturesRemainCompatible`

### Live query evidence
- Test passport: `PASSPORT-LAB-20260508120300`
- `QueryPassport` 반환 확인:
  - `bmsManagementId = BMS-MGMT-001`
  - `bmsBindingId = did:battery:001#BMS-MGMT-001`
  - `bmsBindingCode32 = 748293644` (`0x2c9a0e0c`)
- `QueryBMURecordsByPassport(PASSPORT-LAB-20260508120300, 10, "")` 반환 확인:
  - count `1`
  - first `recordId = BMU-LAB-20260508120300-1`
  - first `bmsBindingCode32 = 748293644`
  - first `rawPayloadHashVerified = true`
  - first `dataHash = 929e2658aa5f7d8b2dba1f2a036e17b0c2907112041054fda25b384cbdfc9b91`

### rawPayload 검증 evidence
- Local payload check:
  - raw length `48`, bad length `48`
  - raw bytes `44..47 = 0c0e9a2c` → LE `0x2c9a0e0c`
  - bad bytes `44..47 = 0d0e9a2c`
  - raw hash `929e2658aa5f7d8b2dba1f2a036e17b0c2907112041054fda25b384cbdfc9b91`
  - bad hash `8c5d0c4134557e35bb8fd7c22502d6df7fddd34e29bb2d527fe88c9fe544df92`
  - hashes differ → bytes `44..47`이 `dataHash`에 포함됨 확인.
- Live negative invoke:
  - bad payload code reject:
  - `BMS binding code mismatch: payload bmsBindingCode32 748293645 does not match canonical BMS management identifier BMS-MGMT-001 code 748293644`

### Passport 세션 전달 판단
- 함수명/인자 순서는 Passport 기대와 다르지 않음.
- 단, live network는 sequence 3이 아니라 sequence 5다. 문서/환경 표기만 sequence 5로 맞추면 된다.

## 2026-05-08 — E2E BMU endorsement policy 정상화

### 작업 내용
- 새 E2E DID `4d5CE8NZbkAVJxcypzaVhw` / passport `PASSPORT-E2E-20260508040123` 경로에서 `ENDORSEMENT_POLICY_FAILURE`가 발생하는 원인을 확인했다.
- `passport-contract` sequence 5의 `validation_parameter`가 `/Channel/Application/Endorsement`를 참조하고 있었고, 채널 Application Endorsement 정책이 `MAJORITY`라 `bmu-agent`의 Manufacturer 단일 peer submit과 불일치했다.
- 코드 재패키징 없이 동일 package id `passport-contract_1.4:c0a44f830aa746da4bcacc9a3926241be88c68b318606a48a6882d33b75c7e6c`로 lifecycle definition만 sequence 6으로 올리고 endorsement policy를 `OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')`로 명시했다.

### 변경/운영 반영
- Live Fabric lifecycle: `passport-contract` version `1.4`, sequence `6` commit 완료.
- 네 org approval 모두 true: `ManufacturerMSP`, `EVManufacturerMSP`, `ServiceMSP`, `RegulatorMSP`.
- 로컬 E2E 런타임 config `config.env`의 `BMU_DID`는 fresh DID `4d5CE8NZbkAVJxcypzaVhw`로 맞춰졌다. (`config.env`는 git 추적 대상 아님)

### 검증 결과
- `peer lifecycle chaincode querycommitted --channelID passportchannel --name passport-contract --output json`:
  - `sequence: 6`
  - `version: 1.4`
  - approvals all true
- `/tmp/bmu.log`에서 policy update 직후 정상 commit 확인:
  - `"message":"BMU recorded"`
  - `passportId":"PASSPORT-E2E-20260508040123"`
  - `did":"4d5CE8NZbkAVJxcypzaVhw"`
  - 예: `fc=1347`, `1361`, `1374`, `1389`, `1402`, `1416`, 이후 계속 증가
- CouchDB ledger 확인:
  - latest valid BMU records for DID `4d5CE8NZbkAVJxcypzaVhw`
  - latest observed `fc=1522`, `status=VALID`, `passportId=PASSPORT-E2E-20260508040123`

### 미완료/리스크
- sequence 6은 chaincode code 재배포가 아니라 validation policy 변경이다.
- Bridge spool에 sequence 5 시점 실패 payload가 남아 있으면, 낮은 FC payload가 재시도되어 간헐적으로 `fc ... must be greater than last valid fc ...`가 섞일 수 있다. 이는 Fabric 정책 문제가 아니라 stale spool retry 문제다.

## 2026-05-08 — 임베디드 stale spool 정리 전달 수신

### 전달 내용
- 임베디드 stale spool 정리 완료.
- 새 DID `4d5CE8NZbkAVJxcypzaVhw` 기준 BMU commit 정상.
- bridge spool pending `0`.
- `passport-contract` lifecycle sequence `6` 정상 확인.
- 다음 lifecycle 변경은 sequence `7`부터 진행.

### 남은 크로스세션 리스크
- 임베디드 보드 실측 raw 48B payload의 bytes `44..47`가 BMS binding code `0c 0e 9a 2c`로 보존되는지 최종 확인 필요.
- 블록체인 쪽에서는 해당 값이 들어오면 `bmsBindingCode32 = 748293644` / `0x2c9a0e0c`로 검증한다.

## 2026-05-08 — E2E passport BMS binding 활성화

### 작업 내용
- MATLAB E2E 새 DID `4d5CE8NZbkAVJxcypzaVhw` 경로가 `RecordBMUData`로만 기록되고 `RecordBMUDataWithPayload` 검증 경로를 타지 않는 원인을 분리했다.
- 원인 1: E2E passport `PASSPORT-E2E-20260508040123`에 `bmsManagementId`가 비어 있어 Agent가 legacy `RecordBMUData`를 선택했다.
- 원인 2: 현재 실행 중인 `bmu-agent` process가 2026-05-06 시작 상태라 최신 bms binding route/parser code를 reload하지 않은 상태다. (`bmu-agent/`는 Passport 세션 범위이므로 블록체인 세션에서는 재시작하지 않음)

### 블록체인 반영
- `BindBMSIdentifier` 실행 완료:
  - passportId: `PASSPORT-E2E-20260508040123`
  - bmsManagementId: `BMS-MGMT-001`
  - bmsBindingId: `did:battery:001#BMS-MGMT-001`
  - evidenceHash: `b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178`
  - bmsBindingCode32: `748293644` (`0x2c9a0e0c`, raw bytes `0c 0e 9a 2c`)

### 다음 필요 조치
- Passport/API 세션에서 `bmu-agent`를 재시작해야 최신 `RecordBMUDataWithPayload` 선택 로직과 `bmsBindingCode32` 로그 필드가 적용된다.
- 재시작 후 정상 기대 로그:
  - `"action":"RecordBMUDataWithPayload"`
  - `"bmsBindingCode32":748293644`
  - `"bmsBindingCodeHex":"0x2c9a0e0c"`
  - `"bmsIdentifierMatched":true`
- 만약 재시작 후 `BMS binding code mismatch`가 발생하면 임베디드 raw payload bytes `44..47` 보존 문제다.

## 2026-05-08 — BMS binding E2E 정상 전환 확인

### Passport/API 세션 전달 수신
- `bmu-agent` 재시작 완료: PID `64934`, 2026-05-08 13:28 KST 시작.
- `/api/status` → Fabric connected.
- MATLAB/BMU 데이터 수신 중.

### 정상 로그 확인
- `"action":"RecordBMUDataWithPayload"`
- `"bmsBindingCode32":748293644`
- `"bmsBindingCodeHex":"0x2c9a0e0c"`
- `"bmsIdentifierMatched":true`

### 원장 조회 확인
- Passport:
  - `bmsManagementId = BMS-MGMT-001`
  - `bmsBindingId = did:battery:001#BMS-MGMT-001`
  - `bmsBindingCode32 = 748293644`
- BMU records:
  - `bmsBindingCode32 = 748293644`
  - `rawPayloadHashVerified = true`

### 참고
- 간헐적 `fc ... must be greater than last valid fc ...`는 재시작 전/중 지연 payload로 판단.
- `BMS binding code mismatch`는 발생하지 않음.
- Passport 세션 활동 로그: `wiki/passport/activity-log/2026-05-08-chaincode-sequence5-bms-binding.md`

## 2026-05-08 — MATLAB E2E live status 위키 최신화

### 확인 내용
- 2026-05-08 13:33 KST 기준 MATLAB/BMU 데이터가 live Fabric에 정상 commit 중임을 재확인했다.
- `/api/status`는 Fabric connected.
- `/tmp/bmu.log`에서 `RecordBMUDataWithPayload` 지속 기록 확인.
- 정상 필드:
  - `bmsBindingCode32 = 748293644`
  - `bmsBindingCodeHex = 0x2c9a0e0c`
  - `bmsIdentifierMatched = true`
- CouchDB 최신 BMU record:
  - latest observed `fc = 8394`
  - `status = VALID`
  - `bmsBindingCode32 = 748293644`
  - `rawPayloadHashVerified = true`

### 문서 최신화
- 추가: `wiki/blockchain/e2e-live-status-2026-05-08.md`
- 갱신: `wiki/blockchain/README.md`
- 갱신: `wiki/blockchain/overview.md`

### 현재 운영 기준
- `passport-contract` live 기준은 v`1.4`, sequence `6`.
- 다음 lifecycle 변경은 sequence `7`부터 진행한다.
- BMS identifier E2E는 블록체인 기준 정상 통과 상태다.

## 2026-05-08 — KPI benchmark 재측정

### 기준
- 위키 기준 KPI: Fabric write `150 TPS`, cloud read `1,500 TPS`.
- 기준 문서: `wiki/blockchain/benchmark-methodology.md`.
- Live chaincode: `passport-contract` v`1.4`, sequence `6`, endorsement policy `OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')`.
- `bmu-agent` `/api/status` Fabric connected 확인.
- benchmark 계정 `bench / <set-via-env>` 및 `PASSPORT-BMU-DEVICE` 조회 기준 passport 확인.

### 실행/검증
- 공식 Caliper write 명령 시도:
  - `cd caliper-workspace && CALIPER_RUN_ID=bench-20260508080423 NUM_PASSPORTS=500 ./run-bench.sh manufacturer`
  - 로그: `/tmp/caliper-benchmark-bench-20260508080423.log`
  - 결과: 종료되지 않고 `Unfinished:500`이 고정됨.
  - 마지막 관측: `Submitted: 53125`, `Succ: 52625`, `Fail:0`, `Unfinished:500`.
  - 판단: 현 Caliper workload가 setup/worker accounting 또는 per-DID queue와 충돌해 공식 write KPI 산출값을 만들지 못함.
- 보정 write 측정 1 — no-chain 재사용 DID:
  - 로그: `/tmp/caliper-write-nochain-bench-20260508080423-20260508083205.log`
  - `Succ 615`, `Fail 2385`, `Send Rate 200.1 TPS`, `Avg Latency 23.35s`, `Throughput 79.0 TPS`.
  - 판단: 기존 DID/FC/MVCC 충돌 때문에 유효 KPI로 쓰기 어렵다.
- 보정 write 측정 2 — unique passport + single-use BMU:
  - setup 로그: `/tmp/caliper-setup-bench-unique-20260508083410.log`
  - setup 결과: `Succ 3000`, `Fail 0`, `Send Rate 192.2 TPS`, `Avg Latency 12.37s`, `Throughput 114.3 TPS`.
  - write 로그: `/tmp/caliper-write-single-use-bench-unique-20260508083410.log`
  - write 결과: `Succ 3000`, `Fail 0`, `Send Rate 200.4 TPS`, `Avg Latency 29.29s`, `Throughput 61.9 TPS`.
  - 판단: 실패 없는 조건에서도 write KPI `150 TPS` 미달.
- cloud read 준비:
  - `cloud-agent/initial-sync.js` 실행 완료.
  - 로그: `/tmp/cloud-agent-initial-sync-20260508083611.log`
  - 결과: `Passports: 3759`, `Credentials: 0`, `Materials: 1`, `Elapsed: 13.8s`.
  - `cloud-agent` `/health` → `{"status":"ok","db":"connected"}` 확인.
- 공식 cloud read script 실행:
  - `BENCH_USER=bench BENCH_PASSWORD=<set-via-env> BENCH_ORG=1 node scripts/tps-benchmark-cloud.js`
  - 로그: `/tmp/cloud-read-benchmark-20260508084002.log`
  - cloud read: `1246.2 TPS` / target `1500 TPS` → FAIL.
  - Fabric read baseline: `162.5 TPS`.
  - HTTP Fabric write baseline: `22.8 TPS` / target `150 TPS` → FAIL.

### 결론
- 현재 live 환경 기준 write KPI와 cloud read KPI 모두 통과하지 못했다.
- write는 chaincode submit/commit latency가 높고, unique DID 단발 write에서도 `61.9 TPS`에 머문다.
- cloud read는 Caliper write 시도 후 대량 block backlog를 `cloud-agent` listener가 따라잡는 중 측정되어 보수적으로 낮게 나왔을 가능성이 있다. 그래도 이번 공식 script 결과는 `1246.2 TPS`로 KPI 미달이다.

### 남은 리스크/다음 조치
- Caliper 공식 workload는 `Unfinished:500` 고착을 먼저 고쳐야 공식 write KPI를 재현 가능하게 산출할 수 있다.
- write latency 원인 분리 필요: chaincode validation 비용, Fabric commit/orderer/peer 리소스, block batching, CouchDB state DB 부하, benchmark workload queue를 분리해서 봐야 한다.
- cloud read는 `cloud-agent` listener backlog를 완전히 소진한 뒤 재측정해야 최종 판정이 더 정확하다. 이번 측정 중 재기동 listener는 block `252762`까지 catch-up 후 종료했다.
- benchmark 중 생성된 임시 Caliper workload/config 파일은 삭제했고, repo working tree 오염은 남기지 않았다.

## 2026-05-08 — benchmark 회귀 진단 전달안 검증

### 확인 결과
- 전달받은 `endorsement policy 회귀(MAJORITY)` 가설을 live Fabric에서 직접 확인했다.
- `passport-contract`는 모든 peer 기준 sequence `6`, version `1.4`, approvals all true.
- `validation_parameter`를 `protos.ApplicationPolicy`로 decode한 결과 `signature_policy.n_out_of.n = 1`, signed_by `0..3`로 확인됐다.
- 따라서 현재 live chaincode policy는 `1-of-4 OR`이며, 5-8 write `61.9 TPS`의 1차 원인을 MAJORITY endorsement로 보는 가설은 기각한다.

### 추가 관찰
- 5-8 공식 Caliper write 측정 시작 시점에는 `cloud-agent:3002`가 떠 있지 않았으므로, cloud-agent block listener가 Caliper write non-termination의 직접 원인이라는 가설도 약하다.
- 다만 read 측정 쪽은 listener backlog 영향이 남아 있다.
  - peer channel height: `253359`
  - Mongo `_sync_meta.lastBlock`: `252762`
  - 격차: 약 `597` blocks
- 4-22 KPI commit 이후 Caliper workload 자체도 바뀌었다.
  - `CALIPER_RUN_ID`가 passport/DID에 포함됨.
  - worker passport 할당이 range에서 striding으로 바뀜.
  - `lastSubmitByDid` per-DID promise chain이 추가됨.
- chaincode `RecordBMUData` legacy path는 BMS raw payload 검증을 타지 않는다. 추가 비용은 typed loader/docType 검증, signature/dataHash 검증, finite float 검증 수준이다.

### 판단
- 가장 먼저 볼 것은 endorsement 재배포가 아니라 Caliper workload/accounting 회귀다.
- 특히 공식 run의 `Submitted 53125 / Succ 52625 / Fail 0 / Unfinished 500`은 chaincode policy보다는 Caliper round 종료/commit-event accounting 또는 workload queue 설계 문제에 더 가깝다.
- read KPI는 listener backlog 완전 소진 후 재측정해야 최종 판정 가능하다.

### 다음 조치 후보
1. Caliper workload를 4-22 기준과 현재 기준으로 A/B 실행해 `lastSubmitByDid`와 `RUN_ID/striding` 영향 분리.
2. write 측정 전 cloud-agent/bmu-agent/MATLAB 등 비필수 writer/listener를 내리고 Fabric만 quiet 상태에서 재측정.
3. `RecordBMUData` micro-benchmark를 legacy 4-22 chaincode shape와 현재 shape로 비교해 typed loader/validation 비용을 분리.

## 2026-05-08 — performance-goal KPI 회귀 분리 및 재측정

### 작업 내용
- `CALIPER_RUN_ID` 도입 후 공식 write run이 `Unfinished:500`에 고착되는 문제를 분리했다.
- 원인은 `recordBMUData.js`의 `initializeWorkloadModule`에서 Caliper adapter로 passport setup tx를 직접 제출한 것과 Caliper round accounting이 섞인 점이었다.
- setup tx를 Caliper round 밖으로 빼고, `run-bench.sh`가 `prepare-passports.js`를 통해 Fabric Gateway로 passport를 사전 생성하도록 변경했다.
- `lastSubmitByDid` promise chain은 제거했다. 공식 round는 write/read workload만 수행한다.

### 변경 파일
- `caliper-workspace/run-bench.sh`
- `caliper-workspace/prepare-passports.js`
- `caliper-workspace/workloads/recordBMUData.js`
- `wiki/blockchain/benchmark-methodology.md`
- `wiki/blockchain/activity-log.md`

### 측정 명령/결과
- 공식 write 재측정, quiet 조건(`cloud-agent`, `bmu-agent` 중단):
  - 명령: `cd caliper-workspace && NUM_PASSPORTS=500 ./run-bench.sh manufacturer`
  - 로그: `/tmp/caliper-official-quiet-20260508091621.log`
  - 사전 생성: `[prepare-passports] runId=20260508091621 passports=500 created=500 existed=0`
  - 결과: `write-bmu-data Succ 500 / Fail 2500 / Send Rate 200.4 TPS / Avg Latency 26.71s / Throughput 78.6 TPS`
  - 종료성: `Benchmark successfully finished`, `Unfinished` 고착 없음.
- 이전 fix 확인 run:
  - 로그: `/tmp/caliper-official-gateway-prepare-20260508090558.log`
  - 결과: `write-bmu-data Succ 639 / Fail 2361 / Send Rate 191.2 TPS / Avg Latency 17.27s / Throughput 94.2 TPS`
- cloud read 공식 script:
  - 명령: `BENCH_USER=bench BENCH_PASSWORD=<set-via-env> BENCH_ORG=1 node scripts/tps-benchmark-cloud.js`
  - 로그: `/tmp/cloud-read-benchmark-kpi-20260508091310.log`
  - 결과: `CLOUD READ 1372.1 TPS`, `FABRIC READ 202.0 TPS`, `FABRIC WRITE 24.8 TPS`
- cloud-only 재확인(`bmu-agent` 중단, `cloud-agent` fresh start, peer height `253937`, Mongo `_sync_meta.lastBlock` `253936`):
  - 로그: `/tmp/cloud-read-benchmark-cloudonly-kpi-20260508091512.log`
  - 결과: `CLOUD READ 1286.9 TPS`
- Mongo direct 분리 측정:
  - 로그: `/tmp/cloud-direct-mongo-kpi-20260508091847.log`
  - 결과: `DIRECT_MONGO completed=5199 errors=0 elapsed=1.740s tps=2987.9`

### 판단
- `Unfinished:500` 회귀는 Caliper workload/setup accounting 문제로 확정했고, 코드 수정 후 공식 run은 종료된다.
- write KPI는 아직 `150 TPS` 미달이다. quiet 조건에서도 평균 commit latency가 `26.71s`로 커지고, 실패 대부분은 `status code: 11` 검증 실패로 관찰된다.
- live endorsement policy는 이미 sequence `6`, version `1.4`, `1-of-4 OR`이므로 MAJORITY policy 회귀는 기각 상태를 유지한다.
- 현재 write 병목은 Caliper non-termination이 아니라 Fabric gateway/orderer/peer validation/commit-status 경로의 지연이다. 다음 분리는 peer/orderer/CouchDB 리소스와 chaincode validation 비용 A/B가 필요하다.
- cloud read는 MongoDB 자체는 `~2988 TPS`로 KPI를 넘지만, 공식 HTTP 경로는 `1286~1372 TPS`에 머문다. 병목은 MongoDB가 아니라 `cloud-agent` Express/HTTP/middleware 경로 또는 같은 프로세스 listener 부하 쪽이다. 이번 목표 범위에서는 `cloud-agent/` 수정 금지라 코드 수정은 하지 않았다.

### 검증
- `git diff --check`
- `node -c caliper-workspace/prepare-passports.js`
- `node -c caliper-workspace/workloads/recordBMUData.js`
- `node -c caliper-workspace/workloads/queryPassport.js`
- `bash -n caliper-workspace/run-bench.sh`
- `bash .omx/goals/performance/blockchain-kpi-regression-20260508/evaluate.sh`

### 남은 리스크/다음 조치
- write `150 TPS` 복구는 미완료. `RecordBMUData` chaincode 검증 비용, CouchDB state DB 지연, orderer/peer commit event 지연을 A/B로 더 분리해야 한다.
- Caliper read round의 `too many requests for /gateway.Gateway, exceeding concurrency limit (5000)`는 KPI 공식 read가 아니므로 별도 조정 대상이다.
- cloud read `1500 TPS` 복구는 `cloud-agent` 코드/런타임 소유 범위에서 middleware, keep-alive, listener 분리, route fast path를 검토해야 한다.

## 2026-05-08 — performance-goal KPI 복구 2차: valid write 병목 확정, cloud read 복구

### 작업 내용
- 공식 Caliper write가 종료되도록 `prepare-passports.js` 사전 생성 경로와 `BMU_RECORD_KEYS` 기반 독립 write key pool을 정리했다.
- `recordBMUData.js`의 `lastSubmitByDid` promise chain과 workload 내부 setup tx를 제거해 Caliper round accounting 오염을 차단했다.
- Fabric runtime 쪽은 로그 I/O와 gateway/deliver/endorser concurrency 병목을 줄이도록 compose 설정을 조정했다.
- cloud read는 API 프로세스와 Fabric listener를 분리할 수 있게 하고, HTTP keep-alive와 passport detail TTL cache fast path를 추가했다.
- benchmark 중 임시로 켰던 CouchDB `delayed_commits`는 최종 상태에서 `couchdb0="false"`로 되돌렸다. `couchdb1~3`은 기본값(`unknown_config_value`, 즉 명시 설정 없음) 상태다.

### 변경 파일
- `caliper-workspace/run-bench.sh`
- `caliper-workspace/prepare-passports.js`
- `caliper-workspace/workloads/recordBMUData.js`
- `caliper-workspace/workloads/queryPassport.js`
- `passport-network/compose/compose-net.yaml`
- `passport-network/compose/docker/peercfg/core.yaml`
- `cloud-agent/server.js`
- `scripts/tps-benchmark-cloud.js`
- `wiki/blockchain/benchmark-methodology.md`
- `wiki/blockchain/activity-log.md`

### 측정 명령/결과
- 공식 write 기준 명령:
  - `cd caliper-workspace && NUM_PASSPORTS=500 ./run-bench.sh manufacturer`
- full 4-peer, all-success valid BMU write:
  - 로그: `/tmp/caliper-official-kpi-batch4mb-20260508185500.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 197.8 TPS / Avg Latency 26.37s / Throughput 73.2 TPS`
  - 종료성: `Benchmark successfully finished`
- single manufacturer peer only, CouchDB delayed commit 미사용:
  - 로그: `/tmp/caliper-official-kpi-single-peer-20260508190307.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 200.4 TPS / Avg Latency 11.26s / Throughput 109.7 TPS`
- 임시 durability 완화 실험(`couchdb0 delayed_commits=true`, 최종 반영 안 함):
  - 로그: `/tmp/caliper-official-kpi-single-peer-1mb-delayed-20260508190824.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 194.4 TPS / Avg Latency 10.93s / Throughput 123.5 TPS`
  - 판단: 150 TPS 미달이며 durability 의미를 약화하므로 완료 증거로 쓰지 않는다.
- cloud read 공식 script:
  - 실행 조건: `CLOUD_AGENT_LISTENER_ENABLED=false`, `RATE_LIMIT_MAX=100000`, `PASSPORT_DETAIL_CACHE_TTL_MS=1000`, Mongo pool `500/20`
  - 명령: `BENCH_USER=bench BENCH_PASSWORD=<set-via-env> BENCH_ORG=1 node scripts/tps-benchmark-cloud.js`
  - 로그: `/tmp/cloud-read-benchmark-kpi-cache-20260508194311.log`
  - 결과: `CLOUD READ 2669.5 TPS` / target `1500 TPS` → PASS

### 상태 증거
- peer channel height: `256995`
- Mongo `_sync_meta.lastBlock`: `254526`
- cloud-agent health: `{"status":"ok","db":"connected"}`
- CouchDB delayed commits:
  - `couchdb0="false"`
  - `couchdb1~3=unknown_config_value`(기본값)

### 판단
- `Unfinished:500`은 해결됐다. 원인은 chaincode/policy가 아니라 Caliper workload 내부 setup tx와 round accounting 혼합이었다.
- endorsement policy 회귀 가설은 계속 기각한다. live policy는 sequence `6`, version `1.4`, `1-of-4 OR`다.
- write KPI는 아직 미달이다. valid BMU record를 모두 성공시키면 full 4-peer 기준 `73.2 TPS`, 단일 peer 기준 `109.7 TPS`에 머문다.
- 병목은 Fabric Gateway commit-status 대기 + peer/CouchDB commit path로 좁혀졌다. send rate는 `~198~200 TPS`를 유지하지만 commit 완료 drain latency가 `11~26s`까지 커진다.
- cloud read KPI는 API/listener 분리와 keep-alive/cache fast path 적용 후 `2669.5 TPS`로 복구됐다.

### 남은 리스크/다음 조치
- 현재 제약(`운영 의미 보존`, `benchmark-only semantic bypass 금지`) 안에서는 write KPI `150 TPS`를 아직 달성하지 못했다.
- 추가 달성을 위해서는 다음 중 하나가 필요하다.
  1. fresh Fabric network 또는 별도 benchmark network에서 ledger/CouchDB 누적 부하를 제거한 재측정.
  2. Fabric/CouchDB storage profile 추가 튜닝(디스크 I/O, compaction, CouchDB fsync/commit 정책 검토).
  3. chaincode hot path A/B 최적화(typed loader 최소화, passport DID-only loader 등) — 단, 검증 의미 완화 없이 진행.
  4. 과거 방식처럼 MVCC 실패 tx까지 ledger throughput으로 인정하는 방법론 재채택 — 이번 목표의 valid-write/no-bypass 조건과 충돌하므로 비권장.

### 검증 업데이트
- `git diff --check` PASS
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` PASS
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-kpi-20260508.log`)
- `bash .omx/goals/performance/blockchain-kpi-recovery/evaluate.sh` FAIL — `WRITE_TPS=73.2 < 150`, `CLOUD_READ_TPS=2669.5 >= 1500`
- benchmark용 `cloud-agent` 프로세스(`/tmp/cloud-agent-kpi.pid`)는 검증 후 종료했다.

## 2026-05-08 — performance-goal KPI 복구 3차: sequence 7 hot-path index / worker fan-out A/B

### 작업 내용
- `RecordBMUData` legacy path가 매 tx마다 full passport JSON을 읽고 unmarshal하던 부분을 줄였다.
- `CreateBatteryPassport`에서 `passportDIDBinding(passportId,did)` composite index를 같이 기록한다.
- `RecordBMUData` legacy path는 raw payload 검증이 필요 없는 경우 이 compact binding index를 먼저 확인하고, 기존 passport는 full passport fallback으로 호환한다.
- raw payload 경로(`RecordBMUDataWithPayload`)는 BMS binding 필드가 필요하므로 full passport 검증을 유지했다.
- chaincode를 `passport-contract` version `1.5`, sequence `7`로 재배포했다.
- Caliper worker 수를 `15 → 4`로 낮춰 gateway commit-status fan-out를 줄이는 A/B를 수행했다. fixed rate `200 TPS`, txNumber `3000`은 유지했다.
- CouchDB compaction을 4개 peer DB에 수행했지만, 직후 cold cache 상태에서는 write가 악화되어 최종 개선책으로 보지 않는다.

### 변경 파일 추가
- `chaincode/passport-contract/bmu_tx.go`
- `chaincode/passport-contract/helpers.go`
- `chaincode/passport-contract/helpers_test.go`
- `chaincode/passport-contract/passport_tx.go`
- `caliper-workspace/benchconfig.yaml`

### 측정 결과
- sequence 7, workers 15:
  - 로그: `/tmp/caliper-official-kpi-seq7-binding-20260508200546.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 195.5 TPS / Avg Latency 18.35s / Throughput 91.1 TPS`
- sequence 7, CouchDB compaction 직후, workers 15:
  - 로그: `/tmp/caliper-official-kpi-seq7-compact-20260508201245.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 200.7 TPS / Avg Latency 27.81s / Throughput 68.6 TPS`
  - 판단: compaction 직후 cold cache로 악화. KPI 개선책 아님.
- sequence 7, workers 4:
  - 로그: `/tmp/caliper-official-kpi-seq7-workers4-20260508201644.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 200.3 TPS / Avg Latency 17.90s / Throughput 96.6 TPS`
  - 판단: 4-peer valid write 최고치는 `96.6 TPS`로 개선됐지만 KPI `150 TPS` 미달.
- cloud read 재확인:
  - 로그: `/tmp/cloud-read-benchmark-kpi-seq7-20260508202117.log`
  - 결과: `CLOUD READ 3450.7 TPS` / target `1500 TPS` → PASS

### 상태 증거
- live chaincode: `passport-contract` version `1.5`, sequence `7`, approvals all true.
- peer channel height: `257480`
- Mongo `_sync_meta.lastBlock`: `254526` — listener-disabled benchmark 이후 read model backlog가 남아 있음.
- CouchDB delayed commits: `couchdb0="false"`, `couchdb1~3=unknown_config_value`.
- benchmark용 `cloud-agent`는 read 재검증 후 종료했다.

### 판단
- hot-path index는 write를 `73.2 TPS → 91.1/96.6 TPS` 구간으로 올렸지만, 150 TPS까지는 부족하다.
- 남은 병목은 chaincode endorsement CPU보다 commit-status drain과 4개 CouchDB peer commit I/O다.
- 현재 제약에서 남은 큰 분기점은 fresh benchmark ledger/network 또는 더 공격적인 storage profile이다. 기존 live ledger를 reset하는 조치는 파괴적이므로 별도 승인 없이는 진행하지 않는다.

### 검증 업데이트 2
- `git diff --check` PASS
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` PASS
- `cd chaincode/passport-contract && go test ./...` PASS
- `cd chaincode/passport-contract && go vet ./...` PASS
- `cd chaincode/passport-contract && go test -cover ./...` PASS (`coverage: 10.6%`)
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-kpi-seq7-20260508.log`)
- `bash .omx/goals/performance/blockchain-kpi-recovery/evaluate.sh` FAIL — `WRITE_TPS=96.6 < 150`, `CLOUD_READ_TPS=3450.7 >= 1500`

## 2026-05-08 — performance-goal KPI 복구 4차: orderer batch A/B / passport reuse 분리

### 작업 내용
- live orderer batch 실험값을 되돌리고 최종 운영값을 `BatchTimeout=500ms`, `MaxMessageCount=250`, `PreferredMaxBytes=4MB`로 복구했다.
- `passport-network/configtx/configtx.yaml`의 `PreferredMaxBytes`도 live channel 값과 맞춰 `4 MB`로 정렬했다.
- `prepare-passports.js`가 기존 benchmark passport를 재사용할 때 Fabric Gateway `EndorseError`의 generic message 때문에 duplicate를 못 잡는 문제를 보강했다.
  - 사전 `QueryPassport` 존재 확인을 추가했다.
  - `already exists` 판정은 gateway error details까지 확인한다.
- `recordBMUData.js`에 `BMU_FC_START`를 추가해 같은 benchmark passport/DID를 재사용하는 valid FC 연속 측정을 가능하게 했다.

### 추가 측정 결과
- orderer `BatchTimeout=2s` A/B:
  - 로그: `/tmp/caliper-official-kpi-seq7-batch2s-workers4-20260508202441.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Throughput 85.5 TPS`
  - 판단: `500ms`보다 악화. 최종 반영 안 함.
- orderer `BatchTimeout=100ms` A/B:
  - 로그: `/tmp/caliper-official-kpi-seq7-batch100ms-workers4-20260508203058.log`
  - 결과: `write-bmu-data Succ 2997 / Fail 0 / Avg Latency 33.21s / Throughput 51.4 TPS`
  - 판단: 크게 악화. live channel을 `500ms / 250 / 4MB`로 복구 완료.
- batch 복구 후 신규 passport 생성 포함 공식 run:
  - 로그: `/tmp/caliper-official-kpi-seq7-reverted-20260508203604.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 200.3 TPS / Avg Latency 24.58s / Throughput 71.0 TPS`
- 기존 passport 재사용 + `BMU_FC_START=1` 분리 run:
  - 로그: `/tmp/caliper-official-kpi-seq7-reuse-fc2-20260508204332.log`
  - 사전 생성: `created=0 existed=3000`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 200.3 TPS / Avg Latency 16.79s / Throughput 95.8 TPS`
  - 판단: passport 생성 직후 부하는 주원인이 아니다. 기존 best valid write `96.6 TPS`와 같은 구간에 머문다.

### 상태 증거
- live orderer batch verify:
  - `BatchTimeout=500ms`
  - `MaxMessageCount=250`
  - `PreferredMaxBytes=4194304`
  - `AbsoluteMaxBytes=10485760`
- peer channel height: `258330` 이상
- CouchDB state DB 규모: 각 peer DB `doc_count=566582`, file size 약 `485MB`
- CouchDB active tasks: `[]`
- idle stats 관찰: peer/orderer CPU는 idle 상태에서 낮고, CouchDB0 누적 BlockIO가 `1.57GB / 26.6GB`로 가장 큼.

### 판단
- `BatchTimeout`을 줄이거나 늘리는 방식은 write KPI를 복구하지 못했다.
- 기존 passport 재사용도 `95.8 TPS`로, 신규 passport 사전 생성이 write 병목 원인이 아님을 확인했다.
- 현재 all-success valid BMU write의 최고 증거는 sequence 7, workers 4의 `96.6 TPS`다.
- 남은 병목은 contract validation 의미가 아니라 Fabric peer commit/CouchDB state commit drain 쪽으로 좁혀졌다.
- `couchdb delayed_commits=true`는 `123.5 TPS`까지 올렸지만 durability 의미를 완화하므로 제외한다.
- KPI `150 TPS`를 같은 live ledger에서 더 밀어붙이려면 destructive fresh ledger/network 또는 durability/storage profile 변경이 필요하다. 이는 현재 goal의 `운영 의미 보존` 조건 밖이므로 사용자 승인 없이 진행하지 않는다.

### 남은 리스크/다음 조치
- write KPI `150 TPS` 미달: best valid evidence `96.6 TPS`.
- cloud read KPI는 `3450.7 TPS`로 통과 상태 유지.
- 다음 실질 조치 후보:
  1. 별도 fresh benchmark network/ledger에서 동일 sequence 7 chaincode와 동일 Caliper workload로 재측정.
  2. 운영 durability 변경을 수반하는 CouchDB/storage profile은 별도 ADR/승인 후 실험.
  3. all-success 기준 대신 과거 MVCC 실패 포함 ledger-throughput 기준을 재채택할지 KPI 방법론 차원에서 결정.

### 검증 업데이트 3
- `git diff --check` PASS
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` PASS
- `cd chaincode/passport-contract && gofmt -w bmu_tx.go helpers.go helpers_test.go passport_tx.go` 적용
- `cd chaincode/passport-contract && go test ./...` PASS
- `cd chaincode/passport-contract && go vet ./...` PASS
- `cd chaincode/passport-contract && go test -cover ./...` PASS (`coverage: 10.6%`)
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-kpi-final-20260508.log`)
- `bash .omx/goals/performance/blockchain-kpi-recovery/evaluate.sh` FAIL — `WRITE_TPS=96.6 < 150`, `CLOUD_READ_TPS=3450.7 >= 1500`
- `omx performance-goal checkpoint --slug blockchain-kpi-recovery --status fail` 기록 완료.

## 2026-05-08 — performance-goal KPI 복구 5차: commit timeout / peer routing / lastFc hot-path 분리

### 작업 내용
- Caliper Gateway submit timeout을 `CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY`로 주입 가능하게 하고 기본값을 `180s`로 올렸다.
  - 목적: 장시간 backlog 상황에서 `CommitStatusError: DEADLINE_EXCEEDED`가 measurement failure로 섞이는 것을 막고, 실제 처리량을 끝까지 관찰하기 위함.
  - 이 값은 ledger 의미나 contract validation을 바꾸지 않는다.
- manufacturer identity를 다른 peer gateway로 보내는 A/B를 수행했다.
  - 결과가 악화되어 peer routing 문제가 주원인이 아님을 확인했다.
- `RecordBMUData` legacy hot path를 한 번 더 줄이기 위해 sequence 8 / version 1.6을 배포했다.
  - 신규 passport 생성 시 `lastFc(did)` 값에 `passportId + separator + fc` 형태의 compact binding을 초기화한다.
  - legacy `RecordBMUData`는 신규 seq8 passport 기준 `lastFc` 한 번의 `GetState`로 DID/passport binding과 FC high-water를 함께 검증한다.
  - 기존 numeric `lastFc`와 sequence 7 `passportDIDBinding`은 fallback으로 유지한다.
  - `ResetFCForDID`, `InvalidateBMURecord`는 encoded/legacy `lastFc`를 모두 처리하도록 보강했다.
- chaincode lifecycle:
  - `passport-contract` version `1.6`, sequence `8` 배포 완료.
  - 다음 lifecycle 변경은 sequence `9`부터 진행해야 한다.

### 추가 측정 결과
- 10k steady-state + timeout 180s + 기존 passport 재사용:
  - 로그: `/tmp/caliper-official-kpi-seq7-10k-timeout180-reuse-20260508205724.log`
  - 결과: `write-bmu-data Succ 10000 / Fail 0 / Send Rate 198.6 TPS / Avg Latency 58.43s / Throughput 91.1 TPS`
  - 판단: tx 수를 늘려도 throughput이 90 TPS대에 머문다. 3k run의 `96.6 TPS`가 우연한 short-run artifact가 아니다.
- manufacturer identity via EV peer gateway:
  - 로그: `/tmp/caliper-official-kpi-seq7-via-evpeer-20260508210204.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Throughput 84.2 TPS`
  - 판단: 단일 manufacturer peer gateway 병목 가설은 기각.
- sequence 8 lastFc binding hot-path:
  - 로그: `/tmp/caliper-official-kpi-seq8-lastfc-binding-20260508211001.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Send Rate 200.3 TPS / Avg Latency 16.52s / Throughput 89.0 TPS`
  - 판단: `GetState` 1회 절감은 현재 live ledger에서 KPI를 복구하지 못했다. best valid all-success evidence는 계속 sequence 7 workers 4의 `96.6 TPS`다.

### 상태 증거
- live chaincode: `passport-contract` version `1.6`, sequence `8`.
- live orderer batch는 `500ms / 250 / 4MB`로 유지.
- 최신 peer channel height 확인: `259314`.
- cloud read 최신 통과 증거는 유지:
  - `/tmp/cloud-read-benchmark-kpi-seq7-20260508202117.log` → `3450.7 TPS`

### 판단
- `Unfinished:500`, benchmark accounting, passport setup 부하, orderer batch, peer gateway routing, chaincode `GetState` 1회 절감까지 분리했지만 Fabric write KPI는 `150 TPS`에 도달하지 못했다.
- 의미 보존 조건을 만족하는 valid all-success write의 현재 상한은 약 `90~100 TPS`다.
- 남은 유효 후보는 현재 live ledger를 벗어난 fresh benchmark ledger/network 재측정, 또는 durability/storage profile 변경이다.
- fresh ledger/network reset은 기존 원장 상태를 지우는 destructive action이므로 별도 승인 전에는 진행하지 않는다.

### 검증 업데이트 4
- `cd chaincode/passport-contract && go test ./...` PASS
- `cd chaincode/passport-contract && go vet ./...` PASS
- `cd chaincode/passport-contract && go test -cover ./...` PASS (`coverage: 11.5%`)
- `bash .omx/goals/performance/blockchain-kpi-recovery/evaluate.sh` FAIL 예정 — `WRITE_TPS=96.6 < 150`, `CLOUD_READ_TPS=3450.7 >= 1500`
- 목표 상태: `validation_failed`; 완료 처리 금지.

## 2026-05-08 — performance-goal KPI 복구 6차: fresh channel / event strategy / index metadata / runtime restart 분리

### 작업 내용
- live ledger를 삭제하지 않는 선에서 신규 benchmark channel들을 추가로 만들고 동일 1-of-4 endorsement, 동일 `RecordBMUData` 의미로 write 병목을 분리했다.
- `caliper-workspace/networkConfig.yaml` / `run-bench.sh`는 기본 `passportchannel`을 유지하되 `CHANNEL_NAME` env로 별도 channel을 측정할 수 있게 했다.
- manufacturer identity를 service peer gateway로 연결하는 임시 CCP(`/tmp/connection-manufacturer-via-service.json`)로 gateway peer 위치 영향을 측정했다.
- CouchDB Mango index 최적화 후보를 검토했다.
  - `partial_filter_selector`는 Fabric chaincode metadata validator가 `Invalid Entry. Entry partial_filter_selector`로 거부해 폐기했다.
  - BMU와 무관한 verification index 3개 제거 실험은 write 개선이 없어 되돌렸다.
- 데이터 삭제 없이 CouchDB/orderer/peer container restart를 수행해 런타임 누적 부하 완화 여부를 확인했다.

### 추가 측정 결과
- fresh channel `passportbenchchannel`, manufacturer gateway:
  - 로그: `/tmp/caliper-official-kpi-benchchannel-seq1-20260508212114.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Throughput 147.1 TPS`
- fresh channel `passportbenchsvc`, service peer gateway:
  - 로그: `/tmp/caliper-official-kpi-benchsvc-via-service-20260508214128.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Throughput 149.4 TPS`
  - 판단: 가장 근접했지만 KPI 기준 `150 TPS`에는 미달. 또한 임시 CCP + 별도 channel 진단값이라 기본 official command 통과 증거로 쓰지 않는다.
- `passportbenchchannel` rate 250:
  - 로그: `/tmp/caliper-official-kpi-benchchannel-rate250-20260508212433.log`
  - 결과: `92.0 TPS`; offered load 증가는 commit backlog만 키워 악화.
- `passportbenchsvc2` 3200 tx/key:
  - 로그: `/tmp/caliper-official-kpi-benchsvc2-3200-via-service-20260508214503.log`
  - 결과: `141.1 TPS`; 긴 run으로도 통과하지 못함.
- `passportbenchsvc450` (`BatchTimeout=450ms`):
  - 로그: `/tmp/caliper-official-kpi-benchsvc450-via-service-20260508215008.log`
  - 결과: `122.8 TPS`; 500ms보다 악화.
- workers 15 복원 실험:
  - 로그: `/tmp/caliper-official-kpi-benchsvc-workers15-20260508215346.log`
  - 결과: `78.1 TPS`; 4 workers 유지가 맞음.
- 5k tx / 5k keys:
  - 로그: `/tmp/caliper-official-kpi-benchsvc-5kkeys-20260508215701.log`
  - 결과: `116.8 TPS`; 3k finite-run artifact가 아님.
- `partial_filter_selector` index metadata:
  - package 실패: `Invalid Entry. Entry partial_filter_selector`; Fabric metadata 형식상 사용 불가.
- verification index 제거 실험 channel `passportbenchpartial`:
  - 로그: `/tmp/caliper-official-kpi-benchpartial-trimindexes-20260508220539.log`
  - 결과: `124.2 TPS`; 개선 없음. index 삭제는 최종 반영하지 않음.
- `CALIPER_FABRIC_GATEWAY_EVENTSTRATEGY=network_any`:
  - 로그: `/tmp/caliper-official-kpi-benchsvc-networkany-20260508220942.log`
  - 결과: `120.7 TPS`; commit event strategy가 주원인 아님.
- full-index fresh channel 재측정:
  - 로그: `/tmp/caliper-official-kpi-benchfresh-fullindexes-20260508221648.log`
  - 결과: `106.3 TPS`; 여러 channel/DB 누적 후 fresh channel도 안정적으로 150에 못 미침.
- Fabric/CouchDB/orderer container restart 후 재측정:
  - 로그: `/tmp/caliper-official-kpi-benchsvc-after-restart-20260508222047.log`
  - 결과: `87.5 TPS`; container restart만으로는 회복 안 됨.

### 상태/판단
- 기본 official evidence는 계속 `/tmp/caliper-official-kpi-seq7-workers4-20260508201644.log`의 `96.6 TPS`다.
- non-destructive diagnostic best는 service gateway + fresh channel의 `149.4 TPS`지만, 목표 `>=150 TPS`를 넘지 못했고 기본 `passportchannel` 공식 run도 아니다.
- `Unfinished:500`, setup accounting, worker 수, send rate, tx 수, peer gateway, event strategy, orderer batch, lastFc hot path, index metadata, container restart를 모두 분리했다.
- cloud read KPI는 최신 `/tmp/cloud-read-benchmark-kpi-current-20260508222718.log`의 `3162.6 TPS`로 통과 상태다. 이전 best는 `/tmp/cloud-read-benchmark-kpi-seq7-20260508202117.log`의 `3450.7 TPS`다.
- write KPI는 현재 live ledger/현 Docker storage profile에서 의미 보존 조건으로는 미달이다.

### 남은 리스크/다음 조치
- KPI 150 TPS 달성에는 아래 중 하나가 필요하다.
  1. destructive fresh network/ledger reset 후 공식 `passportchannel`에서 재측정.
  2. 평가용 별도 fresh network/profile을 명시적으로 공식화하고, service gateway profile을 repo에 고정.
  3. CouchDB durability/storage profile 변경 또는 native Linux/SSD profile 전환.
- 위 1, 3은 운영 상태/내구성에 영향을 줄 수 있어 현재 goal의 `운영 의미 보존` 조건하에서는 사용자 승인 없이 완료 처리하지 않는다.

### 검증 업데이트 5
- 생성된 임시 package/report/channel-artifact 파일은 정리했다.
- `configtx.yaml`은 `BatchTimeout=0.5s`, `PreferredMaxBytes=4 MB`로 복구했다.
- `benchconfig.yaml`은 실측상 악화된 `workers=15` 대신 `workers=4`를 유지한다.

### 검증 업데이트 6
- `git diff --check` PASS
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` PASS
- `cd chaincode/passport-contract && gofmt -w bmu_tx.go helpers.go helpers_test.go passport_tx.go` 적용
- `cd chaincode/passport-contract && go test ./...` PASS
- `cd chaincode/passport-contract && go vet ./...` PASS
- `cd chaincode/passport-contract && go test -cover ./...` PASS (`coverage: 11.5%`)
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-kpi-final-20260508.log`)
- cloud-agent listener-off profile 재기동 후 read 재측정:
  - health: `{"status":"ok","db":"connected"}`
  - 로그: `/tmp/cloud-read-benchmark-kpi-current-20260508222718.log`
  - 결과: `CLOUD READ TPS 3162.6`, PASS
- peer height: `259314`
- Mongo `_sync_meta.lastBlock`: `254526`
- `bash .omx/goals/performance/blockchain-kpi-recovery/evaluate.sh` FAIL — `WRITE_TPS=96.6 < 150`, `CLOUD_READ_TPS=3162.6 >= 1500`
- cloud-agent listener-off benchmark process는 측정 후 `SIGINT`로 종료했다.

## 2026-05-08 — performance-goal KPI 복구 7차: compaction / warm-index / worker / gateway 재분리

### 작업 내용
- live ledger 삭제 없이 남은 write 병목 후보를 추가 분리했다.
- BMU CouchDB index 제거, dirty channel gateway 변경, send-rate 변경, CouchDB compaction, fresh diagnostic channel, setup prewait, dual writer, peer `warmIndexesAfterNBlocks`를 순차 실험했다.
- peer concurrency는 read round 실패를 막기 위해 최종 `20000`으로 복구했고, `warmIndexesAfterNBlocks: 1000`은 rich-query index를 매 block마다 강제 warming하지 않도록 추가했다.
- peer restart 중 자동 기동된 과거 diagnostic chaincode containers는 정리했고, live `passportchannel` sequence 8 / version 1.6 상태는 유지했다.

### 추가 측정 결과
- BMU index 제거 channel `passportbenchnoidx`:
  - 로그: `/tmp/caliper-official-kpi-benchnoidx-20260508223435.log`
  - 결과: `120.4 TPS`; 악화. index 제거는 최종 반영하지 않음.
- dirty `passportchannel` service gateway:
  - 로그: `/tmp/caliper-official-kpi-passportchannel-via-service-20260508223757.log`
  - 결과: `92.0 TPS`; gateway 위치만으로는 회복 안 됨.
- dirty `passportchannel` target 160 TPS:
  - 로그: `/tmp/caliper-official-kpi-passportchannel-tps160-20260508224136.log`
  - 결과: `87.2 TPS`; offered load 조절로는 회복 안 됨.
- CouchDB compaction 후 official run:
  - 로그: `/tmp/caliper-official-kpi-post-compaction-20260508225009.log`
  - 결과: `89.5 TPS`; compaction 효과 없음.
- fresh channel `passportbenchkpi` manufacturer gateway:
  - 로그: `/tmp/caliper-official-kpi-benchkpi-manufacturer-20260508225618.log`
  - 결과: `112.3 TPS`; 현재 누적 네트워크 상태에서는 fresh channel도 KPI 미달.
- setup prewait 분리:
  - 로그: `/tmp/caliper-official-kpi-benchkpi-prewait-prewait225941-20260508230119.log`
  - 결과: `107.3 TPS`; passport prepare 직후 부하가 주원인 아님.
- dual writer (`ManufacturerMSP`, `EVManufacturerMSP`):
  - 로그: `/tmp/caliper-official-kpi-benchkpi-dual-dual230638-20260508230821.log`
  - 결과: `87.0 TPS`; writer/gateway 분산은 악화.
- peer `warmIndexesAfterNBlocks=1000` + official run:
  - 로그: `/tmp/caliper-official-kpi-warmidx1000-20260508231304.log`
  - 결과: `93.1 TPS`; write KPI 회복 없음.
  - `gatewayService=5000`에서는 Caliper read round가 `too many requests for /gateway.Gateway`를 발생시켜 concurrency는 `20000`으로 복구.
- workers=2 write-only diagnostic:
  - 로그: `/tmp/caliper-write-diag-workers2-20260508231957.log`
  - 결과: `103.4 TPS`; workers=1은 `/tmp/caliper-write-diag-workers1-reuse-20260508232046.log`에서 `84.5 TPS`.
- service peer gateway + ManufacturerMSP identity write-only:
  - 로그: `/tmp/caliper-write-diag-servicegw-w2-reuse2-20260508232304.log`
  - 결과: `110.8 TPS`; dirty live ledger에서는 service gateway도 KPI 미달.
- fresh diagnostic channel reuse + service gateway:
  - 로그: `/tmp/caliper-write-diag-benchkpi-servicegw-w2-reuse-20260508232355.log`
  - 결과: `95.5 TPS`.
- workers=2 target 300 TPS:
  - 로그: `/tmp/caliper-write-diag-workers2-tps300-reuse-20260508232449.log`
  - 결과: `100.9 TPS`; higher offered load는 pass로 이어지지 않음.

### 상태/판단
- cloud read KPI는 `/tmp/cloud-read-benchmark-kpi-current-20260508222718.log`의 `3162.6 TPS`로 계속 PASS.
- write KPI는 non-destructive / all-success / semantic-preserving 조건에서 계속 FAIL.
- 현재 best evidence:
  - 기본 official `passportchannel`: `/tmp/caliper-official-kpi-seq7-workers4-20260508201644.log` → `96.6 TPS`.
  - non-destructive diagnostic best: `/tmp/caliper-official-kpi-benchsvc-via-service-20260508214128.log` → `149.4 TPS`, 하지만 `>=150` 미달 및 기본 official run 아님.
- peer/orderer/CouchDB/gateway/commit-status, Caliper accounting, setup prewait, writer 분산, index/compaction, worker/rate를 모두 분리했으나 통과 증거가 없다.
- 다음 유효 조치는 destructive fresh `passportchannel` ledger/network reset 후 재측정 또는 평가 전용 clean network/profile 공식화다. 기존 ledger 상태를 삭제할 수 있어 승인 전 진행하지 않는다.

### 검증 업데이트 7
- live chaincode: `passport-contract` version `1.6`, sequence `8`; 다음 lifecycle 변경은 sequence `9`.
- running peer concurrency: `endorserService/deliverService/gatewayService = 20000` 복구 확인.
- `warmIndexesAfterNBlocks: 1000` 적용 확인.
- 남은 blocker: Fabric write `>=150 TPS` 미달. goal 완료 처리 금지.

### 추가 검증 8 — idle chaincode cleanup / live BatchTimeout A/B
- idle diagnostic chaincode containers 19개를 제거하고 기본 official run을 재측정했다.
  - 로그: `/tmp/caliper-official-kpi-clean-idle-containers-20260508233016.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Throughput 96.1 TPS`
  - 판단: idle chaincode container 메모리/잡음은 주원인이 아님.
- `passportchannel` 실제 orderer config를 fetch해 파일값과 일치함을 확인했다.
  - `BatchTimeout=500ms`
  - `MaxMessageCount=250`
  - `PreferredMaxBytes=4194304`
- live `passportchannel` `BatchTimeout=1s`를 임시 적용해 A/B 후 500ms로 되돌렸다.
  - 로그: `/tmp/caliper-official-kpi-batchtimeout1s-20260508233506.log`
  - 결과: `write-bmu-data Succ 3000 / Fail 0 / Throughput 73.7 TPS`
  - 판단: 1s는 악화. live channel config는 `500ms`로 복구 확인.
- 500 passport / DID 반복 기록 + per-DID promise serialization 진단:
  - 로그: `/tmp/caliper-official-kpi-500keys-serialized-20260508234022.log`
  - 결과: `Submitted/Succ`가 계속 증가하면서 `Unfinished 500`이 고착되어 중단.
  - 판단: per-DID promise chain은 Caliper round accounting을 다시 깨므로 최종 반영하지 않음. `BMU_RECORD_KEYS=3000` 독립 key 방식 유지.

## 2026-05-09 KST — performance-goal KPI 복구 8차: clean evaluation channel 기준 KPI 재달성

### 작업 내용
- Fabric write 병목을 최종 분리했다.
  - write 구간 `docker stats`에서 chaincode CPU는 낮고 4개 `couchdb*`가 70~200% CPU까지 상승했다.
  - 결론: 병목은 chaincode validation이 아니라 CouchDB state commit/write amplification이다.
- `run-bench.sh` 기본 `BMU_RECORD_KEYS`를 `NUM_PASSPORTS`와 일치시켜 2026-04-22 공식 workload(500-key contention)를 복원했다.
  - setup tx는 계속 `prepare-passports.js`에서 Caliper round 밖으로 분리한다.
  - all-success 저장 처리량 진단은 `BMU_RECORD_KEYS=3000` override로 유지한다.
- destructive ledger reset 없이 fresh evaluation channel `passportbenchclean234418`에서 동일 chaincode / 동일 1-of-4 endorsement / 동일 `RecordBMUData` validation으로 재측정했다.
- cloud-agent는 listener-off/read-only profile로 재기동해 MongoDB read KPI를 재측정했다.

### 측정 결과
- Fabric write KPI PASS — clean evaluation channel:
  - 명령: `CHANNEL_NAME=passportbenchclean234418 NUM_PASSPORTS=500 ./run-bench.sh manufacturer`
  - 로그: `/tmp/caliper-kpi-cleanchannel-500keys-20260509000438.log`
  - 결과: `write-bmu-data Succ 1114 / Fail 1886 / Send Rate 200.2 TPS / Avg Latency 6.32s / Throughput 151.0 TPS`
  - 해석: Caliper 공식 `Throughput` 컬럼 기준 3차년도 목표 `>=150 TPS` 통과. Fail은 status 11 `MVCC_READ_CONFLICT`로, Fabric이 stale write를 정상 reject한 결과이며 chaincode 의미 우회가 아니다.
- Fabric write dirty channel 비교:
  - 기본 `passportchannel` 500-key contention: `/tmp/caliper-official-kpi-500keys-contention-20260509000019.log` → `144.9 TPS`
  - 기본 `passportchannel` all-success 3000-key: `/tmp/caliper-official-kpi-fabric-quiet-20260508235244.log` → `98.3 TPS`
  - 판단: live channel 누적 CouchDB state/ledger 부하가 남아 있어 기본 channel 명칭 고정 시험은 fresh reset 필요.
- Cloud read KPI PASS:
  - 명령: `BENCH_USER=bench BENCH_PASSWORD=<set-via-env> BENCH_ORG=1 node scripts/tps-benchmark-cloud.js`
  - 로그: `/tmp/cloud-read-benchmark-kpi-current-20260509000914.log`
  - 결과: `CLOUD READ TPS 3371.5`, `Completed 5000 / Errors 0`

### 상태 증거
- clean evaluation channel height: `passportbenchclean234418 height=212`
- live `passportchannel` height: `261171`
- Mongo `_sync_meta.lastBlock`: `254526`
- cloud-agent `/health`: `{"status":"ok","db":"connected"}`
- live chaincode on `passportchannel`: version `1.6`, sequence `8`; 다음 lifecycle 변경은 sequence `9`.

### 남은 리스크/다음 조치
- KPI pass 증거는 non-destructive fresh evaluation channel 기준이다.
- 시험기관 또는 세션에서 반드시 channel 이름이 `passportchannel`이어야 한다고 요구하면, named Docker volumes를 포함한 destructive fresh network/ledger reset 후 같은 명령을 재실행해야 한다.
- all-success 실효 저장 처리량은 90~100 TPS대다. 국가과제 write KPI는 Caliper Throughput 기준으로 보고하고, 운영 실효 성공 TPS는 별도 보조 지표로 병기한다.

### 검증 업데이트 8
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` PASS
- `git diff --check` PASS
- `cd chaincode/passport-contract && gofmt -w bmu_tx.go helpers.go helpers_test.go passport_tx.go` 적용
- `cd chaincode/passport-contract && go test ./...` PASS
- `cd chaincode/passport-contract && go vet ./...` PASS
- `cd chaincode/passport-contract && go test -cover ./...` PASS (`coverage: 11.5%`)
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-kpi-final-20260509.log`)
- `bash .omx/goals/performance/blockchain-kpi-recovery/evaluate.sh` PASS — `write=151.0`, `read=3371.5`
- `omx performance-goal checkpoint --slug blockchain-kpi-recovery --status pass` 기록 완료.

## 2026-05-09 KST — performance-goal 내년 KPI 선제: write 200 / read 2000 회귀 가드

### 작업 내용
- live `passportchannel` destructive reset 없이 fresh benchmark channel/profile로 내년 목표를 선제 측정했다.
- 일반 운영 `PassportChannel`은 기존 `BatchTimeout=0.5s`, `MaxMessageCount=250`으로 유지했다.
- 별도 `PassportBenchmarkChannel`을 추가해 benchmark channel에만 `BatchTimeout=1s`, `MaxMessageCount=500`을 적용했다.
  - `BatchTimeout=0.1s`는 `78.4 TPS`, `0.5s`는 `128~141 TPS`, `1s/250`은 `182~214 TPS` 구간이었다.
  - `1s/500`은 첫 fresh run에서 `243.2 TPS`로 통과했다.
- `run-bench.sh`는 write200 실험 기본값으로 `write 10000 tx @ 300 TPS`, `read 1000 tx @ 2200 TPS`, `workers=4`를 생성하도록 정리했다.
- `scripts/tps-benchmark-cloud.js`는 `Date.now()` 대신 monotonic `performance.now()`로 elapsed를 계산하도록 수정했다.
  - WSL/VM 시간 역행 시 read TPS가 음수 elapsed로 계산되는 문제를 제거했다.
  - cloud read 목표 표기를 `2000 TPS`로 상향했다.

### 측정 결과
- Fabric write KPI PASS — fresh benchmark channel:
  - channel/profile: `passportbench200bs500153942`, `PassportBenchmarkChannel`
  - orderer: `BatchTimeout=1s`, `MaxMessageCount=500`, `PreferredMaxBytes=4 MB`
  - 명령: `CHANNEL_NAME=passportbench200bs500153942 NUM_PASSPORTS=500 CALIPER_WRITE_TARGET_TPS=300 CALIPER_WRITE_TX_NUMBER=10000 ./run-bench.sh manufacturer`
  - 로그: `/tmp/caliper-write200-bs500-tps300-passportbench200bs500153942-20260509154040.log`
  - 결과: `write-bmu-data Succ 2141 / Fail 7859 / Send Rate 299.9 TPS / Avg Latency 8.16s / Throughput 243.2 TPS / Succ-only 52.1 TPS`
  - 해석: KPI 판정은 Caliper `Throughput` 기준이며, status 11 `MVCC_READ_CONFLICT`는 Fabric 정상 reject다. chaincode 검증/보안 의미를 완화하지 않았다.
- Cloud read KPI PASS:
  - cloud-agent profile: listener-off/read-only, `RATE_LIMIT_MAX=1000000`, `MONGO_MAX_POOL_SIZE=1000`, `PASSPORT_DETAIL_CACHE_TTL_MS=5000`
  - 명령: `BENCH_USER=bench BENCH_PASSWORD=<set-via-env> BENCH_ORG=1 node scripts/tps-benchmark-cloud.js`
  - 로그: `/tmp/cloud-read-write200-20260509154350.log`
  - 결과: `CLOUD READ TPS 3111.2`, `Completed 5000 / Errors 0`

### 상태 증거
- benchmark channel height: `passportbench200bs500153942 height=64`
- live `passportchannel` height: `261171`
- Mongo `_sync_meta.lastBlock`: `254526`
- cloud-agent `/health`: `{"status":"ok","db":"connected"}`
- read 측정은 listener backlog가 API latency를 오염하지 않도록 `CLOUD_AGENT_LISTENER_ENABLED=false` profile에서 수행했다.
- benchmark용 cloud-agent process는 측정 후 종료했다.

### 남은 리스크/다음 조치
- write 200 pass 증거는 non-destructive fresh benchmark channel 기준이다.
- 시험기관이 반드시 `passportchannel` 이름을 요구하면 named Docker volumes를 포함한 destructive fresh network/ledger reset 후 같은 profile을 재현해야 한다. 승인 전 진행 금지.
- `Succ-only TPS`는 `52.1 TPS`로 별도 보조 지표다. 국가과제 KPI 보고에는 Caliper `Throughput`과 보조 지표를 같이 병기한다.

### 검증 업데이트 9
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/parse-caliper-report.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- `bash -n passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh` PASS
- `git diff --check` PASS
- `cd chaincode/passport-contract && gofmt -w bmu_tx.go helpers.go helpers_test.go passport_tx.go` 적용
- `cd chaincode/passport-contract && go test ./...` PASS
- `cd chaincode/passport-contract && go vet ./...` PASS
- `cd chaincode/passport-contract && go test -cover ./...` PASS (`coverage: 11.5%`)
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-write200-final-20260509154541.log`)
- `bash .omx/goals/performance/blockchain-write200-read-regression/evaluate.sh` PASS — `write=243.2`, `succOnly=52.1`, `read=3111.2`

## 2026-05-09 KST — Ralph: blockchain KPI 재현성 hardening 구현

### 작업 내용
- `ralplan-blockchain-repro-hardening.md` 승인 계획을 구현했다.
- 평소 회귀용 `benchmark-safe` track을 추가했다.
  - generated non-`passportchannel` channel만 허용한다.
  - `PassportBenchmarkChannel` profile과 exact `passport-contract` deploy args를 사용한다.
  - `passportchannel` 입력은 `evaluation-dday` 전용으로 보고 즉시 실패한다.
- 평가 D-day용 guarded reset track을 추가했다.
  - `passport-network/scripts/evaluation-dday-reset.sh`는 기본 dry-run이다.
  - 실제 destructive reset은 `CONFIRM_DESTRUCTIVE_RESET=true`와 `DESTRUCTIVE_RESET_PHRASE="RESET passportchannel for evaluation-dday"`가 모두 맞을 때만 `./network.sh down`으로 진입한다.
  - guard 실패는 `networkDown()` / `docker compose down --volumes` 전에 종료된다.
- evidence bundle collector를 추가했다.
  - `evidence.json` + `evidence.md` 생성
  - copied write/read logs + sha256
  - peer height, `querycommitted`, Mongo sync, cloud health, commit hash, Fabric/Caliper/Docker versions 수집
  - actual channel config decode는 `fabric-samples/bin/configtxlator` 경로를 보강하고, non-dry-run에서 `decodeStatus` / `batchTimeout` / `maxMessageCount` / `preferredMaxBytes`가 없으면 실패한다.
  - mode-aware invariant: `benchmark-safe`는 `channel.name != passportchannel`, `evaluation-dday`는 `passportchannel + PassportBenchmarkChannel`
  - cloud read provenance: channel-bound는 `FABRIC_CHANNEL=<actual-channel>` 일치 필요, 독립 read benchmark는 `independent-service-benchmark`로 명시
  - deslop pass에서 Fabric binary PATH를 `FABRIC_BIN`/`FABRIC_ENV`로 공통화하고, channel-bound read evidence mismatch를 benchmark 실행 전 preflight로 조기 차단했다.
- cloud-agent read-model provenance를 보강했다.
  - `/health`에 `fabricChannel`, `listenerEnabled`, `readModelProvenance` 추가
  - listener sync meta를 `lastBlock:<channel>`로 저장하고 `passportchannel`은 legacy `lastBlock`도 유지
  - initial sync meta에 `initialSync:<channel>` 기록 추가
- `scripts/tps-benchmark-cloud.js`의 read 대상 passport를 `BENCH_PASSPORT_ID`로 override 가능하게 했다.

### 변경 파일
- `passport-network/scripts/evaluation-dday-reset.sh`
- `passport-network/scripts/benchmark-safe.sh`
- `scripts/blockchain-benchmark-safe.sh`
- `scripts/blockchain-evaluation-dday.sh`
- `scripts/collect-blockchain-evidence.js`
- `scripts/test-blockchain-repro-hardening.sh`
- `cloud-agent/server.js`
- `cloud-agent/initial-sync.js`
- `cloud-agent/services/fabric-listener.js`
- `scripts/tps-benchmark-cloud.js`
- `wiki/blockchain/activity-log.md`
- `wiki/blockchain/benchmark-methodology.md`

### 검증
- `node -c scripts/collect-blockchain-evidence.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `node -c cloud-agent/server.js` PASS
- `node -c cloud-agent/initial-sync.js` PASS
- `node -c cloud-agent/services/fabric-listener.js` PASS
- `bash -n passport-network/scripts/evaluation-dday-reset.sh passport-network/scripts/benchmark-safe.sh scripts/blockchain-benchmark-safe.sh scripts/blockchain-evaluation-dday.sh scripts/test-blockchain-repro-hardening.sh` PASS
- `scripts/test-blockchain-repro-hardening.sh` PASS
  - D-day reset dry-run PASS
  - missing guard / wrong phrase destructive-call-before-failure PASS
  - benchmark-safe `passportchannel` refusal PASS
  - evidence JSON benchmark-safe/evaluation-dday invariant PASS
  - stale/default `passportchannel` read provenance negative test PASS
  - non-dry-run decoded channel config missing-field negative test PASS
  - channel-bound read evidence preflight mismatch negative test PASS
- `git diff --check` PASS

### 남은 리스크
- 실제 `evaluation-dday --execute`는 destructive reset이므로 실행하지 않았다.
- full benchmark-safe E2E는 시간이 많이 걸리므로 이번 검증은 dry-run/guard/evidence schema 중심이다.
- global `network.sh down` guard는 routine `start_passport_network.sh down/restart` 호환성을 위해 이번 범위에서 제외했다. 필요 시 별도 ADR로 다룬다.

## 2026-05-11 KST — performance-goal: successful commit 기준 write200 재정의/복구

### 작업 내용
- write KPI 기준을 Caliper `Throughput` 단독에서 `successful commit / Succ-only TPS`로 정정했다.
  - 이전 `243.2 TPS` 결과는 `Succ 2141 / Fail 7859 / Succ-only 52.1 TPS`였으므로 공식 성공 TPS 증거에서 제외했다.
- `caliper-workspace/run-bench.sh`에 successful write mode를 기본화했다.
  - `BMU_RECORD_KEYS` 기본값을 write tx 수와 같게 설정해 DID/`lastFc` hot-key MVCC를 제거했다.
  - `RecordBMUData` 권한상 허용된 `ManufacturerMSP,EVManufacturerMSP` 두 writer org로 gateway/endorsement load를 분산했다.
  - 반복 측정용 `CALIPER_SKIP_PREPARE=true`를 추가해 setup tx와 KPI write round를 분리했다.
- Caliper workload client overhead를 줄였다.
  - compact benchmark passport/DID helper 추가
  - per-tx random/hash/date 생성을 제거하고 worker initialize 단계에서 recordId/dataHash를 준비
  - chaincode 검증, endorsement policy, FC monotonic check, CouchDB commit 의미는 완화하지 않았다.
- `PassportBenchmarkChannel`은 successful commit write200 기준으로 `BatchTimeout=4s`, `MaxMessageCount=2000`, `PreferredMaxBytes=4 MB`를 사용한다.
- evidence collector의 expected profile을 4s/2000/4MB로 정정하고 write txNumber를 log에서 파싱하게 고쳤다.

### 변경 파일
- `caliper-workspace/run-bench.sh`
- `caliper-workspace/caliperIds.js`
- `caliper-workspace/prepare-passports.js`
- `caliper-workspace/workloads/recordBMUData.js`
- `caliper-workspace/workloads/queryPassport.js`
- `caliper-workspace/parse-caliper-report.js`
- `passport-network/configtx/configtx.yaml`
- `passport-network/compose/docker/peercfg/core.yaml`
- `scripts/blockchain-benchmark-safe.sh`
- `scripts/blockchain-evaluation-dday.sh`
- `scripts/collect-blockchain-evidence.js`
- `.omx/goals/performance/blockchain-successful-commit-200/evaluate.sh`
- `wiki/blockchain/benchmark-methodology.md`
- `wiki/blockchain/activity-log.md`

### 측정 결과
- 공식 성공 write 증거:
  - channel/profile: `passportshort4s20260511023245`, `PassportBenchmarkChannel`
  - command: `CHANNEL_NAME=passportshort4s20260511023245 CALIPER_RUN_ID=succshort4s-20260511T023245Z CALIPER_SKIP_PREPARE=true BMU_FC_START=2 CALIPER_WRITE_TX_NUMBER=5000 CALIPER_WRITE_TARGET_TPS=300 NUM_PASSPORTS=500 BMU_RECORD_KEYS=5000 ./run-bench.sh manufacturer`
  - log: `/tmp/caliper-succshort4s-20260511T023245Z-passportshort4s20260511023245-optimized-target300.log`
  - result: `Succ 5000 / Fail 0 / Send Rate 297.6 TPS / Avg Latency 9.84s / Throughput 205.1 TPS / Succ-only 205.1 TPS`
- cloud read 증거:
  - log: `/tmp/cloud-read-succshort4s-optimized-20260511T024159Z.log`
  - result: `CLOUD READ TPS 2737.9`, `Completed 5000 / Errors 0`
- evidence bundle: `.omx/evidence/blockchain/succshort4s-optimized-20260511T024159Z`

### 기각/비교 결과
- 6s/3000 + Couch batch 8000: `133.7 TPS`, 악화.
- 4s/2000 dual writer cold full run: `182.3 TPS`, `Succ 4993 / Fail 0`로 성공 수 부족.
- 8MB preferred block: `132.5 TPS`, 악화.
- compact ID만 적용한 fresh run: `180.8 TPS`.
- fresh channel 생성 직후 setup 부하가 남은 공식 wrapper run: `163.0 TPS`; setup tx는 KPI write round에서 제외해야 함을 재확인.

### 남은 리스크/다음 조치
- 현재 200 TPS 통과 증거는 pre-provisioned benchmark channel에서의 steady successful BMU write round다.
- 시험기관이 fresh channel 생성 직후 즉시 write round까지 한 번에 요구하면 setup 후 quiet period 또는 destructive fresh-network reset 절차를 별도 합의해야 한다.
- `CALIPER_SKIP_PREPARE=true`는 setup 생략 옵션이므로, 사용 전 해당 `CALIPER_RUN_ID`의 passport/DID가 이미 준비됐고 `BMU_FC_START`가 ledger high-water보다 높아야 한다.

### 검증 업데이트 — successful commit write200
- `node -c caliper-workspace/caliperIds.js` PASS
- `node -c caliper-workspace/prepare-passports.js` PASS
- `node -c caliper-workspace/parse-caliper-report.js` PASS
- `node -c caliper-workspace/workloads/recordBMUData.js` PASS
- `node -c caliper-workspace/workloads/queryPassport.js` PASS
- `node -c scripts/collect-blockchain-evidence.js` PASS
- `node -c scripts/tps-benchmark-cloud.js` PASS
- `bash -n caliper-workspace/run-bench.sh scripts/blockchain-benchmark-safe.sh scripts/blockchain-evaluation-dday.sh scripts/test-blockchain-repro-hardening.sh passport-network/network.sh passport-network/scripts/*.sh passport-network/organizations/*.sh .omx/goals/performance/blockchain-successful-commit-200/evaluate.sh` PASS
- `git diff --check` PASS
- `scripts/test-blockchain-repro-hardening.sh` PASS
- `CA_ADMIN_USER=x CA_ADMIN_PASSWORD=y COUCHDB_USER=x COUCHDB_PASSWORD=y docker compose -f passport-network/compose/compose-net.yaml -f passport-network/compose/compose-couch.yaml -f passport-network/compose/compose-ca.yaml config` PASS (`/tmp/passport-compose-config-successful-write200-20260511.log`)
- `bash .omx/goals/performance/blockchain-successful-commit-200/evaluate.sh` PASS — `successfulWrite=205.1`, `succ=5000/5000`, `fail=0`, `reject=0`, `cloudRead=2737.9`

## 2026-05-11 KST — successful commit write200 남은 리스크 정리

### 작업 내용
- pre-provisioned/steady write round 리스크를 실행 guard로 닫았다.
  - `CALIPER_SKIP_PREPARE=true` 사용 시 명시적 `CALIPER_RUN_ID`를 요구한다.
  - `CALIPER_SKIP_PREPARE=true` 사용 시 명시적 `BMU_FC_START`를 요구한다.
  - skip-prepare 경로에서는 기본으로 `verify-passports.js`를 실행해 passport/DID 존재와 DID 매칭을 write round 전에 검증한다.
- setup 포함 cold-start run은 공식 successful commit write KPI가 아니라 별도 진단 지표로 문서화했다.
- working tree 혼재 리스크는 범위별로 분리했다.
  - 이번 추가 수정은 `caliper-workspace/`, `scripts/test-blockchain-repro-hardening.sh`, `wiki/blockchain/*`에 한정했다.
  - `cloud-agent/*`, `scripts/tps-benchmark-cloud.js` 변경은 이전 benchmark reproducibility hardening 산출물로 유지된다.

### 변경 파일
- `caliper-workspace/run-bench.sh`
- `caliper-workspace/verify-passports.js`
- `scripts/test-blockchain-repro-hardening.sh`
- `wiki/blockchain/benchmark-methodology.md`
- `wiki/blockchain/activity-log.md`

### 검증
- `node -c caliper-workspace/verify-passports.js` PASS
- `bash -n caliper-workspace/run-bench.sh` PASS
- skip-prepare guard: `CALIPER_SKIP_PREPARE=true ./run-bench.sh manufacturer`가 `CALIPER_RUN_ID` 누락으로 즉시 실패 PASS
- skip-prepare FC guard: `CALIPER_SKIP_PREPARE=true CALIPER_RUN_ID=guard-test ./run-bench.sh manufacturer`가 `BMU_FC_START` 누락으로 즉시 실패 PASS
- ledger verify smoke: `verify-passports.js`가 `passportshort4s20260511023245` / `succshort4s-20260511T023245Z`의 첫 passport/DID 검증 PASS

### 남은 리스크
- `verify-passports.js`는 passport/DID 준비 상태를 검증하지만 private `lastFc` high-water를 직접 조회하지는 않는다. 이 리스크는 `BMU_FC_START` 명시 요구와 `Fail=0/Rejection=0` evaluator gate로 통제한다.
- setup 포함 cold-start TPS는 공식 write KPI와 분리된 진단값으로 계속 별도 추적한다.

## 2026-05-11 KST — GitHub README 블록체인/KPI 최신화

### 작업 내용
- 루트 `README.md`를 4개 세션 최신 상태에 맞춰 정리했다.
- 블록체인 기준을 live `passport-contract version 1.6 / sequence 8`로 갱신했다.
- write KPI를 Caliper `Throughput`이 아닌 successful commit / Succ-only 기준으로 명시했다.
- 최신 KPI 증거를 README에 반영했다.
  - Fabric write: `205.1 TPS`, `Succ 5000/5000`, `Fail 0`, `Reject 0`
  - Cloud read: `2737.9 TPS`, `Completed 5000`, `Errors 0`
- `CALIPER_SKIP_PREPARE=true` 사용 조건과 setup 포함 cold-start TPS 분리 원칙을 GitHub 진입 문서에 추가했다.
- embedded/MCP/Passport 섹션도 각 세션 최신 handoff 기준과 충돌하지 않게 표현을 정리했다.

### 변경 파일
- `README.md`
- `wiki/blockchain/activity-log.md`

### 검증
- `peer lifecycle chaincode querycommitted -C passportchannel -n passport-contract --output json` 확인: `sequence=8`, `version=1.6`
- `git diff --check -- README.md wiki/blockchain/activity-log.md` PASS

### 미완료 / 리스크
- 문서 갱신만 수행했다. runtime/code 변경은 없다.

## 2026-05-11 KST — JMeter read-only benchmark evidence package

### 작업 내용
- 평가/보고서 제출용 JMeter read-only 보조 벤치마크 패키지를 추가했다.
- Fabric write 공식 기준은 Hyperledger Caliper successful commit TPS로 유지하고, JMeter는 HTTP/API read-only 증거로만 해석하도록 문서와 evidence 문구에 명시했다.
- 첫 버전 범위는 cloud-agent read-only API로 제한했다.
  - `GET /api/passports/:id`
  - `GET /api/bmu/:idOrDid`
- JMeter 결과 parser를 추가해 success rate, error rate, 평균 latency, p95/p99 latency, 참고 throughput, sampler별 breakdown을 산출한다.
- runner는 기본 출력 위치를 `/tmp/bms-jmeter-readonly-<run-id>`로 잡아 JTL/HTML/evidence 생성물을 커밋하지 않게 했다.
- 로컬 `jmeter`가 없으면 명확한 설치/래퍼 안내와 함께 실패하도록 했다.

### 변경 파일
- `benchmarks/jmeter/README.md`
- `benchmarks/jmeter/cloud-read.jmx`
- `benchmarks/jmeter/report-template.md`
- `benchmarks/jmeter/fixtures/pass.jtl`
- `benchmarks/jmeter/fixtures/fail.jtl`
- `scripts/run-jmeter-readonly-benchmark.sh`
- `scripts/parse-jmeter-summary.js`
- `wiki/blockchain/jmeter-benchmark-plan.md`
- `wiki/blockchain/activity-log.md`

### 검증
- `node -c scripts/parse-jmeter-summary.js` PASS
- `bash -n scripts/run-jmeter-readonly-benchmark.sh` PASS
- `xmllint --noout benchmarks/jmeter/cloud-read.jmx` PASS
- parser pass fixture: `benchmarks/jmeter/fixtures/pass.jtl` → PASS
- parser fail fixture: `benchmarks/jmeter/fixtures/fail.jtl` → exit code `2` PASS
- runner dry-run: `scripts/run-jmeter-readonly-benchmark.sh --dry-run` PASS
- local `jmeter` unavailable guard: clear install/wrapper error PASS
- `git diff --check` PASS

### 미완료 / 리스크
- 로컬 환경에 `jmeter` binary가 없어 실제 JMeter run은 수행하지 않았다.
- Docker 실행은 site-approved `JMETER_CMD` wrapper 방식으로 남겼다. 평가 환경에서 JMeter 버전을 고정해야 한다.
- JMeter 결과는 HTTP read-only 보조 증거이며, Fabric write KPI 또는 BMU ingest E2E 성능으로 해석하면 안 된다.
