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

---

## Session 7 (2026-05-11)

### 요약
GitHub 공개면에 남아 있던 개인정보/시크릿성 문자열을 정리했다. 현재 HEAD 기준 로컬 사용자 경로, 개인 이메일 도메인, known legacy secret literals, tracked runtime credential 파일 노출을 0건으로 맞췄다.

### 작업 내용
- 로컬 절대경로와 사용자명을 placeholder/상대 기본값으로 치환했다.
- `e2e-tests/test-results.json` tracked generated artifact를 제거했다.
- benchmark 계정 password literal을 문서/스크립트에서 제거하고 `BENCH_PASSWORD` env 필수값으로 전환했다.
- `mcp-monitor/.claude/settings.json` hook command를 repo-relative 형태로 바꿨다.
- future commit author email을 GitHub noreply로 설정했다.

### 검증
- `git diff --check` — PASS
- `node -c e2e-tests/tests/dashboard_reference_kpi_match.spec.js` — PASS
- `python3 -m py_compile scripts/verify_wiki.py` — PASS
- `bash -n scripts/wiki-mirror.sh scripts/blockchain-benchmark-safe.sh scripts/blockchain-evaluation-dday.sh` — PASS
- `python3 -m json.tool mcp-monitor/.claude/settings.json` — PASS
- high-signal scan 0건: local path/user, private email domains, known credential literals, tracked env/key/cert/runtime files, private key/cert headers, AWS/JWT token patterns, phone/RRN patterns.

### 미완료 / 리스크
- 기존 Git commit author의 개인 이메일은 일반 커밋으로 삭제할 수 없어 history rewrite 대상이었다. Session 8에서 해결했다.

---

## Session 8 (2026-05-11)

### 요약
Session 7 이후 GitHub history까지 재검증하고, `master` 이력에 남은 legacy default secret literal을 history rewrite로 제거한 뒤 force push했다. GitHub 저장소는 private 상태로 유지했다.

### 작업 내용
- `master` 전체 이력의 local path/user, 개인 이메일 metadata, known legacy secret literal을 재스캔했다.
- legacy orderer admin default secret literal이 과거 `master` 이력에 남아 있어 `ORDERER_ADMIN_SECRET` placeholder로 history rewrite했다.
- `origin/master`를 rewritten HEAD로 force push하고 upstream tracking을 복구했다.
- untracked Caliper resolved config 2개가 Fabric key path를 포함해 삭제했고 `.gitignore`에 재생성 방지 규칙을 추가했다.
- GitHub hidden PR refs `refs/pull/1/head`, `refs/pull/2/head`는 read-only ref라 직접 삭제/수정이 불가함을 확인했다.

### 검증
- known legacy secret literal history scan — 0건
- local user/path marker history scan — 0건
- personal email metadata scan — 0건
- tracked+untracked high-signal scan — 0건
- `git status --porcelain` — 0건
- fresh mirror scan: `refs/heads/master` known/local/email 0건
- GitHub repo visibility — private
- unauthenticated `git ls-remote` — blocked

### 미완료 / 리스크
- GitHub hidden PR refs는 여전히 과거 PR head를 가리킨다. `git push :refs/pull/*` 및 GitHub API delete가 read-only/hidden ref 제한으로 실패하므로 GitHub Support의 cached view/reference purge가 필요하다.

---

## Session 9 (2026-05-11)

### 요약
다른 세션의 benchmark evidence commit이 GitHub `master`에 새 legacy benchmark password literal을 재도입한 것을 확인해 즉시 latest commit amend + force push로 제거했다.

### 작업 내용
- dirty/committed activity log를 high-signal scan해 legacy benchmark password literal 1건을 확인했다.
- `wiki/blockchain/activity-log.md`의 benchmark command를 `BENCH_PASSWORD` env-required 형태로 바꿨다.
- 최신 `master` commit을 amend하고 `--force-with-lease`로 GitHub `master`를 갱신했다.
- GitHub Support purge 요청문 `/tmp/github-sensitive-data-purge-request.txt`를 최신 clean head 기준으로 갱신했다.

### 검증
- current tree targeted scan — 0건
- `master` known legacy secret literal history scan — 0건
- `master` local path/user history scan — 0건
- `master` personal email metadata scan — 0건
- fresh mirror scan: `refs/heads/master` known/local/email 0건

### 미완료 / 리스크
- GitHub hidden PR refs `refs/pull/1/head`, `refs/pull/2/head`는 여전히 read-only 상태로 과거 PR head를 보존한다. GitHub Support dereference/delete + server GC가 필요하다.

---

## Session 10 (2026-05-11)

### 요약
GitHub private repo에서 secret scanning을 사용할 수 없는 상태를 확인하고, 대체용 high-signal sensitive marker scan을 repo-native CI로 추가했다.

### 작업 내용
- `scripts/check-sensitive-patterns.py` 추가.
  - local home path, personal webmail, private key header, GitHub/AWS/JWT token, Korean RRN/mobile, Fabric literal id secret, URL basic-auth literal을 탐지한다.
  - 과거 노출 marker는 plaintext 재기록 없이 SHA-256 digest로만 탐지한다.
- `.github/workflows/sensitive-scan.yml` 추가.
  - `push`, `pull_request`마다 dependency-free Python scanner를 실행한다.
- GitHub API에서 private repo secret scanning이 unavailable/disabled인 것을 확인했다.

### 검증
- `python3 scripts/check-sensitive-patterns.py --include-untracked` — PASS, 0 findings
- synthetic legacy marker hash probe — PASS
- benign env-required placeholder probe — PASS
- `python3 -m py_compile scripts/check-sensitive-patterns.py` — PASS
- `git diff --check -- .github/workflows/sensitive-scan.yml scripts/check-sensitive-patterns.py` — PASS

### 미완료 / 리스크
- 이 scanner는 high-signal guard이며 GitHub Advanced Security secret scanning 대체물이 아니다.
- GitHub hidden PR refs `refs/pull/1/head`, `refs/pull/2/head`는 여전히 Support purge가 필요하다.

---

## Session 11 (2026-05-11)

### 요약
GitHub 저장소 외부 노출 표면을 추가 점검했다. `master`와 CI guard는 clean이고, 저장소 접근 표면은 owner-only/private 상태로 확인했다.

### 작업 내용
- GitHub Actions `Sensitive marker scan` run이 latest head에서 success인지 확인했다.
- collaborators, deploy keys, webhooks, Pages, forks/releases/issues/actions 상태를 추가 점검했다.
- Support 요청문 `/tmp/github-sensitive-data-purge-request.txt`에 최신 clean head와 CI guard 상태를 반영했다.

### 검증
- latest `Sensitive marker scan` GitHub Actions run — success
- collaborators — owner account only
- deploy keys — 0
- webhooks — 0
- GitHub Pages — disabled/not found
- code search for known sensitive markers — 0 results
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings

### 미완료 / 리스크
- Branch protection은 user-owned private repo plan 제한으로 API 조회/설정이 불가했다.
- `allow_forking`은 user-owned repository에서 API 변경 제한이 있어 변경하지 못했다. 현재 forks는 0이다.
- Hidden PR refs는 Support purge 전까지 남는다.

---

## Session 12 (2026-05-11)

### 요약
GitHub PR UI/API 표면을 추가 점검해 Support purge가 필요한 범위를 더 좁혔다. PR title/body/comments/reviews/file path에는 targeted marker가 없고, 잔존 노출은 merged PR hidden ref의 commit metadata/history에 한정된다.

### 작업 내용
- `gh pr view` JSON으로 PR #1/#2의 title/body/comments/reviews/files/commits를 분리 스캔했다.
- PR #1은 모든 PR metadata bucket에서 targeted marker 0건이었다.
- PR #2는 title/body/comments/reviews/file path 0건, commit message bucket에 known legacy literal marker 2건이 남아 hidden PR ref purge 대상임을 확인했다.
- Support 요청문 `/tmp/github-sensitive-data-purge-request.txt`에 PR metadata scan 결과를 반영했다.

### 검증
- PR #1 title/body/comments/reviews/file paths/commit messages targeted scan — 0건
- PR #2 title/body/comments/reviews/file paths targeted scan — 0건
- PR #2 commit message targeted scan — known legacy literal marker 2건, hidden PR ref와 동일 blocker
- current tree `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings

### 미완료 / 리스크
- PR #2 commit metadata는 owner API로 rewrite/edit/delete할 수 없다. GitHub Support dereference/delete + cached view purge가 필요하다.

---

## Session 13 (2026-05-11)

### 요약
GitHub repository 부가 표면을 추가 점검했다. Actions secrets/variables/environment names, artifacts, remote tags/heads를 확인했고, 공개/다운로드 가능한 추가 노출 표면은 발견하지 못했다.

### 작업 내용
- repository Actions secrets/variables 목록을 조회했다: 노출되는 이름 없음.
- repository environments 목록을 조회했다: 노출되는 environment 없음.
- Actions artifacts를 조회했다: 0건.
- remote heads/tags를 조회했다: `master` 단일 branch, tag 없음.
- Support 요청문 `/tmp/github-sensitive-data-purge-request.txt`에 부가 표면 audit 결과를 반영했다.

### 검증
- Actions secrets list — empty
- Actions variables list — empty
- Environments list — empty
- Actions artifacts — 0
- Remote tags — 0
- Remote heads — `master` only

### 미완료 / 리스크
- GitHub hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 14 (2026-05-11)

### 요약
GitHub repository의 reversible exposure switches를 더 좁혔다. Projects/Downloads를 비활성화하고, 향후 merge 후 branch 자동 삭제를 켰다.

### 작업 내용
- `has_projects=false` 적용.
- `has_downloads=false` 적용.
- `delete_branch_on_merge=true` 적용.
- `private=true` 상태를 재확인했다.

### 검증
- GitHub repo settings after patch: `has_projects=false`, `has_downloads=false`, `delete_branch_on_merge=true`, `private=true`.
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings.

### 미완료 / 리스크
- `allow_forking=true`는 user-owned repository에서 API 변경 제한이 있어 남아 있다. 현재 forks는 0이다.
- Hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 15 (2026-05-11)

### 요약
GitHub repository의 issue/discussion 표면까지 닫았다. 기존 노출 표면은 없었지만, 향후 민감정보가 issue/discussion에 추가되는 경로를 줄였다.

### 작업 내용
- `has_issues=false` 적용.
- `has_discussions=false` 상태 확인.
- 기존 `has_wiki=false`, `has_projects=false`, `has_downloads=false`, `private=true` 상태를 재확인했다.
- Support 요청문 `/tmp/github-sensitive-data-purge-request.txt`에 issue/discussion 표면 축소를 반영했다.

### 검증
- GitHub repo settings after patch: `has_issues=false`, `has_discussions=false`, `has_wiki=false`, `has_projects=false`, `has_downloads=false`, `private=true`.
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings.

### 미완료 / 리스크
- Hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 16 (2026-05-11)

### 요약
GitHub Actions 권한/보존 설정을 추가로 축소했다. Workflow 기본 권한은 read-only 상태였고, artifacts/log retention을 1일로 낮췄다.

### 작업 내용
- Actions workflow permissions 확인: `default_workflow_permissions=read`, `can_approve_pull_request_reviews=false`.
- Actions artifact/log retention을 `90`일에서 `1`일로 변경했다.
- Support 요청문 `/tmp/github-sensitive-data-purge-request.txt`에 Actions retention 축소를 반영했다.

### 검증
- `GET /actions/permissions/workflow` — default workflow permissions read-only 확인.
- `GET /actions/permissions/artifact-and-log-retention` — `days=1` 확인.
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings.

### 미완료 / 리스크
- Hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 17 (2026-05-11)

### 요약
Codespaces/Dependabot secrets와 branch surface를 추가 점검했다. repo-level Codespaces/Dependabot secrets는 0건이고, remote branch는 `master` 단일 branch다.

### 작업 내용
- repository Codespaces secrets 조회: 0건.
- repository Dependabot secrets 조회: 0건.
- repository environments 조회: 0건 재확인.
- repository branches 조회: `master` 단일 branch 재확인.
- Packages 조회는 현재 token에 `read:packages` scope가 없어 불가했다.
- Support 요청문 `/tmp/github-sensitive-data-purge-request.txt`에 secret-surface audit 결과를 반영했다.

### 검증
- Codespaces secrets — 0
- Dependabot secrets — 0
- Environments — 0
- Branches — `master` only
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings

### 미완료 / 리스크
- GitHub Packages는 현재 `gh` token scope 부족으로 조회하지 못했다. 이 repo에는 package publish workflow/artifact가 없고 Actions artifacts도 0건이다.
- Hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 18 (2026-05-11)

### 요약
GitHub account 공개 표면을 보조 점검했다. Public gists는 0건이고, profile email/name/company/location/bio/twitter는 비어 있다.

### 작업 내용
- `users/727HC/gists` 조회: public gist 0건.
- `users/727HC` public profile 조회: email/name/company/location/bio/twitter empty/null.
- Support 요청문은 최신 clean head 유지.

### 검증
- public gists — 0
- profile public email/name/company/location/bio/twitter — empty/null
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings

### 미완료 / 리스크
- 계정 public repos 전체의 패키지/외부 노출은 이번 repo 목표 밖이다.
- Hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 19 (2026-05-11)

### 요약
GitHub Packages public surface를 비인증 페이지 기준으로 보조 점검했다. `727HC / Packages` 화면에서 container packages 0건으로 확인했다.

### 작업 내용
- `https://github.com/users/727HC/packages` 비인증 접근 확인.
- `repo_name=BMS-Secure-Communication` 필터 접근 확인.
- 표시 텍스트에서 `Container 0 packages` 확인.

### 검증
- Public packages page — HTTP 200
- Visible package count — `Container 0 packages`
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings

### 미완료 / 리스크
- REST package API는 current token에 `read:packages` scope가 없어 전체 private package 조회는 불가하다.
- Hidden PR refs 2개는 여전히 Support purge 대상이다.

---

## Session 20 (2026-05-11)

### 요약
로컬 Git object store 정리를 수행했다. Rewrite 이후 남을 수 있는 unreachable object를 prune했고, 로컬 unreachable object가 0건임을 확인했다.

### 작업 내용
- `git reflog expire --expire=now --expire-unreachable=now --all` 실행.
- `git gc --prune=now` 실행.
- `git fsck --no-reflogs --unreachable`로 로컬 unreachable object 0건 확인.
- pre-commit/pre-push local hooks가 sensitive marker scanner를 실행하도록 설치된 상태를 확인했다.

### 검증
- local unreachable objects — 0
- `scripts/check-sensitive-patterns.py --include-untracked` — 0 findings
- pre-commit/pre-push hook manual run — 0 findings

### 미완료 / 리스크
- GitHub server-side hidden PR refs 2개는 로컬 GC와 무관하게 Support purge 대상이다.
