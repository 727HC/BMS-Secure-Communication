---
title: "MCP 세션 활동 로그"
date: 2026-04-06
tags: [mcp, log]
doc_type: log
---
# MCP 세션 — 활동 로그

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
