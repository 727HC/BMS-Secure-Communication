---
title: "옵션 B — HSE Monotonic Counter로 FC 영속화 (Feasibility 분석)"
date: 2026-05-19
tags: [embedded, security, fc, hse, feasibility]
doc_type: analysis
status: draft
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

### Production 진입 시 (시점)
1. **옵션 B prototype 진행** — 약 1주 작업 추정 (단위 테스트 + 실보드 검증 포함)
2. ADR-007 (또는 ADR-004 후속) 신규로 옵션 B 통합 결정 기록
3. `hseCmacWithCounterSrv_t` 통합은 별도 ADR + CMU 측 protocol 변경 합의 필요

### 단기 (현재 단계, ~1개월)
- 옵션 A로 충분 (ResetFCForDID 작동 확인됨)
- 옵션 B는 보류, 본 feasibility doc 보존 → 시점 됐을 때 빠른 착수

### 보류 정당화
- 학술 데모 / 실험실 단계: BMU 재부팅이 자주 발생해도 운영자 reset로 처리 가능
- 운영자 자동화 부담 < HSE NVM API 통합 학습 + 실보드 검증 비용

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

## 미해결 / 추가 확인 필요

- `hseConfigSecCounterSrv_t`가 **SuperUser rights** 필요. 현재 BMU가 SuperUser 모드인지 확인 필요 (`HSE_LC` 확인). 만약 일반 USER 권한이면 SuperUser 전환 + LIFECYCLE_OK 사전 작업 필요
- HSE Monotonic Counter의 RP flash sector가 LC(LifeCycle) 변경 시 영향 받는지 확인 필요
- Counter 손상 시 fail-safe 동작: hseReadCounter가 에러 반환하면 옵션 A로 fallback하는 코드 path 추가 필요

## 관련 문서

- [ADR-004: Frame Counter 리셋 메커니즘](../decisions/004-fc-reset-mechanism.md) — 옵션 A 채택 + 옵션 B 보류 기록
- [`firmware/README.md`](../../firmware/README.md) "보안 프로토콜" 섹션 — 현재 FC 사용 방식
- `BMU_BMS_S32K344/RTD/include/hse_srv_monotonic_cnt.h` — HSE API 1차 reference
- `BMU_BMS_S32K344/RTD/include/hse_b_config.h:194-212` — 16 counter 활성 확인

## 결론

옵션 B는 단순히 implementable한 게 아니라, **HSE가 정확히 이 use case를 위해 설계된 hardware feature**다. NVM 수명도 production lifetime 안에 절대 소진 안 됨. 만들기 부담 적음 (1주, ~200 lines C 코드 추정). **시급도 낮지만, production deployment 직전에 강력 권장하는 일순위 hardening 항목**으로 보존.
