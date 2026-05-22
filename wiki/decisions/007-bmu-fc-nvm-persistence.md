---
title: "ADR-007: BMU FC NVM Persistence via HSE Monotonic Counter (Option B)"
date: 2026-05-22
tags: [adr, security, embedded, hse, fc, anti-replay]
doc_type: adr
status: implemented
related: [adr-004-fc-reset-mechanism]
---

# ADR-007: BMU FC NVM Persistence via HSE Monotonic Counter (Option B)

## Status

Accepted — 2026-05-22.

## Context

ADR-004는 보드 reset 시 FC가 회귀하면서 chaincode `lastFc` 단조성 검증이 실패하는 문제를
`ResetFCForDID` 운영자 수동 호출(옵션 A)로 해결했다. 그러나 사용자 실제 운영 패턴에서
보드 reset이 일일 수회 발생하는 것이 관찰되었고, 매번 30초 수동 chaincode 호출 +
bridge 재기동이 누적 부담이 되었다.

`wiki/embedded/option-b-hse-nvm-fc-feasibility.md`의 분석으로 HSE Monotonic Counter
hardware feature (16 slot × 64-bit) 가 정확히 이 use case를 위해 설계되어 있고,
RPBitSize=40 설정으로 5,400년 NVM 수명을 확보할 수 있음이 확인되었다.

2026-05-22 multi-step probe (config -> read -> increment -> read + cross-boot persistence test) 결과:

| Operation | latency | status | 비고 |
|---|---|---|---|
| `hseConfigSecCounter`(slot=0, RP=40) | 93,383us (boot 1회) | OK | first-call init penalty 포함 |
| `hseReadCounter` | 126us | OK | val 0→1 within session |
| `hseIncrementCounter(1)` | 197us | OK | within-session OK |
| **Cross-boot persistence of `+1` increments** | — | **❌ NOT persisted** | Boot1: val=5 → Boot2: val=0 |
| `hseIncrementCounter(2^24)` (epoch advance) | similar | OK | **✅ RP write, persists across power cycle** |

CUST_DEL LifeCycle + auto-SU grant 확인 (`cust_su=1`).

### 핵심 발견 — Mode 1 per-frame 폐기 사유

HSE Secure Counter 구조: `SC = RP || VC` (Rollover Protection || Volatile Counter).
RPBitSize=40 → VC=24 bits. **VC만 RAM, RP만 flash 영속화**. 소규모 increment(+1)는 VC만
변경하고 flash write가 발생하지 않으므로 **power cycle 시 손실**.

따라서 spec Q2의 "Mode 1 per-frame" 결정은 cross-boot persistence를 제공하지 못함을 실증.

## Decision

### 채택: Mode 0 (Boot Epoch Advance + RAM per-frame + Chain FC Rewrite)

3개 구성 요소로 분리:

1. **Boot-time NVM epoch advance** — `BMU_AdvanceFcEpoch()`가 매 boot에서 counter를
   `+2^24` (`HSE_COUNTER_EPOCH_STEP`) 증가시켜 VC 오버플로우를 유발 → RP increment →
   flash write. 다음 boot에서 read는 이전 epoch보다 큰 값을 반환.
2. **RAM-only per-frame** — `g_expected_fc` 갱신은 RAM에서만 (`g_expected_fc = rx_fc + 1U`).
   HSE counter는 per-frame에 호출하지 않음 — 어차피 VC만 갱신되어 persistence 없음.
3. **Chain FC rewrite** — BMU가 chaincode에 전송하는 FC는 `g_chain_fc` (NVM 기반 globally
   monotonic) 로 재작성. CMU의 freshness_counter (CMU-side per-session, key exchange마다
   리셋)는 transport-level CMAC IV로만 사용되고, EdDSA signature 직전 payload의
   `freshness_counter` 필드를 `g_chain_fc` 로 덮어쓴 후 sign.

### 구성 파라미터

- **Slot**: HSE counter index `0` (`HSE_COUNTER_SLOT_BMU_FC`)
- **RPBitSize**: `40` bits
- **Epoch step**: `0x01000000` (2^24, `HSE_COUNTER_EPOCH_STEP`) — 매 boot 1 RP-update
- **Idempotency**: `BMU_ConfigureFcCounter()` 에 read-first 가드 — 이미 설정된 counter는
  wipe되지 않도록 read 성공 시 config 호출 skip
- **Fail-safe**:
  - Read 3회 retry 후 실패 시 UART `[FATAL]` + while(1) halt
  - Config 실패 시 동일하게 boot halt
  - Epoch advance 실패도 boot halt (anti-replay 보호를 우회하지 않기 위해)

### 256-Boot Wrap Limit (Known Trade-off)

`g_chain_fc`는 uint32. Boot N의 starting value = `N * 2^24` (low 32 bits).
N=256 (256 * 2^24 = 2^32) 시 low 32 bits가 0으로 wrap.

사용자 reset 빈도 ~3/day 기준 256 boots = **~85일 운영**.

**완화책**:
- 85일 ≈ 3개월 도달 전 DID 회전 (chain lastFc 신규 DID 기준 0부터 시작) — ADR-004 절차 재사용
- production 단계에서 protocol 8-byte FC field로 확장 검토 (현재 4-byte)

이 한계는 학술 데모 단계 acceptable로 spec Non-Goals에 명시.

## Consequences

### Positive

- 보드 reset 후 운영자 chaincode 호출 0회/일 기대 (256-boot wrap 도달까지)
- Chain `lastFc` 단조성 자동 유지 — frame 데이터 손실 0
- HSE NVM 수명 46,000년 (boot당 RP-update 1회, 3 boots/day 기준)
- 단일 빌드로 first-boot/subsequent-boot 모두 처리 (read-first 가드)
- CMU 펌웨어 무변경 — CMU↔BMU 통신 프로토콜 동일 유지

### Negative

- HSE counter slot 0 영구 점유 (1-15는 reserved)
- Boot 시퀀스에 93ms config + ~100ms epoch advance ≈ 200ms one-time cost (pre-scheduler 흡수)
- 256-boot wrap → 주기적 DID 회전 필요
- BMU가 freshness_counter 재작성 — chain은 CMU의 원본 FC를 보지 못함 (의도된 설계)

### Cross-Reference

- **ADR-004 `ResetFCForDID`**는 폐기되지 않고 **DID 회전 fail-safe**로 유지.
  Option B landing 후 평상시 호출 0회/일 기대 — 호출 발생 시 임베디드 측 fail-safe
  halt 동작 또는 256-boot wrap 도달 의미.
- Passport `/api/bmu/reset-fc` endpoint, MCP monitor의 `[FATAL] HSE counter` alert,
  Blockchain audit `FCRESET-{did}` event 모두 동일 fail-safe 역할로 유지.

## Implementation

### File touch list (2026-05-22)

| File | Change |
|---|---|
| `BMU_BMS_S32K344/src/common/bms_protocol.h` | `HSE_COUNTER_SLOT_BMU_FC`, `HSE_COUNTER_RP_BITSIZE`, `HSE_COUNTER_EPOCH_STEP` 매크로 + slot allocation table 코멘트 |
| `BMU_BMS_S32K344/src/main.c` | 3 함수 (`BMU_ConfigureFcCounter`, `BMU_ReadFcCounter`, `BMU_AdvanceFcEpoch`) + `g_chain_fc` 전역 + boot 시퀀스 (Configure → Advance → Read → init g_chain_fc) + procQueue 인큐 시 payload freshness_counter 재작성 (`g_chain_fc`) + 기존 `#ifdef HSE_FC_PROBE` 블록 삭제 |
| `firmware/tools/test_hse_fc_mock.py` | 신규 — 5 unittest: first-boot, read-first 가드, increment 누적, retry 복구, halt 경로 |
| `firmware/README.md` | "FC reset 운영" 섹션에 Option B 완료 명시 + ADR-007 링크 |
| `wiki/decisions/004-fc-reset-mechanism.md` | Closure에 ADR-007 cross-link 추가 |
| `wiki/embedded/option-b-hse-nvm-fc-feasibility.md` | `status: draft` → `status: implemented` + probe 결과 + Mode 0 의사결정 |

### Build verification

```bash
cd /c/Users/heechan/Desktop/BMS
source ./config.env
export PATH="$TOOLCHAIN_PATH:$MAKE_PATH:$PATH"
cd BMU_BMS_S32K344/Debug_FLASH
rm -f src/main.o src/main.d
make -j4 all CFLAGS_EXTRA="-DBMS_MODE_EDDSA -DBMS_WHITELIST_DISCOVERY"
# Result: ELF compiled OK (no new warnings — only pre-existing macro redefines + unused var)
```

### Unit test

```bash
python firmware/tools/test_hse_fc_mock.py -v
# Result: 5/5 PASS
```

### 실보드 검증 (2026-05-22 완료)

| 시나리오 | 결과 |
|---|---|
| Boot 1 첫 플래시 | `[HSE] FC=0x01000000 hi=0x00000000` (epoch 1) ✅ |
| Boot 2 재플래시 (= power cycle) | `[HSE] FC=0x02000000 hi=0x00000000` (epoch 2, +2^24) ✅ |
| Boot 3 재플래시 | `[HSE] FC=0x03000000 hi=0x00000000` (epoch 3, +2^24) ✅ |
| `BMU_FC_PERSIST_TEST` diagnostic (Mode 1 검증) | Boot1 after=5, Boot2 before=0 — Mode 1 persistence 실패 확인 (Mode 0 도입 근거) |

추가 통합 테스트 (사용자 ↔ MATLAB + bridge + chain 연계) 후 acceptance criteria C2-C6 완료 예정.

## Operations Notes

### UART log patterns (MCP alert 권장)

- `[HSE] LC=0x04 (CUST_DEL)` — LifeCycle 정상
- `[HSE] INSTALL_OK=1 CUST_SU=1` — HSE 준비 + SuperUser auto-grant 확인
- `[HSE] FcCfg=0x55A5AA33` — config success (boot info)
- `[HSE] FC=0x...` — current g_chain_fc starting value (boot info)
- `[FATAL] HSE counter read failed status=...` — board halt (critical alert)
- `[FATAL] FC counter config failed - halting` — board halt (critical alert)
- `[FATAL] HSE FC epoch advance failed status=...` — board halt (critical alert)

### Rollback procedure

문제 발생 시:

1. `git diff HEAD~ -- BMU_BMS_S32K344/src/main.c BMU_BMS_S32K344/src/common/bms_protocol.h` 변경 확인
2. 이전 production 빌드로 reflash:
   ```bash
   git checkout HEAD~ -- BMU_BMS_S32K344/src/main.c BMU_BMS_S32K344/src/common/bms_protocol.h
   cd BMU_BMS_S32K344/Debug_FLASH
   rm -f src/main.o; make -j4 all CFLAGS_EXTRA="-DBMS_MODE_EDDSA -DBMS_WHITELIST_DISCOVERY"
   # flash via PEmicro
   ```
3. 옛 DID 사용 중이면 manual `ResetFCForDID` 호출로 chain lastFc 정리

## References

- `wiki/embedded/option-b-hse-nvm-fc-feasibility.md` — feasibility + probe results
- `.omc/specs/deep-dive-option-b-hse-monotonic-counter.md` — spec (Goal/Constraints/Acceptance)
- `.omc/plans/autopilot-option-b.md` — implementation plan
- `wiki/decisions/004-fc-reset-mechanism.md` — ADR-004 ResetFCForDID (fail-safe로 유지)
- `BMU_BMS_S32K344/RTD/include/hse_srv_monotonic_cnt.h` — HSE API reference
- Logs: `logs/persist-boot-{1,2}.log` (Mode 1 persistence 실패), `logs/mode0-boot-{1,2}.log` + `logs/final-boot-1.log` (Mode 0 epoch advance 검증)
