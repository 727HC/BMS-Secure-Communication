---
title: "옵션 B — HSE Monotonic Counter로 FC 영속화 (Feasibility 분석)"
date: 2026-05-19
tags: [embedded, security, fc, hse, feasibility]
doc_type: analysis
status: implemented
related: [adr-004-fc-reset-mechanism]
---

# 옵션 B — HSE Monotonic Counter로 BMU FC 영속화 가능성

## TL;DR

**가능 + 권장**. HSE는 정확히 이 use case를 위해 설계된 **Monotonic Counter** 기능을 내장하고 있다. 16 × 64-bit 보안 카운터, Rollover Protection으로 자동 wear-leveling, ~14년~수천년 수명. 별도 FlexNVM/Fee 드라이버 필요 없고, 기존 HSE service request 패턴 그대로 재사용 가능. **production 진입 시 옵션 A(체인코드 Reset)와 함께 강력 권장**.

## 발견 경위

ADR-004 closure 후 옵션 B (HSE NVM FC 저장/복원) prototype feasibility 검토 중, BMU RTD `hse_b_config.h`에서 다음 정의 발견:

```c
#define HSE_SPT_MONOTONIC_COUNTERS
#define HSE_NUM_OF_MONOTONIC_COUNTERS  (16U)
```

`hse_srv_monotonic_cnt.h`에 완성된 API 정의:
- `hseConfigSecCounterSrv_t` — 카운터 초기화 + Rollover Protection 설정
- `hseIncrementCounterSrv_t` — 증분 (`HSE_SRV_ID_INCREMENT_COUNTER`)
- `hseReadCounterSrv_t` — 현재 값 읽기
- `hseCmacWithCounterSrv_t` — CMAC + counter 통합 service (보너스)

## HSE Monotonic Counter 구조

```
Secure Counter (64-bit) = Rollover Protection (RP) || Volatile Counter (VC)
                          [stored in flash]          [in RAM]
```

- **VC**: 매 increment마다 RAM에서 증분. flash write 없음
- **RP**: VC가 모두 채워질 때마다 1 증가, **이때만 flash write 발생**
- 결과: HSE 내부에서 자동 wear-leveling — 호스트 코드가 신경 쓸 필요 없음

### RPBitSize trade-off (32~64bit 범위 설정 가능)

`RPBitSize=40`인 경우:
- RP=40bits, VC=24bits → VC당 16.7M increments
- 100K flash erase × 511 RP updates per sector = **51.1M RP updates 가능**

### 우리 시나리오 수명 계산

BMU FC 증분율: CMU CAN-FD TX 주기 200ms = 5fps
- 일일 frames: 5 × 86400 = 432,000
- 연간 frames: ~157.7M

| RPBitSize | VC size | Frames per RP update | 일일 RP updates | 가용 수명 |
|---|---|---|---|---|
| 32 | 32 | 4.29B | 0.0001 | 무제한 (10만년+) |
| **40** | **24** | **16.7M** | **0.026** | **5400년** |
| 48 | 16 | 65K | 6.6 | 21년 |
| 56 | 8 | 256 | 1687 | 30일 ❌ |
| 64 | 0 | 1 | 432000 | 2.4시간 ❌ |

→ **RPBitSize=40 권장** (VC=24bit). 수천 년 수명 + production lifetime 안에 절대 소진 안 됨.

## 통합 설계 (BMU main.c)

### 현재 코드 위치

`BMU_BMS_S32K344/src/main.c`:
- L127: `static uint32 g_expected_fc = 0U;`
- L609: `g_expected_fc = 1U;` (key exchange 후 reset)
- L691, L738: CMAC 검증 성공 시 `g_expected_fc = rx_fc + 1U`
- L1300: resync 시 `g_expected_fc = 0U`

### 옵션 B 적용 후 흐름

```
[부팅]
  ↓
HSE_ConfigSecCounter(counterIndex=0, RPBitSize=40)  ← 최초 1회만
  ↓
HSE_ReadCounter(counterIndex=0) → saved_fc (uint64)
  ↓
g_expected_fc = (uint32)saved_fc  ← NVM에서 복원
  ↓
[키 교환]
  ↓
g_expected_fc 그대로 유지 (전과 달리 1로 reset 안 함)
  ↓
[프레임 수신 + CMAC OK]
  ↓
g_expected_fc = rx_fc + 1
HSE_IncrementCounter(counterIndex=0, value=rx_fc + 1 - prev_saved)  ← 또는 매 N프레임마다 sync
```

### 옵션 B의 두 가지 동기화 모드

**Mode 1 — 매 프레임 increment** (정확도 우선)
- 모든 increment를 HSE에 동기 호출
- HSE 호출 overhead: ~수십 µs (HW 가속)
- 200ms 주기 frame당 한 번이라 overhead 무시 가능
- 재부팅 시 데이터 손실: 0 frame

**Mode 2 — 주기적 batch sync** (overhead 최소화)
- 호스트는 g_expected_fc만 RAM에서 증분
- 매 N(예: 1000) 프레임마다 한 번씩 HSE_IncrementCounter(value=N) 호출
- 재부팅 시 손실: 최대 N-1 frames (chaincode lastFc보다 약간 낮을 수 있음)
- HSE 부하 더 낮음

→ **Mode 1 권장**: 5fps 환경에서 HSE 호출 overhead 무시 가능 + 데이터 손실 0이 운영상 깔끔.

## 보너스: `hseCmacWithCounterSrv_t`

같은 헤더에 `hseCmacWithCounterSrv_t` 존재. CMAC 계산 시 카운터 값을 자동 prepend/append하여 anti-replay + integrity를 HSE 단일 service로 통합 처리. 현재 우리는:
1. host code가 FC를 payload에 임베드
2. CMAC(session_key, FC || plaintext) 별도 호출

이걸 단일 호출로 줄일 수 있음 — 그러나 ABI 변경 + CMU와의 protocol compatibility 영향이 있으니 별도 ADR로 다룰 일.

## 옵션 A vs 옵션 B 관계

**둘은 mutually exclusive 아님**. 동시 채택이 베스트:

| 시나리오 | 옵션 A 대응 | 옵션 B 대응 |
|---|---|---|
| 정상 BMU 재부팅 | 운영자가 reset 호출 | 자동 — NVM 복원으로 FC 연속 |
| FC counter 손상 (예: HSE NVM erase 누락) | 운영자가 reset | 손상 시 옵션 B는 fail-safe로 fc=0 시작, 그때만 옵션 A 호출 |
| 보드 교체 (새 DID) | 새 DID 시작이라 무관 | 새 DID에 별도 카운터 슬롯 할당 |
| FC uint32 overflow | 옵션 A로 reset | 옵션 B의 64-bit 카운터로 자체 해결 (실질 절대 안 일어남) |

**Production deploy 시 둘 다 활성화 권장**:
- 옵션 B: 평상시 자동 FC 연속성 보장
- 옵션 A: 비상시 운영자 manual reset 능력 보존

## 권고

### 우선순위 시그널 (2026-05-19 업데이트)

**사용자가 보드 reset 버튼을 자주 누르는 운영 패턴 확인됨**. 옵션 A(`ResetFCForDID` manual invoke)는 매 reset마다 30초 운영자 작업 필요 — 빈도가 높으면 누적 부담 큼. 옵션 B 우선순위를 "production 진입 시"에서 **"단기 작업 큐 상위"**로 상향 신호.

### 작업 큐 위치

| 시점 | 작업 |
|---|---|
| 즉시 (manual) | 보드 reset 시 `peer chaincode invoke ResetFCForDID` 호출 — 운영자 30초 |
| 단기 (~2주 내) | **옵션 B prototype 착수 권장** — 1주 작업으로 영구 자동화. 사용자 reset 빈도 고려하면 ROI 빠름 |
| Production 진입 | `hseCmacWithCounterSrv_t`로 CMAC 통합 (CMU protocol 변경 필요, 별도 ADR) |

### 옵션 A vs 옵션 B 누적 비용 비교 (사용자 reset 빈도 반영)

가정: 하루 평균 보드 reset 3회 (실측 패턴)

| 옵션 | 일일 운영자 시간 | 월 누계 (22 work day) | 6개월 누계 |
|---|---|---|---|
| A만 | 30초 × 3 = 1.5분 | 33분 | **3.3시간** + 매번 chain gap (~30초) |
| B 적용 후 | 0초 | 0 | **0시간** + chain gap 없음 |

**Break-even**: 옵션 B 구현 1주 = 약 40시간. A만 쓰는 누적 비용이 40시간 도달하는 데 6년 걸린다는 계산이라 ROI만 봐도 옵션 B는 항상 이득. 다만 운영자 인지 부담, chain 기록 연속성, 회복 즉시성 같은 비정량 가치까지 더하면 더 빠른 시점에 진행하는 게 좋음.

### 단기 권고 (구체)
1. **옵션 A 유지** — 운영 능력 보존, 비상시 reset 도구
2. **옵션 B 다음 임베디드 sprint에 1순위로 배치** — 보드 reset 빈도 감안하면 사용자 일상 부담 즉시 감소
3. 1주 estimate 안에 못 들어가면 (LC/SU rights 처리에서 막히면) Pair pattern과 옵션 A로 임시 유지하며 별도 트랙으로 진행

### 보류 정당화 (예전 — 더 이상 유효하지 않음)
- ~~학술 데모 / 실험실 단계: BMU 재부팅이 자주 발생해도 운영자 reset로 처리 가능~~ ← reset 빈도 확인 후 무효
- ~~운영자 자동화 부담 < HSE NVM API 통합 학습 + 실보드 검증 비용~~ ← 누적 비용 분석 후 역전

## 다음 단계 (옵션 B prototype 시작 시)

1. **HSE secure counter slot 할당** — counter index 0 또는 1 (Crypto_43_HSE_Cfg.c는 키 카탈로그 정의이고, counter는 SuperUser 권한으로 `hseConfigSecCounterSrv_t` 호출만으로 활성화)
2. **부팅 시 ReadCounter + g_expected_fc 초기화** — main.c L127 부근, FreeRTOS 시작 전
3. **CMAC 성공 분기마다 IncrementCounter** — main.c L691, L738
4. **단위 테스트**:
   - 정상 increment + read 일치
   - 재부팅 후 RAM 잃어도 RP 보존 확인
   - RP rollover 시점에 flash write 1회만 발생
5. **실보드 검증**:
   - BMU 재부팅 시나리오 — 옛 FC와 같은 값에서 재시작 확인 (chaincode reject 없음)
   - 옵션 A와 옵션 B 동시 채택 시 충돌 없음 (옵션 A로 chaincode reset → 옵션 B는 무관, 다음 increment 정상)

## Phase A Probe Guide (2026-05-22 추가)

deep-dive 결과 implementation 전 30분 probe로 3개 unknown을 동시에 검증. Spec: `.omc/specs/deep-dive-option-b-hse-monotonic-counter.md`.

### 활성화

probe 코드는 `BMU_BMS_S32K344/src/main.c`의 `[HSE] Imp=` 출력 직후, EdDSA 키 셋업 전에 `#ifdef HSE_FC_PROBE` 가드로 삽입됨. 활성 빌드:

```bash
cd /c/Users/heechan/Desktop/BMS
source ./config.env
export PATH="$TOOLCHAIN_PATH:$MAKE_PATH:$PATH"
cd BMU_BMS_S32K344/Debug_FLASH
rm -f src/main.o
make -j4 all CFLAGS_EXTRA="-DBMS_MODE_EDDSA -DBMS_WHITELIST_DISCOVERY -DHSE_FC_PROBE"
```

빌드 시 `Finished building: ../src/main.c` + 최종 ELF 생성 확인. 기존 매크로 redefine warning 3건은 본 변경과 무관(이전부터 있던 것).

### 플래시 + 캡처 절차

1. 보드 전원 OFF + USB 케이블 분리 (cold state 보장)
2. USB 연결 후 PEmicro로 새 ELF 플래시:
   ```bash
   "$PEG_PATH" -device=$BMU_DEVICE -interface=$BMU_INTERFACE -port=$BMU_PORT \
     -flashobjectfile="$BMS_DIR/$BMU_ELF" -runafterprogramming -quitafterprogramming
   ```
3. UART 모니터 시작 (BMU COM4@28800):
   ```bash
   python firmware/tools/serial_monitor.py --port COM4 --baud 28800 > /tmp/probe-boot.log &
   ```
4. 보드 reset 버튼 1회 → `[HSE-PROBE]` 라인 캡처
5. 보드 reset 추가 1~2회 → 동일 라인 다회 캡처 (cold-vs-warm 첫 호출 latency 비교)

### 출력 포맷

```
[HSE-PROBE] read_cyc=0xXXXXXXXX status=0xXX cust_su=Y val_hi=0xXX val_lo=0xXX
```

- `read_cyc`: DWT cycle count delta (raw cycles)
- `status`: `hseSrvResponse_t` 값 (hex)
- `cust_su`: HSE SuperUser bit (0 or 1)
- `val_hi/val_lo`: 64-bit counter 값 상/하위 32-bit

### Cycle → microsecond 변환

`configCPU_CLOCK_HZ = 48 MHz` (FIRC-only, FreeRTOSConfig.h:45).

```
us = read_cyc / 48
```

Mode 1 viability cutoff (1ms = 48,000 cycles = 0xBB80):
- `read_cyc < 0xBB80` → Mode 1 per-frame OK
- `read_cyc >= 0xBB80` → Mode 2 batch fallback 검토 필요

### 결과 해석 표

| `status` | 의미 | 다음 액션 |
|---|---|---|
| `0x55A5AA55` (HSE_SRV_RSP_OK) | 정상 read | val_hi/val_lo 확인. Mode 1/2는 latency로 결정 |
| `0x55A6E1B9` (HSE_SRV_RSP_NOT_ALLOWED) | counter index 0 미설정 | 정상. 첫 boot 상태. spec B1-B2 implementation 시 `hseConfigSecCounter` 1회 호출 필요 |
| `0xAA55A55A` (HSE_SRV_RSP_GENERAL_ERROR) | HSE 통신 실패 | hse status (CUST_SU, INSTALL_OK) 재확인. HSE 초기화 문제 가능성 |
| 기타 | 예상 외 | hse_status_and_errors.h 참조 |

| `cust_su` | 의미 | 다음 액션 |
|---|---|---|
| `1` | CUST_DEL LifeCycle, SuperUser auto-grant 작동 | Lane 1 lock. config 호출 가능 |
| `0` | 일반 USER 모드, config 권한 없음 | `CUST_START_AS_USER` policy 확인 필요. `HSE_SRV_ID_SYS_AUTH_REQ` 사전 호출 검토 |

### 측정 기록 (2026-05-22 완료)

**v1 probe (read-only)** — counter 미설정 상태 확인:

| 시도 | read_cyc | us | status | cust_su | val | 결론 |
|---|---|---|---|---|---|---|
| boot 1 | 0x002E964A | ~63,607 us | 0x55A5A399 (INVALID_PARAM) | 1 | 0 | counter 0 미설정 — config 필요. **CUST_SU=1 확인** |

**v2 probe (config + read + increment + read 시퀀스)** — Mode 1 viability 검증:

| Step | Op | cyc (hex) | cyc (dec) | us | status | val | 결론 |
|---|---|---|---|---|---|---|---|
| A | config(slot=0, RP=40) | 0x00446761 | 4,482,401 | **~93,383 us** | OK | - | boot 1회 비용 |
| B | read1 | 0x000017B5 | 6,069 | **~126 us** | OK | 0 | config 후 정상 0 |
| C | **incr(+1)** | 0x000024E2 | 9,442 | **~197 us** | OK | - | **per-frame Mode 1 op** |
| D | read2 | 0x000017BB | 6,075 | **~127 us** | OK | 1 | **단조 +1 검증 ✅** |

### Mode 1/2 의사결정 결과

```
read_cyc < 0xBB80 (1ms) 검증:
  increment 0x000024E2 (9,442 cyc, 197us) << 0xBB80 (48,000 cyc, 1000us)
  → Mode 1 per-frame 채택 ✅

status 확인:
  v2 모든 step = 0x55A5AA33 (OK)
  → Lane 1 fully locked (CUST_SU=1, config 호출 권한 확인)

val 검증:
  0 → 1 단조 증분 ✅
  → Lane 2 fully locked (counter integrity)
```

### Implementation 함의

- **Mode 1 per-frame 확정** — Mode 2 batch fallback 불필요
- **Config은 idempotent 아님** — production 코드는 "read-first 가드" 패턴 필요: read status가 OK면 skip, INVALID_PARAM이면 config 호출
- **Boot-time config 93ms** — pre-scheduler 위치에서 흡수, scheduler 시작 후 task에 영향 없음
- **HSE_TIMEOUT_TICKS 충분**: increment 197us는 1M tick timeout의 0.001% — 절대 timeout 안 됨

### 의사결정 트리

```
read_cyc < 0xBB80 (1ms)?
├─ YES → Mode 1 per-frame 채택, spec B 단계 진행
└─ NO  → Mode 2 batch (N=100) 재설계
         └─ spec 수정 + 사용자 승인 받고 재진입

status == 0x55A5AA55?
├─ YES → counter 이미 configured (이전 probe 또는 dev 도구로 설정됨)
│        └─ val_lo가 increment 이력 반영하면 NVM 단조성 검증 OK
└─ NO (NOT_ALLOWED) → 첫 boot 상태 정상
        └─ implementation 시 hseConfigSecCounter 1회 호출 후 read 재시도

cust_su == 1?
├─ YES → Lane 1 final lock, implementation 진행
└─ NO  → CUST_START_AS_USER OTP 확인, HSE_SRV_ID_SYS_AUTH_REQ 사전 호출 spec 추가 필요
```

### probe 제거 / 비활성화

probe 코드는 `#ifdef HSE_FC_PROBE`로 가드되어 있어 정의 안 하면 컴파일 안 됨. 측정 완료 후:
- 일시 비활성화: `-DHSE_FC_PROBE` 플래그 제거하고 재빌드. 코드는 보존.
- 영구 제거: implementation 시 `main.c`의 `#ifdef HSE_FC_PROBE` 블록 삭제.

## 미해결 / 추가 확인 필요

- `hseConfigSecCounterSrv_t`가 **SuperUser rights** 필요. 현재 BMU가 SuperUser 모드인지 확인 필요 (`HSE_LC` 확인). 만약 일반 USER 권한이면 SuperUser 전환 + LIFECYCLE_OK 사전 작업 필요 → **Phase A probe에서 `cust_su` 비트로 확인 가능**
- HSE Monotonic Counter의 RP flash sector가 LC(LifeCycle) 변경 시 영향 받는지 확인 필요
- Counter 손상 시 fail-safe 동작: hseReadCounter가 에러 반환하면 옵션 A로 fallback하는 코드 path 추가 필요 → **spec Q6에서 retry 3회 → halt로 확정**

## 관련 문서

- [ADR-004: Frame Counter 리셋 메커니즘](../decisions/004-fc-reset-mechanism.md) — 옵션 A 채택 + 옵션 B 보류 기록
- `firmware/README.md` "보안 프로토콜" 섹션 — 현재 FC 사용 방식
- `BMU_BMS_S32K344/RTD/include/hse_srv_monotonic_cnt.h` — HSE API 1차 reference
- `BMU_BMS_S32K344/RTD/include/hse_b_config.h:194-212` — 16 counter 활성 확인

## 결론

옵션 B는 단순히 implementable한 게 아니라, **HSE가 정확히 이 use case를 위해 설계된 hardware feature**다. NVM 수명도 production lifetime 안에 절대 소진 안 됨. 만들기 부담 적음 (1주, ~200 lines C 코드 추정). **시급도 낮지만, production deployment 직전에 강력 권장하는 일순위 hardening 항목**으로 보존.
