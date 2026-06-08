---
title: "보드 부재 중 임베디드 백로그 (실보드 복귀 후 처리)"
date: 2026-06-08
tags: [embedded, backlog, board, deferred]
doc_type: backlog
status: active
related: [007-bmu-fc-nvm-persistence, 005-build-paths, 006-embedded-security-hardening]
---

# 보드 부재 중 임베디드 백로그

> 2026-06-08 기준. 실보드(S32K344 BMU / S32K144 CMU)를 외부 대여 중이라 **board-free 작업만** 진행하고,
> 실보드 검증/플래시가 필요한 항목은 본 문서에 보류 기록한다. 보드 복귀 시 이 목록부터 처리한다.

## Board-free 완료 (2026-06-08)

| 항목 | 내용 | 검증 |
|---|---|---|
| 버그 11건 수정 | host 도구·헤더·CMU/BMU 펌웨어 (commit `2e973ae`) | py_compile + 암호화 테스트 PASS + BMU/CMU 컴파일 통과 |
| FC_WRAP_NEAR 브릿지/MCP 계약 | `serial_to_agent.py` emit (commit `2e973ae`) | parse 실행 테스트 PASS, MCP 1:1 일치 |
| ADR-007 FC=uint64 계약 | chaincode 이미 uint64 ready (commit `e7d6a2e`) | 블록체인 권위 검증 |
| **#18 e2e.sh production 분기** | `WHITELIST_FLAG="${BMS_WHITELIST_FLAG:--DBMS_WHITELIST_DISCOVERY}"` (비파괴) | `bash -n` OK |
| **B: ADR-007 rollback enforcement** | production reflash = `-UBMS_WHITELIST_DISCOVERY` | — |
| **#15 설계 (`-U` 방식)** | Release 컨피그 없이 `-UBMS_WHITELIST_DISCOVERY`로 IDE dev 안 깨고 production enforcement 분리 | **전처리 증명**: `-D` 후 `-U` → enforcement 확인 |

**#15 `-U` 방식 요지**: `Debug_FLASH/src/main.args`는 dev용 `-DBMS_WHITELIST_DISCOVERY` 유지(IDE dev 무변경).
production 빌드만 `CFLAGS_EXTRA`에 `-UBMS_WHITELIST_DISCOVERY` 추가 → gcc last-wins로 undefine → `main.c:111-112`의
`g_whitelistEnforced=TRUE`(enforcement). 무거운 Release 빌드 컨피그 신설 불필요.

## 실보드 복귀 후 처리 (board-deferred)

### 1. CMU RESYNC DoS 수정 검증 (보안, 최우선) — commit `2e973ae`
- 코드는 적용+리뷰 통과(세션키 복원 + memset 제거). **실보드 검증 필수**:
  1. 정상 키교환 → OPERATIONAL에서 `CMU_SendSecuredData` 세션키 CMAC 정상·BMU 수락.
  2. **위조/손상 resync CTRL 프레임 주입 → CMU OPERATIONAL CMAC 검증 실패 → 직후 CMU가 즉시 정상 세션 데이터 송신·BMU 수락**(=DoS 해소 확인).
  3. 정상 resync 트리거 → RESYNC→INIT→재키교환 회귀.
  4. `csecMutex` 임계구역 확장에 따른 ProtocolTask↔CanTxTask 락 경합/지연.
- 부가: 평문 세션키 RAM 상주 트레이드오프 → `wiki/decisions` ADR 문서화 권고.

### 2. BMU FC_WRAP_NEAR 경보 (경미) — commit `2e973ae`
- 평상시 미출력 확인(epoch high byte ≥0xF8에서만 `[HSE] FC_WRAP_NEAR=YELLOW`, ≥0xFE RED). 부팅 로그로 확인.

### 3. #1 화이트리스트 <4개 미잠금
- discovery 모드에서 CMU<4개면 enforcement 영구 미전환(`BMU main.c:668-690`). 작성+컴파일은 board-free 가능하나
  enforcement 동작(미등록 CMU 거부) 확인은 보드 필요. discovery는 dev-only(#15로 production 분리됨)라 우선순위 낮음.

### 4. #15 production enforcement 빌드 실검증
- `-UBMS_WHITELIST_DISCOVERY` 빌드를 실제 플래시 → **미등록 CMU UID를 실제로 거부**하는지 확인. (메커니즘은 전처리로 검증됨, 실동작만 보드.)

### 5. #3 8byte FC 프로토콜 확장
- 계약은 ADR-007 "FC=uint64" 섹션에 문서화 완료(chaincode 변경 0건). 미해결:
  - **페이로드 재설계**: 48B `BatteryData_t`의 `freshness_counter`는 4B@offset42, 바로 뒤 44~47이 `bmsBindingCode32` → uint64 FC 넣으면 충돌.
  - 브릿지→agent(`/api/bmu/data`) FC 전달 계약 변경 → Passport/Blockchain 협의.
  - 전환 보장: 새 8byte FC가 기존 4byte lastFc 초과(또는 active DID 일괄 `RepairFCBindingForDID`).
  - 보드 E2E 필수. 큰 작업이므로 설계 ADR 선행 권장.

### 6. HW Ed25519 (DID 키 HSE 보호) — 보류 (사용자 결정)
- 현재 DID 서명키 SW(flash 시드, 추출 가능). production 목표=HSE 내부 생성(export 불가). NXP example 적용 시 가능([[ref_s32k344_hse_ed25519_nxp]]).
- **2026-06-08 사용자 결정: 현 SW 유지.** 데모 단계 acceptable.

## 관련
- [[007-bmu-fc-nvm-persistence|ADR-007]] (FC=uint64 계약, FC_WRAP, rollback enforcement)
- [[005-build-paths|ADR-005]] (빌드 경로/정션)
- [[006-embedded-security-hardening|ADR-006]] (ECB→nonce, FlexNVM 빌드 분리 — HSE provisioning 시점)
- [[activity-log]] 2026-06-08 항목
