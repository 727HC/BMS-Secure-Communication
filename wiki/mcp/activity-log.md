---
title: "MCP 세션 활동 로그"
date: 2026-04-06
tags: [mcp, log]
doc_type: log
status: historical
---
# MCP 세션 — 활동 로그

> 과거 기준 기록
>
> 이 문서는 MCP 세션의 시계열 작업 로그를 보존한다.
> 현재 구조/정책 설명은 [[mcp/overview|세션 개요]]와 [[mcp/README|mcp 허브]]를 먼저 본다.

> 세션(컨텍스트) 단위로 기록. 컨텍스트가 차서 다음 세션으로 넘어갈 때 작성.

---

## Session 1 (2026-04-02 ~ 04-06)

### 요약
Codex CLI로 mcp-monitor 전체 코드 리뷰 → 13건 수정 → Claw Code/system-prompts 분석 → Hook 시스템 구축 → 위키 보충

### 작업 내용
1. **Codex 코드 리뷰** — mcp-monitor/ 전체 8개 소스 파일 정적 분석, 체인코드 인터페이스 크로스체크
2. **13건 버그/이슈 수정** (커밋: `44e442a`)
   - H1: admin 자동등록 제거 (fabric-ca-client 삭제)
   - H2: 로그 이중 카운트 → Set 기반 중복제거
   - H3: recent 액션 → 로그 기반 전환 (pseudo-event 제거)
   - H4: TPS 통계 → function/action 있는 로그만 카운트
   - H5: INVALIDATED BMU 레코드 필터링
   - MH6: 에러 시그널링 throw 통일 (전 도구)
   - MH7: getOrgConfig() 환경변수 검증
   - M8: VC RBAC dataScope 표시
   - M9: typeStats.total 계산 순서 수정
   - M10: 미구현 '검증' 설명 제거
   - M11: 입력 검증 강화 (int/min/max + cross-validation)
   - L12: ps aux grep 패턴 정확도 향상
   - L13: 데드코드/미사용 패키지 제거
3. **외부 레포 분석** — Claw Code (클린룸 Claude Code 재구현), claude-code-system-prompts (시스템 프롬프트 추출)
4. **워크플로우 패턴 적용**
   - CLAUDE.md 계층: 루트 `CLAUDE.md` + `mcp-monitor/CLAUDE.md`
   - Hook 4종: SessionStart(범위 주입), PreToolUse(세션 격리), PostToolUse(구문 검증), PostCompact(상태 보존)
   - Verification Protocol, Subagent 위임 규칙 CLAUDE.md에 명시
5. **위키 보충** — `wiki/mcp/overview.md` 전면 보강, `wiki/common/architecture.md` MCP 레이어 추가, `wiki/common/terminology.md` MCP 용어 8개 추가

### 변경 파일
- `mcp-monitor/src/**` — 7개 소스 파일 (fabric-client, log-reader, tx/bmu/vc/system-status monitor, index)
- `mcp-monitor/package.json` + `package-lock.json`
- `mcp-monitor/CLAUDE.md` (신규)
- `mcp-monitor/.claude/` (신규) — settings.json + hook 스크립트 4개
- `CLAUDE.md` (루트, 신규)
- `wiki/mcp/overview.md`, `wiki/common/architecture.md`, `wiki/common/terminology.md`

### 다음 세션 이어갈 것
- Hook이 `mcp-monitor/` cwd에서 시작해야 활성화 — 다음 세션에서 확인
- bms-wiki MCP 서버(wiki_search, wiki_read, wiki_activity) 연동 테스트
- 실제 Fabric 네트워크 올려서 mcp-monitor 통합 테스트 (live 환경)

### 교훈
- Codex CLI가 코드 리뷰에 효과적 — 체인코드 인터페이스까지 크로스체크
- Hook stdin은 JSON → jq 파싱 필수, additionalContext로 모델에 직접 주입 가능
- 다른 세션들은 hook/CLAUDE.md 패턴 도입 거부 — MCP 세션이 선도 적용
- 외부 오픈소스 분석은 document-specialist 에이전트가 효율적

---

## Session 2 (2026-04-18)

### 요약
OMC 플러그인 업데이트 → MCP 서버로 시스템 상태 확인 → C3 git history 정리 협업(filter-repo 부작용 처리) → `.env.example` dead var 삭제 커밋/푸시

### 작업 내용
1. **OMC 플러그인 업데이트** — `claude plugin update oh-my-claudecode@omc` 로 4.9.3 → 4.11.4 (재시작 필요)
2. **시스템 상태 모니터링 실행** — `system_status.overview` 호출로 인프라 점검
   - Fabric healthy, 25/25 컨테이너 가동, 4 peer + 1 orderer + 5 CA + 4 CouchDB
   - Agent running (ManufacturerMSP, passportchannel), VON + ACA-Py 정상
3. **C3 filter-repo 협업** — 블록체인 세션 주도의 시크릿 history 정리
   - 세션 lock (MCP 소스 변경 없음 확인, origin 동기화 상태로 lock OK 회신)
   - filter-repo 완료 후 `git fetch + reset --hard origin/master` 로 재동기화
   - `mcp-monitor/.env` gitignored라 보존됨 (백업/복원 검증 완료)
   - `npm install` 재실행, 7개 파일 구문 검증 PASS, JSON-RPC `tools/list`로 4 도구 정상 등록 확인
4. **filter-repo 부작용 정리** — `FABRIC_ADMIN_SECRET=REMOVED_SECRET_ROTATED_2026_04_18` 치환
   - adversarial grep: MCP 코드에서 `FABRIC_ADMIN_SECRET` 참조 0건 확인
   - ADR 003 (fabric-ca-client 제거, read-only 원칙) 근거로 placeholder가 아닌 **완전 삭제** 판정
   - 블록체인 세션이 Option 1 삭제 승인, 커밋 `20e676b` push
5. **로컬 .env dead var 제거** — `mcp-monitor/.env:10` `FABRIC_ADMIN_SECRET=LEGACY_DEFAULT_SECRET` 삭제
   - dotenv injection 37 → 36 감소로 검증
   - 서버 재기동 후 `fabric: healthy` 유지 확인

### 변경 파일
- `mcp-monitor/.env.example` — `FABRIC_ADMIN_SECRET` 라인 1건 삭제 (commit `20e676b`)
- `mcp-monitor/.env` — 로컬 dead var 제거 (gitignored, commit 없음)

### 커밋 이력
- `20e676b fix(mcp): filter-repo 부작용 정리 — .env.example dead var 삭제`

### 다음 세션 이어갈 것
- Hook activation 실검증 (`mcp-monitor/` cwd에서 Claude Code 시작 시 4 hook 동작 확인)
- bms-wiki MCP 서버 연동 테스트 (Session 1부터 이월)
- Live Fabric 통합 테스트 — 지금 인프라 Up 상태이므로 실 쿼리 검증 가능
- `npm audit` 검토 (install 후 11건 취약점 보고: low 2, moderate 4, high 3, critical 2)
- OMC 4.11.4 재시작 후 새 기능 반영 여부 확인

### 교훈
- **adversarial probe가 가이드 준수를 이긴다** — 전 세션 공통 가이드(`CHANGE_ME_...` placeholder)를 무조건 수용하지 않고 실제 코드 참조 확인 → 삭제가 정답이라는 증거 기반 결론
- ADR이 살아있는 근거로 작동 — `wiki/decisions/003` 덕분에 "fabric-ca-client 제거가 왜 일관된 결정인지" 논거 제시 가능
- filter-repo는 문자열 치환이라 **코드 로직까지 영향** — 블록체인 세션이 리뷰로 잡았지만, 각 세션이 자기 영역 재검증하는 루틴 필요
- `.env`는 gitignored지만 dead var는 로컬에서도 정리해야 "시크릿 제거" 목표와 일치 — 운영자 영역이라도 세션 스코프 안이면 자가 정리
- `git log -5 --oneline -- path/` 형태는 `--` 없이 쓰면 revision parse 실패 — path 분리자 기본 사용

---

## Session 3 (2026-05-08)

### 요약
Passport 세션 handoff의 MCP 요청을 수신해 `mcp-monitor`에 Passport 3차년도 관찰 표면을 추가했다. 원장/Passport 업무 데이터 쓰기 없이 `/api/status`, `/api/audit` 또는 `logs/audit.log` 기반으로 BMU/VC/error trend를 확인한다.

### 작업 내용
1. **신규 도구 추가** — `monitor_passport`
   - `status`: `GET /api/status` live probe
   - `audit`: `GET /api/audit` 또는 local `logs/audit.log` fallback
   - `trends`: BMU record count, invalidation, ingestion error rate, freshness counter anomaly, VC verification trend, regulatory/physical verification status, validation category, chaincode `INTERNAL` trend 집계
   - `observation_plan`: 3차년도 기능시험 관찰 항목, pass/fail 기준, alert/handoff payload 예시
2. **읽기 전용 유지**
   - HTTP는 `GET`만 사용
   - `PASSPORT_AUDIT_TOKEN`은 외부 사전 발급 JWT만 사용, login/password flow 없음
   - `submitTransaction`/axios write method 없음 확인
3. **민감값 보호**
   - MCP 출력에서 `password/token/secret/signature/rawPayload/privateKey/authorization` 추가 redaction
4. **문서 갱신**
   - `mcp-monitor/README.md` 도구/환경변수/검증 절차 업데이트
   - `wiki/mcp/overview.md` 현재 기준 도구 표면 업데이트

### 변경 파일
- `mcp-monitor/src/index.js`
- `mcp-monitor/src/tools/passport-monitor.js`
- `mcp-monitor/.env.example`
- `mcp-monitor/README.md`
- `wiki/mcp/overview.md`
- `wiki/mcp/activity-log.md`

### 검증
- `cd mcp-monitor && node -c src/index.js && node -c src/utils/fabric-client.js && node -c src/utils/log-reader.js && node -c src/tools/tx-monitor.js && node -c src/tools/bmu-monitor.js && node -c src/tools/vc-monitor.js && node -c src/tools/system-status.js && node -c src/tools/passport-monitor.js` — PASS
- `cd mcp-monitor && npm ls --depth=0` — PASS
- JSON-RPC `tools/list` — `monitor_passport` 등록 확인 PASS
- JSON-RPC `monitor_passport.observation_plan` — 관찰 항목/검증 기준 반환 PASS
- JSON-RPC `monitor_passport.status` — `/api/status` HTTP 200, `fabric=connected`, `org=ManufacturerMSP` PASS
- JSON-RPC `monitor_passport.trends` — local audit fallback, BMU/VC/error trend 반환 PASS
- Node assert probe — BMU 실패, freshness anomaly, VC verification trend 탐지 PASS
- `grep -R -E "submitTransaction[[:space:]]*\(|axios\.(post|put|patch|delete)[[:space:]]*\(" -n mcp-monitor/src` — write-call 없음 PASS

### 미완료 / 리스크
- `/api/audit` API 경로는 `PASSPORT_AUDIT_TOKEN`이 없으면 호출하지 않고 local log fallback을 사용한다. 운영 identity는 Passport 세션과 별도 합의 필요.
- 현재 live 로그에는 BMU freshness counter 실패가 관찰된다. 임베디드/Passport handoff 대상으로 분류해야 한다.
- 대규모 부하/공인시험 임계값은 아직 별도 QA 목표에서 확정해야 한다.

### 교훈
- Passport 감사 로그가 실제로는 `rawPayload`를 포함할 수 있어 MCP 출력 단계 redaction이 필요했다.
- read-only 검증은 문자열 존재 grep보다 실제 write-call expression grep으로 해야 false positive를 줄일 수 있다.

---

## Session 4 (2026-05-08)

### 요약
블록체인/체인코드 리뷰에서 전달된 rich-query fail-closed 변경을 MCP monitor에 반영했다. `docType` mismatch, typed state loader 오류, malformed rich-query decode 오류가 보조 Fabric query 경로에서 더 이상 조용히 skip되지 않고 응답에 드러난다.

### 작업 내용
1. **query error 정규화 유틸 추가**
   - `DOC_TYPE_MISMATCH`, `DECODE_FAILURE`, `FABRIC_EVALUATE_ERROR`, `MONITOR_CONFIGURATION_ERROR`, `QUERY_ERROR` 분류
   - `function`, `target`, `message` 포함
2. **silent fallback 제거**
   - `monitor_transactions`: Fabric enrich/passport count/search 실패를 `fabricQuery.errors[]`에 노출
   - `monitor_bmu`: passport scan 및 per-passport BMU query 실패를 `fabricQuery.errors[]`에 노출
   - `monitor_vc`: credential passport/type query 실패를 `fabricQuery.errors[]`와 type별 `error`에 노출
   - `system_status`: Fabric connectivity probe 실패를 `fabricQuery.errors[]`에 노출
3. **문서 갱신**
   - `mcp-monitor/CLAUDE.md`, `mcp-monitor/README.md`, `wiki/mcp/overview.md`에 query error 노출 원칙 반영

### 변경 파일
- `mcp-monitor/src/utils/query-errors.js`
- `mcp-monitor/src/tools/tx-monitor.js`
- `mcp-monitor/src/tools/bmu-monitor.js`
- `mcp-monitor/src/tools/vc-monitor.js`
- `mcp-monitor/src/tools/system-status.js`
- `mcp-monitor/CLAUDE.md`
- `mcp-monitor/README.md`
- `wiki/mcp/overview.md`
- `wiki/mcp/activity-log.md`

### 검증
- `node -c` 대상 전체 PASS
- monkey patch 회귀 검증: `fabricClient.evaluate`가 `state type mismatch`를 throw할 때 tx/bmu/vc/system 응답에 `fabricQuery.errors[].type = DOC_TYPE_MISMATCH` 노출 PASS
- silent catch 검색: `catch { /* ignore */`, `query failed`, `Fabric unavailable` 잔여 없음 PASS

### 미완료 / 리스크
- 실제 malformed ledger document 주입은 MCP 세션의 read-only 원칙상 수행하지 않았다. 대신 throw monkey patch로 fail-closed error surface를 검증했다.
- primary query 경로는 기존처럼 MCP `isError`로 실패한다. secondary/enrichment query 경로는 partial result + `fabricQuery.errors[]`를 반환한다.

---

## Session 5 (2026-05-08)

### 요약
Passport/bmu-agent validation error 표면 확장 전달을 MCP `monitor_passport` 관찰 항목에 반영했다. read-only 원칙을 유지하면서 VC issue 실패와 BMU ingestion 실패를 분리하고, validation category count를 세분화했다.

### 작업 내용
1. **validation category count 세분화**
   - `VC_HOLDER_DID_MISMATCH`
   - `MALFORMED_EXPIRES_AT`
   - `MALFORMED_TIMESTAMP`
   - `INVALID_DATA_HASH`
   - `MISSING_SIGNATURE`
   - `DID_MISMATCH`
   - `BMU_FRESHNESS_COUNTER`
   - `CHAINCODE_INTERNAL`
2. **VC/BMU 실패 추세 분리**
   - `trends.vc.issueFailureTrend`
   - `trends.bmu.ingestionFailureTrend`
   - 기존 `trends.bmu.ingestionErrorRate` 유지
3. **verification status 변화 관찰 보강**
   - regulatory/physical status change category 집계 추가
4. **alert payload 예시 추가**
   - `MCP-PASSPORT-BMU-VALIDATION-SPIKE`
   - `MCP-PASSPORT-VC-ISSUE-VALIDATION`
   - `MCP-PASSPORT-VERIFICATION-STATUS-DRIFT`
5. **문서 갱신**
   - `mcp-monitor/README.md`
   - `wiki/mcp/overview.md`

### 변경 파일
- `mcp-monitor/src/tools/passport-monitor.js`
- `mcp-monitor/README.md`
- `wiki/mcp/overview.md`
- `wiki/mcp/activity-log.md`

### 검증
- `node -c src/tools/passport-monitor.js` — PASS
- validation category regression probe — holder DID mismatch, malformed expiresAt, malformed timestamp, invalid dataHash, missing signature, DID mismatch, freshness counter, chaincode INTERNAL 분류 PASS
- JSON-RPC `monitor_passport.status` — `GET /api/status`, `fabric=connected`, read-only PASS
- JSON-RPC `monitor_passport.audit(source=auto)` — `PASSPORT_AUDIT_TOKEN` 없음으로 API 미호출, local audit fallback, read-only PASS
- JSON-RPC `monitor_passport.observation_plan` — 신규 VC/BMU validation alert 포함 PASS
- JSON-RPC `monitor_passport.trends` — `validationErrorCategoryCount`, `vc.issueFailureTrend`, `bmu.ingestionFailureTrend`, verification status category 필드 존재 PASS
- read-only grep — `submitTransaction`, axios write method 없음 PASS
- `git diff --check -- mcp-monitor wiki/mcp` — PASS

### 미완료 / 리스크
- `/api/audit` 직접 API 조회는 여전히 `PASSPORT_AUDIT_TOKEN` 운영 identity가 필요하다. 토큰 없을 때 MCP는 API 호출하지 않고 local `logs/audit.log` fallback만 사용한다.
- 감사 로그는 `signature/rawPayload/token` 등을 MCP 출력 단계에서도 redaction하므로 원문 payload 디버깅 용도로 쓰지 않는다.

### Session 5 추가 반영 — Embedded handoff
- 임베디드 전달사항에 따라 BMU validation category를 추가 분리했다.
  - `INVALID_RAW_PAYLOAD`
  - `BMS_BINDING_CODE_ZERO`
  - `BMS_BINDING_CODE_MISMATCH`
  - 기존 `BMU_FRESHNESS_COUNTER`는 stale FC 관찰 항목으로 명시
- alert payload 예시 `MCP-PASSPORT-BMU-BINDING-CODE` 추가.
- 문서에 rawPayload bytes 44..47 `bmsBindingCode32` 관찰 주의와 redaction 전제를 반영했다.

### Session 5 추가 반영 — BMU monitoringEvents 분리
- `monitor_passport.trends`에 `trends.bmu.monitoringEvents`를 추가해 아래 항목을 독립 표시한다.
  - `missingSignature`
  - `invalidRawPayload`
  - `staleFC`
  - `didMismatch`
  - `bindingCode` (`BMS_BINDING_CODE_ZERO`, `BMS_BINDING_CODE_MISMATCH`)
- 각 event에 `count`, `byCategory`, `byHour`, `recent`, `evidencePath`를 포함한다.
- 3차년도 증적 경로는 `BMU -> Agent -> Fabric -> Passport/MCP`로 명시했다.

---

## Session 6 (2026-05-11)

### 요약
GitHub 루트 README에 MCP read-only 모니터링 섹션을 추가했다. Passport/BMS binding 확장, Sequence 3 tx, validation event, 3차년도 증적 경로를 공개 문서에서 바로 확인할 수 있게 했다.

### 작업 내용
- 구성 표의 MCP 설명을 Fabric 단독 관찰에서 Fabric/Passport/API/로그 read-only 관찰로 확장했다.
- `monitor_transactions`, `monitor_bmu`, `monitor_vc`, `system_status`, `monitor_passport` 역할을 요약했다.
- BMU validation events를 분리 표기했다: missing signature, invalid rawPayload, stale FC, DID mismatch, binding code zero/mismatch.
- Sequence 3 tx와 필드, 확정 BMS binding 기준값을 README에 추가했다.
- 3차년도 증적 경로를 `BMU -> Agent -> Fabric -> Passport/MCP`로 명시했다.

### 변경 파일
- `README.md`
- `wiki/mcp/activity-log.md`

### 검증
- `git diff --check -- README.md wiki/mcp/activity-log.md` — PASS

### 미완료 / 리스크
- 문서 갱신만 수행했다. MCP runtime 동작 변경은 없다.
