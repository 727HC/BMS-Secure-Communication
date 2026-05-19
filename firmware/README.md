# BMS Embedded Secure Communication

> **NXP S32K344 (BMU) + S32K144 (CMU) 기반 CAN FD 보안 배터리 관리 시스템**
> 무결성 · 인증 · **기밀성** 3계층 보안 통신

---

## 목차

- [개요](#개요)
- [디렉토리 구조](#디렉토리-구조)
- [시스템 아키텍처](#시스템-아키텍처)
- [보안 프로토콜](#보안-프로토콜)
- [CAN 메시지 정의](#can-메시지-정의)
- [상태 머신](#상태-머신)
- [하드웨어 & 툴체인](#하드웨어--툴체인)
- [빌드 & 플래시](#빌드--플래시)
- [실행 방법](#실행-방법)
- [테스트 및 검증](#테스트-및-검증)
- [운영 보안 권고](#운영-보안-권고)

---

## 개요

전기차(EV) 배터리 팩 데이터를 **안전하게 수집·전송·검증**하는 임베디드 보안 통신 시스템.

- **CMU** (Cell Monitoring Unit, S32K144): 셀 데이터 수집 → AES-CBC 암호화 → CMAC 태깅 → CAN FD 전송
- **BMU** (Battery Management Unit, S32K344): CAN FD 수신 → CMAC 검증 → CBC 복호화 → Ed25519 서명 → UART
- **PC 측 도구**: MATLAB/Simulink 시뮬레이터, 시리얼 브릿지, 블록체인 에이전트 연동


---

## 디렉토리 구조

```
BMU_BMS_S32K344/                 # BMU 펌웨어 프로젝트 (S32K344, Cortex-M7 @200MHz, HSE)
├── src/
│   ├── main.c                     메인 — FreeRTOS 4-task (UartRx/Protocol/CanTx/Monitor)
│   │                              HSE 초기화, CAN-FD, EdDSA 서명, UART 출력
│   ├── bmu_board.h                보드별 HW 설정 (핀맵, 클럭, FlexCAN, LPUART6)
│   ├── system_stub.c              startup/system 보조 (인터럽트, 초기화 훅)
│   ├── tweetnacl.c / tweetnacl.h  소프트웨어 Ed25519 (HSE 미지원 환경 fallback, 현재 비활성)
│   └── common/                    BMU 빌드용 헤더 카피 (캐노니컬 원본은 firmware/common/)
│       ├── bms_protocol.h
│       └── secrets.h              ★ git 제외 — 로컬에서 .example로부터 생성
├── Debug_FLASH/                   make 빌드 산출물
│   ├── BMU_BMS_S32K344.elf        보드에 플래시되는 ELF (~92KB)
│   ├── BMU_BMS_S32K344.map        링커 맵
│   ├── BMU_BMS_S32K344.args       빌드 플래그 (BMS_MODE 등)
│   ├── makefile, objects.mk       빌드 시스템
│   ├── src/, FreeRTOS/, RTD/      오브젝트(.o/.d) 산출 디렉토리
│   └── generate/, Project_Settings/
├── FreeRTOS/                      FreeRTOS 커널 (Cortex-M7 포팅, NXP 제공)
├── RTD/                           NXP AUTOSAR RTD 드라이버 (FlexCAN, HSE, Clock, Port)
├── board/                         S32 Config Tool 보드 정의
├── generate/                      Pin Mux, Peripheral 자동 생성 코드
└── Project_Settings/              링커 스크립트, startup, board init

CMU_BMS_S32K144/                 # CMU 펌웨어 프로젝트 (S32K144, Cortex-M4 @48MHz, CSEc)
├── src/
│   ├── main.c                     메인 — FreeRTOS 4-task (UartRx/Protocol/CanTx/Monitor)
│   │                              CSEc 초기화, UART RX, CAN-FD 송신, MAC 생성
│   ├── cmu_board.h                CMU 보드 HW 설정 (핀맵, 클럭, FlexCAN, LPUART1)
│   └── common/                    CMU 빌드용 헤더 카피
│       ├── bms_protocol.h
│       └── secrets.h              ★ git 제외
├── Debug_FLASH/                   make 빌드 산출물
│   ├── CMU_BMS_S32K144.elf        보드에 플래시되는 ELF (~84KB)
│   ├── CMU_BMS_S32K144.bin
│   └── (BMU와 동일 구조의 makefile, objects.mk, src/, FreeRTOS/, RTD/)
├── FreeRTOS/                      FreeRTOS 커널 (Cortex-M4 포팅)
├── RTD/                           NXP AUTOSAR RTD (FlexCAN, CSEc, Clock, Port)
├── board/, generate/, Project_Settings/

firmware/                        # 공통 코드 + 호스트 PC 도구
├── README.md                      이 문서
├── common/                        ★ 캐노니컬 헤더 원본 (BMU/CMU src/common이 이걸 카피)
│   ├── bms_protocol.h             프로토콜 정의 (CAN ID, BatteryData_t, FC, key handle, KDF)
│   ├── secrets.h                  ★ PSK 16B + EdDSA seed 32B (git 제외)
│   └── secrets.h.example          시크릿 템플릿 (git 추적, 형식 가이드)
└── tools/                         PC 측 Python / MATLAB 도구
    ├── dataProcess.py             MATLAB UDP(127.0.0.1:5005) → CMU UART(COM5@9600) 브릿지
    ├── serial_to_agent.py         BMU UART(COM4@28800) → bmu-agent HTTP (JWT + SQLite 스풀)
    ├── battery_simulator.py       독립 배터리 시뮬레이터 (MATLAB 대체, UDP 송신)
    ├── serial_monitor.py          BMU UART 실시간 모니터 (디버그)
    ├── test_payload_encryption.py 프로토콜 단위 테스트 (Encrypt/MAC 정합성)
    ├── run_sim_standalone.m       MATLAB standalone 시뮬레이션
    ├── run_bms_simulation.m       Simscape BEV 모델 연동
    ├── create_bms_simulink.m      Simulink 모델 자동 생성
    ├── setup_simulink_udp.m       Simulink UDP Send 블록 설정
    ├── replay_bev_data.m          BEV 주행 로그 재생
    └── spool.db                   런타임 재전송 큐 (gitignore, SQLite)
```

**캐노니컬 단일 진실 소스**: `firmware/common/bms_protocol.h` 와 `firmware/common/secrets.h`.
BMU/CMU 프로젝트의 `src/common/` 디렉토리는 빌드 환경별 카피본 — 프로토콜 변경 시 `firmware/common/` 만 수정하면 됨.

---

## 시스템 아키텍처

```
┌────────────────────────────────────────────────────────────────────────┐
│                            PC / Host                                   │
│                                                                        │
│  ┌──────────┐  UDP:5005  ┌────────────────┐  UART 9600  ┌────────┐   │
│  │ Simulink │──────────▶ │ dataProcess.py │ ──────────▶ │  CMU   │   │
│  │ BEV 모델  │            │ (UDP→UART 브릿지) │              │ (COM5) │   │
│  └──────────┘            └────────────────┘              └───┬────┘   │
│                                                              │        │
│  ┌──────────────────────────┐                               │        │
│  │ serial_to_agent.py       │  UART 28800  ┌──────┐        │        │
│  │ (JWT 인증 + SQLite 스풀) │ ◀──────────── │ BMU  │ ◀──────┘        │
│  └─────────┬────────────────┘              │(COM4)│  CAN FD          │
│            │ HTTP + JWT                    └──────┘                   │
│            ▼                                                          │
│  ┌──────────────────────────┐                                         │
│  │ bmu-agent:3001 → Fabric  │                                         │
│  └──────────────────────────┘                                         │
└────────────────────────────────────────────────────────────────────────┘
                                                 │
                  CAN FD Bus (500kbps / 2Mbps BRS)
                                                 ▼
┌────────────────────────────────────┐       ┌────────────────────────────────┐
│ CMU — NXP S32K144 (EVB)           │       │ BMU — NXP S32K344 (EVB)       │
│                                    │       │                                │
│ • FreeRTOS 태스크                  │       │ • FreeRTOS 태스크              │
│ • CSEc HW 보안 엔진                │       │ • HSE HW 보안 엔진             │
│   - AES-ECB: UID/Seed 교환 암호화  │       │   - AES-ECB: UID/Seed 복호화   │
│   - AES-CBC: Payload 암호화        │ ◀─── │   - AES-CBC: Payload 복호화    │
│   - AES-CMAC: 데이터 서명          │       │   - AES-CMAC: 수신 검증        │
│   - TRNG: Seed 생성                │       │   - Ed25519 HW 서명 (블록체인) │
│ • FlexCAN0: CAN-FD TX/RX           │       │ • FlexCAN0: CAN-FD TX/RX       │
│ • LPUART1: 9600 baud 데이터 입력   │       │ • LPUART6: 28800 baud 출력     │
└────────────────────────────────────┘       └────────────────────────────────┘
```

### 데이터 흐름 (Runtime)

```
CMU: plaintext(48B) ─┬─ CMAC(session_key, FC||plaintext)  ──▶ Tag 16B
                     └─ CBC-Encrypt(session_key, IV=FC) ──▶ Ciphertext 48B
                         │
                         ▼
                  CAN FD [cipher 48B | MAC 16B] = 64B
                         │
                         ▼
BMU: ─▶ CBC-Decrypt(session_key, IV=FC) ─▶ CMAC Verify(FC||plaintext)
        ─▶ Ed25519 Sign(payload) ─▶ UART [SIGN R,S DATA]
```

---

## 보안 프로토콜

### 1. 키 교환 (Boot Phase, 1회)

```
CMU ──▶ AES-ECB(PSK, UID || Seed) ──▶ BMU   (CAN ID 0x15, 32B)
CMU ◀── CMAC(PSK, ACK) ───────────── BMU   (CAN ID 0x16, 24B)

양쪽 공통 (KDF):
SessionKey = AES-128-CMAC(PSK, "SessionKey" || UID || Seed || 0x01)
                             ▲ NIST SP 800-108 Counter Mode KDF

이후: PSK는 HSE/CSEc에 로드되어 RAM에서 삭제됨
```

### 2. Payload 암호화 (Runtime, MAC-then-Encrypt)

**왜 MAC-then-encrypt?** — FC가 payload 내부에 있어 Encrypt-then-MAC은 불가. BMU가 CMAC 검증 전 FC를 읽을 수 없음.

```
CMU 송신:
  1. plaintext(48B) 구성 + FC 삽입
  2. CMAC = AES-128-CMAC(session_key, FC || plaintext)   ← 평문 기준 MAC
  3. IV = FC zero-padded to 16B                          ← 전송 불필요
  4. ciphertext = AES-128-CBC(session_key, IV, plaintext)
  5. CAN FD 전송: [ciphertext 48B | CMAC 16B]

BMU 수신:
  1. IV = expected_FC zero-padded                        ← 예상 FC로 IV 재구성
  2. plaintext = AES-128-CBC-Decrypt(session_key, IV, ciphertext)
  3. FC = plaintext.freshness_counter                     ← 복호 후 FC 확인
  4. CMAC Verify(session_key, FC || plaintext)           ← MAC 검증
  5. Ed25519 Sign(plaintext) → UART 출력
```

**설계 포인트**:
- IV = FC 파생 → 전송 공간 0B (CAN FD 64B 프레임 유지)
- FC 단조 증가 → IV 재사용 없음 (CBC 안전)
- 48B = 16B × 3 → CBC 패딩 불필요
- `#define PAYLOAD_ENCRYPTION_ENABLED` 플래그로 선택적 제공 (평가 기준 충족)

### 3. 재전송 공격 방지 (Anti-Replay)

- **Frame Counter (FC)**: 매 프레임 단조 증가
- **FC Window**: BMU는 `[expected, expected+100)` 범위만 수용
- **블록체인 연동**: 체인코드가 DID별 `lastFc` 단조성 강제

### 4. 장애 복구 (Resync)

- CMAC 3회 연속 실패 시 BMU가 CAN ID 0x17 Resync 요청
- 양쪽 PSK 재로드 → 키 교환 재시작

---

## CAN 메시지 정의

| CAN ID | 방향 | 메시지 | 페이로드 | 설명 |
|--------|------|--------|----------|------|
| `0x14` | CMU→BMU | `BatteryData` | 64B | CBC 암호화된 배터리 데이터 + CMAC |
| `0x15` | CMU→BMU | `KeyExchange` | 32B | ECB(PSK) UID + Seed |
| `0x16` | BMU→CMU | `KeyACK` | 24B | ACK + PSK CMAC |
| `0x17` | BMU→CMU | `ResyncRequest` | 24B | Resync Marker + PSK CMAC |

### BatteryData_t 구조 (48B 평문)

| 오프셋 | 필드 | 크기 | 타입 | 설명 |
|-------|------|------|------|------|
| 0 | `current_A` | 4B | float | 전류 (A, IEEE 754) |
| 4 | `voltage_V` | 4B | float | 전압 (V, IEEE 754) |
| 8 | `soc_u16` | 2B | uint16 | SOC (raw × 0.001526 = %) |
| 10 | `discharge_cycles` | 2B | uint16 | 누적 방전 횟수 |
| 12 | `temperature_u16` | 2B | uint16 | 온도 (raw × 0.000763 = °C) |
| 14 | `cell_voltage[11]` | 11B | uint8 | 셀별 전압 (raw × 0.00667 + 2.5 = V) |
| 25 | `cell_soc[11]` | 11B | uint8 | 셀별 SOC (raw × 0.3922 = %) |
| 36 | `timestamp_ms` | 2B | uint16 | 타임스탬프 |
| 38 | `status_flags` | 1B | uint8 | b0=charging, b1=balancing, b2=fault |
| 39 | `cell_count` | 1B | uint8 | 활성 셀 수 (11) |
| 40 | `freshness_counter` | 4B | uint32 | FC (anti-replay) |
| 44 | `reserved[4]` | 4B | uint32 LE | v1.1 `bmsBindingCode32` 또는 0 |

CAN DBC 파일: `BMS_SecureComm.dbc` (스케일링 factor/offset 포함)

### BMS management identifier binding (v1.1)

- 기존 48-byte `BatteryData_t` 크기는 유지한다.
- payload bytes `44..47`의 기존 `reserved[4]`를 `bmsBindingCode32`로 재해석할 수 있다.
- 값은 `SHA-256(canonical BMS management identifier)`의 첫 4바이트를 little-endian `uint32`로 저장한다.
- 기본값 `0x00000000`은 legacy/미사용을 뜻하므로 기존 parser와 호환된다.
- BMU는 전체 48B payload를 Ed25519로 서명하고 Agent는 같은 48B로 `dataHash`를 만들기 때문에, 이 4B 힌트도 서명/해시에 포함된다.
- 32-bit 힌트는 충돌 리스크가 있으므로 full `bmsManagementId`는 Passport/Chaincode binding record에 저장하고, Agent는 `bmsBindingCode32`를 비교 신호로 사용해야 한다. 장기 v2에서는 더 큰 signed metadata 또는 payload 확장이 필요하다.


Blockchain binding values:

```text
bmsManagementId: BMS-MGMT-001
bmsBindingId: did:battery:001#BMS-MGMT-001
bmsBindingCode32: 0x2c9a0e0c
evidenceHash: b3c37ed2cdd2831cc0c212445905ced4a20ea51e129bff2e7418deddf7223178
```

`evidenceHash`는 `{bmsManagementId,bmsBindingId,bmsBindingCode32}` canonical JSON의 SHA-256이다.

Producer tools:

```bash
python firmware/tools/dataProcess.py --bms-management-id BMS-MGMT-001
python firmware/tools/battery_simulator.py --dry-run --bms-management-id BMS-MGMT-001
python firmware/tools/test_bms_identifier_payload.py
```

---

## 상태 머신

```
         전원 ON
            │
            ▼
       ┌────────┐
       │  INIT  │ ◀── RESYNC
       └───┬────┘
           │ TRNG Seed 생성 + UID 획득
           │ AES-ECB(PSK)로 암호화
           ▼
   ┌────────────────┐
   │ KEY_EXCHANGE   │ ─── CAN ID 0x15 송신
   └────────┬───────┘
            ▼
   ┌────────────────┐
   │   WAIT_ACK     │ ◀── CAN ID 0x16 + CMAC 검증
   └────────┬───────┘
            │ KDF 파생 + HSE/CSEc 로드
            ▼
   ┌────────────────┐
   │  OPERATIONAL   │ ↔── CAN ID 0x14 (암호화+인증 데이터)
   └────────┬───────┘
            │ CMAC 3회 실패
            ▼
   ┌────────────────┐
   │    RESYNC      │ ─── CAN ID 0x17 송신 → INIT
   └────────────────┘
```

---

## 하드웨어 & 툴체인

### 보드

| 역할 | 보드 | MCU | 보안 엔진 |
|------|------|-----|----------|
| **BMU** | S32K3X4EVB-Q172 | S32K344 (Cortex-M7) | **HSE** (AES, CMAC, Ed25519 HW) |
| **CMU** | S32K144EVB | S32K144 (Cortex-M4) | **CSEc** (AES ECB/CBC, CMAC, TRNG) |

### 디버거

| 보드 | 인터페이스 | 시리얼 |
|------|-----------|--------|
| BMU | PEmicro USBMULTILINK | PEMF1A375 |
| CMU | OpenSDA (내장) | FDCB6E5B |

### 툴체인

- NXP S32 Design Studio 3.6.x
- ARM GCC 10.2 (`C:\NXP\S32DS.3.6.1\S32DS\build_tools\gcc_v10.2\gcc-10.2-arm32-eabi\bin`)
- PEmicro GDB Server (플래시/디버깅)
- Python 3.11 + pyserial, requests, cryptography
- MATLAB R2025a + Simulink (선택, BEV 시뮬레이션)

---

## 빌드 & 플래시

### 사전 setup (최초 1회)

S32DS 프로젝트의 `.args` 빌드 인자 파일들이 `C:\BMS\...` 절대경로를 참조한다. 클론한 위치와 무관하게 빌드를 가능하게 하려면 디렉토리 정션을 만들어야 한다.

```bat
REM 프로젝트 루트에서 한 번만 실행
scripts\setup-dev-env.bat
```

스크립트가 하는 일:
1. `mklink /J C:\BMS <프로젝트_루트>` — 정션 생성 (관리자 권한 불필요)
2. 이미 있으면 검증만 하고 종료

> 장기적으로는 `.args` 파일들의 절대경로를 상대화하는 게 이상적이지만, S32DS GUI가 export 시 다시 절대경로로 resolve하는 한계가 있다. 상세는 [`wiki/decisions/005-build-paths.md`](../wiki/decisions/005-build-paths.md) 참조.

### CLI 빌드 (Git Bash + make)

```bash
GCC_DIR="C:/NXP/S32DS.3.6.1/S32DS/build_tools/gcc_v10.2/gcc-10.2-arm32-eabi/bin"

# BMU 빌드
cd BMU_BMS_S32K344/Debug_FLASH
make -j4 all "PATH=$GCC_DIR:$PATH"
# 산출물: BMU_BMS_S32K344.elf (~92KB)

# CMU 빌드
cd CMU_BMS_S32K144/Debug_FLASH
make -j4 all "PATH=$GCC_DIR:$PATH"
# 산출물: CMU_BMS_S32K144.elf (~84KB)
```

> Git Bash의 `make` 서브셸은 PATH를 못 받으므로 `"PATH=..."` 인자로 전달 필수.

### 플래시 (PEmicro GDB Server)

```bash
./flash.sh all      # BMU + CMU 플래시
./flash.sh bmu      # BMU만 플래시
./flash.sh cmu      # CMU만 플래시
```

`flash.sh` 내부에서 다음 명령 실행:

```bash
pegdbserver_console.exe \
  -device=NXP_S32K3xx_S32K344 -startserver \
  -interface=USBMULTILINK -port=PEMF1A375 \
  -forcemasserase \
  -flashobjectfile=<elf> \
  -runafterprogramming -quitafterprogramming
```

### 빌드 플래그

| 플래그 | 파일 | 용도 |
|--------|------|------|
| `PAYLOAD_ENCRYPTION_ENABLED` | `bms_protocol.h` | 1=CBC+CMAC, 0=plaintext+CMAC (하위 호환) |
| `BMS_WHITELIST_DISCOVERY` | BMU `main.args` | 개발용 — 새 UID 자동 등록 |
| `CMU_UART_SIM_FALLBACK` | CMU `main.args` | 개발용 — UART 없을 때 SIM 데이터 생성 |

---

## 실행 방법

### 전체 E2E 파이프라인

```bash
# 1. MATLAB Simulink 시뮬레이션
matlab -batch "run_sim_standalone"       # 또는 Simulink Run

# 2. UDP → CMU UART 브릿지
cd firmware/tools
python dataProcess.py --port COM5 --baud 9600

# 3. BMU UART → 블록체인 에이전트 (JWT 인증)
python serial_to_agent.py \
  --port COM4 --baud 28800 \
  --agent http://localhost:3001 \
  --did <BMU_DID> \
  --user <USER> --password <PASSWORD> --org 1
```

### 단독 모니터링

```bash
# BMU UART 실시간 모니터
python serial_monitor.py --port COM4 --baud 28800

# 독립 배터리 시뮬레이터 (MATLAB 없이)
python battery_simulator.py --udp
```

### 시리얼 모니터 출력 예시

```
[BMU] Boot: LPUART6 OK
[HSE] LC=0x04 (CUST_DEL)
[HSE-EdDSA] Import OK, PK=D3 B2 E6 B2 14 37 ...
[BMU] Creating FreeRTOS tasks...
[Task] CanRx started
[BMU] Processing key exchange...
[BMU] Decrypted UID: 00 00 00 00 54 17 40 14 07 42 01 21 20 31 39 00
[BMU] UID auto-registered (discovery)
[BMU] Session key derived and imported
[Task] Key exchange OK -> OPERATIONAL
[SIGN] FC=4 R=A3B5FDDF9C48A788... S=8086DC7B47F64F6A... DATA=31C75AC0706C3042...
[PERF] CMAC=373us E2E=16.7ms EdDSA=307ms RX=84 OK=83
```

---

## 테스트 및 검증

### 프로토콜 단위 테스트 (Python)

```bash
python test_payload_encryption.py
```

검증 항목:
- Encrypt-then-MAC / MAC-then-encrypt 정합성
- FC 1, 2, 100, 0xFFFFFFFF 에서 왕복 일치
- 변조 감지 (1바이트 변조 → CMAC 거부)
- IV 고유성 (같은 평문, FC 0~99 → 100개 모두 다른 암호문)
- Legacy 평문+CMAC 경로 하위 호환

### 실보드 검증 결과 (2026-04-14)

| 항목 | 수치 |
|------|------|
| CMAC 검증 | 373 µs (HSE HW) |
| Ed25519 서명 | 307 ms (HSE HW, SW fallback 대비 ~16× 빠름) |
| E2E 지연 (CAN RX → 검증 완료) | 16.7 ms |
| 프레임 성공률 | 99%+ (83/84) |
| CAN FD 주기 | 200 ms (5 Hz) |

### MATLAB → 블록체인 E2E 검증

MATLAB 시뮬레이션 값(SOC=94%, V=44.4V, I=-3.8A, T=29.7°C)이
BMU 복호화 → Fabric 체인코드 기록까지 **값 일치** 확인 (2026-04-14).

---

## 운영 보안 권고

`/api/bmu/data` 엔드포인트는 BMU M2M 데이터 수신 경로입니다. 현재 시제품 단계의 보호 수단과 운영 권고:

| 항목 | 현재 (시제품) | 운영 권고 |
|------|-------------|-----------|
| 인증 | JWT (HS256) + Ed25519 서명 검증 | mTLS (클라이언트 인증서) 추가 |
| 네트워크 | 공개 HTTP (localhost) | 내부망 제한, VPN, reverse proxy |
| Rate limit | in-memory Map | Redis / API Gateway 레벨 |
| DID fallback | dev에서만 `DEFAULT_BMU_DID` 허용 | production 자동 비활성 |
| PSK / EdDSA seed | `secrets.h` (빌드 시 바이너리 포함) | HSE/CSEc NVM 프로비저닝 (ADR-005 참조) |
| ECB UID 암호화 | 키교환 단계만, KDF로 분리 | 프로토콜 v2에서 nonce 기반 (ADR-005) |

### 주의사항

- **`secrets.h` 금지**: 절대 git 커밋 금지. `.gitignore` 등록됨.
- **CMU FlexNVM**: 최초 1회만 파티셔닝. 재파티셔닝 시 CSEc 키 초기화됨.
- **BMU HSE NVM**: 이미 포맷된 경우 `HSE_SRV_RSP_NOT_ALLOWED` 반환 (정상).
- **클린 빌드**: 빌드 플래그 변경 시 `make clean` 대신 `.o`/`.d`만 삭제 (S32DS makefile을 지울 수 있음).

---

## 관련 문서

- [Wiki: 임베디드 빌드/플래시 가이드](../.omc/wiki/embedded-build-flash-guide.md)
- [ADR-005: 임베디드 보안 강화 로드맵](../.omc/wiki/adr-005-embedded-hardening.md)
- [루트 README](../README.md)
