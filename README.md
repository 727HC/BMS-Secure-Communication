# BMS Secure Communication System

> **NXP S32K344 (BMU) + S32K144 (CMU) 기반 CAN-FD 보안 배터리 관리 시스템**
> AES-128 CMAC 인증 · KDF 세션키 · Ed25519 서명 · Hyperledger Fabric 블록체인 연동

---

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [프로젝트 구조](#프로젝트-구조)
- [시스템 아키텍처](#시스템-아키텍처)
- [CAN ID 설명](#can-id-설명)
- [보안 프로토콜 상태 머신](#보안-프로토콜-상태-머신)
- [사용 기술](#사용-기술)
- [하드웨어 요구사항](#하드웨어-요구사항)
- [빌드 환경 설정](#빌드-환경-설정)
- [실행 방법](#실행-방법)
- [빌드 모드](#빌드-모드)
- [시리얼 모니터 출력 예시](#시리얼-모니터-출력-예시)

---

## 프로젝트 개요

본 프로젝트는 전기차(EV) 배터리 팩의 데이터를 **안전하게 수집·전송·검증**하는 임베디드 보안 통신 시스템입니다.

- **CMU** (Cell Monitoring Unit, S32K144): 배터리 셀 데이터를 수집하고 AES-128 CMAC으로 서명하여 CAN-FD 버스로 전송합니다.
- **BMU** (Battery Management Unit, S32K344): CMU로부터 수신한 프레임의 CMAC을 HSE(Hardware Security Engine)로 검증하고, Ed25519로 서명하여 블록체인에 기록합니다.
- **Simulink / MATLAB**: MathWorks Electric Vehicle Simscape 모델에서 배터리 물리 데이터를 시뮬레이션하여 UART로 CMU에 주입합니다.
- **CANoe**: Vector 가상 CAN 버스 환경에서 통신을 테스트합니다.
- **Hyperledger Fabric**: BMU의 서명된 배터리 데이터를 온체인에 영구 기록합니다.

---

## 프로젝트 구조

```
BMS/
├── BMU_BMS_S32K344/          # BMU 펌웨어 (NXP S32K344, CAN-FD 수신 + HSE CMAC 검증 + EDDSA)
│   ├── src/
│   │   ├── main.c            # BMU 메인: FreeRTOS 태스크, HSE 연동, 프로토콜 상태 머신
│   │   └── common/
│   │       ├── bms_protocol.h # CMU/BMU 공유 프로토콜 정의 (CAN ID, 프레임 구조체, 상수)
│   │       └── secrets.h     # Pre-Shared Key (VCS 제외)
│   ├── FreeRTOS/             # FreeRTOS 커널 (S32K344 포팅)
│   └── RTD/                  # NXP AUTOSAR RTD 드라이버 (FlexCAN, HSE, Clock, Port)
│
├── CMU_BMS_S32K144/          # CMU 펌웨어 (NXP S32K144, 배터리 데이터 수집 + CSEc CMAC)
│   ├── src/
│   │   ├── main.c            # CMU 메인: FreeRTOS 태스크, CSEc 연동, 프로토콜 상태 머신
│   │   └── common/
│   │       ├── bms_protocol.h # (BMU와 동일 파일)
│   │       └── secrets.h     # Pre-Shared Key (VCS 제외)
│   ├── FreeRTOS/             # FreeRTOS 커널 (S32K144 포팅)
│   └── RTD/                  # NXP AUTOSAR RTD 드라이버 (FlexCAN, CSEc, Clock, Port)
│
├── firmware/
│   └── tools/                # PC 측 Python 도구
│       ├── dataProcess.py    # UART 브릿지: Simulink UDP → CMU UART 변환
│       ├── battery_simulator.py # 독립 배터리 데이터 시뮬레이터 (UDP)
│       ├── serial_to_agent.py   # BMU 시리얼 → 블록체인 에이전트 HTTP 브릿지
│       ├── run_bms_simulation.m # MATLAB Simulink 실행 스크립트
│       ├── replay_bev_data.m    # Simulink 결과 재생 스크립트
│       └── setup_simulink_udp.m # Simulink UDP Send 블록 자동 설정
│
├── simulink/
│   ├── BEVsystemModel.slx    # MathWorks Electric Vehicle Simscape 모델
│   └── ElectricVehicleSimscape.prj # Simulink 프로젝트 파일
│
├── blockchain/
│   ├── fabric-samples/       # Hyperledger Fabric (install-fabric.sh로 설치됨, ZIP 미포함)
│   ├── chaincode/
│   │   └── bms-contract/     # Go 체인코드 (RecordBMSData, QueryBMSData 등)
│   ├── bmu-agent/
│   │   ├── agent_ingest_bmu.js # BMU serial 데이터 수신 + 서명 검증 + Fabric 저장 (포트 3001)
│   │   ├── agent_generic.js   # DID/서명 검증 범용 API + MongoDB + Fabric (포트 3000)
│   │   └── test-verify.js    # E2E 서명 검증 테스트
│   ├── install-fabric.sh     # Fabric 바이너리 설치 스크립트
│   └── start_fabric.sh       # Fabric 네트워크 시작 + 체인코드 배포
│
├── canoe/
│   ├── BMS_Test.cfg          # Vector CANoe 프로젝트 설정
│   └── Panel1.xvp            # CANoe 패널 (가상 계기판)
│
├── BMS_SecureComm.dbc        # CAN 데이터베이스 (DBC) — 메시지/시그널 정의
├── config.env                # 빌드·플래시·시리얼 포트 공통 설정
├── build.sh                  # 빌드 스크립트
├── flash.sh                  # 플래시 스크립트 (PEmicro)
├── run.sh                    # 빌드+플래시+실행 원스탑
└── start.sh                  # 전체 시스템 원스탑 실행 (시뮬레이터 포함)
```

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PC / Host                                   │
│                                                                     │
│  ┌─────────────┐   UDP    ┌──────────────┐   UART (9600)           │
│  │  Simulink   │ ──────▶ │dataProcess.py│ ──────────────────────┐  │
│  │ BEV Model   │         │(브릿지)      │                        │  │
│  └─────────────┘         └──────────────┘                        │  │
│                                                                    │  │
│  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │                Vector CANoe (가상 CAN 버스 테스트)            │ │  │
│  └──────────────────────────────────────────────────────────────┘ │  │
│                                                                    │  │
│  ┌─────────────────────────────────┐                              │  │
│  │      Hyperledger Fabric         │◀── HTTP ── serial_to_agent  │  │
│  │   (온체인 배터리 데이터 기록)     │            (Python 브릿지)  │  │
│  └─────────────────────────────────┘                              │  │
└───────────────────────────────────────────────────────────────────┼──┘
                                                                    │
                                          UART RX (COM5, 9600 baud) │
                                                                    ▼
┌──────────────────────────────────┐
│  CMU — NXP S32K144 (EVB)        │
│                                  │
│  • FreeRTOS 태스크               │
│  • CSEc (HW 보안 모듈)           │
│    - AES-ECB: UID/Seed 암호화    │
│    - AES-CMAC: 배터리 데이터 서명 │
│    - TRNG: 세션 Seed 생성        │
│  • FlexCAN0: CAN-FD TX/RX       │
│  • LPUART1: 데이터 수신 (9600)  │
│                                  │
│  배터리 데이터(48B) + CMAC(16B)  │
│  → CAN-FD 64B 프레임으로 전송    │
└──────────┬───────────────────────┘
           │  CAN-FD Bus (500kbps nominal / 2Mbps data)
           │  CAN ID 0x14 / 0x15 / 0x16 / 0x17
           ▼
┌──────────────────────────────────┐
│  BMU — NXP S32K344 (EVB)        │
│                                  │
│  • FreeRTOS 태스크               │
│  • HSE (Hardware Security Engine)│
│    - AES-ECB: UID/Seed 복호화    │
│    - KDF: 세션키 유도            │
│    - AES-CMAC: 수신 데이터 검증  │
│    - Ed25519(EDDSA): 데이터 서명  │
│  • FlexCAN0: CAN-FD TX/RX       │
│  • LPUART6: 디버그 출력 (28800)  │
│                                  │
│  검증된 데이터 + Ed25519 서명    │
│  → UART → 블록체인 에이전트      │
└──────────────────────────────────┘
           │  UART (COM4, 28800 baud)
           ▼
     PC 모니터 / serial_to_agent.py
```

### 세션키 유도 (KDF)

```
SessionKey = AES-128-CMAC(PSK, "SessionKey" || UID || Seed || 0x01)
```

NIST SP 800-108 Counter Mode KDF를 준수하며, 각 세션마다 CMU의 TRNG가 생성한 고유 Seed로 세션키가 갱신됩니다.

### CMAC 인증 데이터 구조 (CAN-FD 64B)

```
[ BatteryData_t (48B) ][ AES-128-CMAC Tag (16B) ]
  ↑
  FC(4B) || Data(48B) = 52B 입력으로 CMAC 계산 (재전송 공격 방지)
```

---

## CAN ID 설명

| CAN ID | 십진수 | 방향 | 메시지명 | 설명 |
|--------|--------|------|----------|------|
| `0x14` | 20 | CMU → BMU | `BatteryData` | AES-128 CMAC 인증된 배터리 데이터 (48B 데이터 + 16B CMAC = 64B CAN-FD 프레임) |
| `0x15` | 21 | CMU → BMU | `KeyExchange` | 세션키 교환 프레임. AES-ECB(PSK)로 암호화된 UID(16B) + Seed(16B) |
| `0x16` | 22 | BMU → CMU | `KeyACK` | 키 교환 확인 응답. ACK 상태(1B) + **PSK** 기반 CMAC 태그(16B) |
| `0x17` | 23 | BMU → CMU | `ResyncRequest` | CMAC 3회 연속 실패 시 재동기화 요청. Resync Marker(1B) + **PSK** 기반 CMAC(16B) |

### BatteryData (CAN ID 0x14) 시그널 상세

| 시그널명 | 시작 비트 | 길이 | 단위 | 설명 |
|----------|-----------|------|------|------|
| `Current` | 0 | 32 | A | 배터리 전류 (IEEE 754 float, -100~100A) |
| `Voltage` | 32 | 32 | V | 배터리 전압 (IEEE 754 float, 0~500V) |
| `SOC` | 64 | 16 | - | 평균 충전 상태 (0~65535 → 0~100%) |
| `DischargeCycles` | 80 | 16 | - | 방전 사이클 횟수 |
| `Temperature` | 96 | 16 | - | 온도 인코딩 (K, 스케일 변환) |
| `CellVolt_1~11` | 112~248 | 8×11 | - | 셀별 전압 (2.5~4.2V 범위 인코딩) |
| `CellSOC_1~11` | 200~280 | 8×11 | - | 셀별 SOC (0.0~1.0 범위 인코딩) |
| `Timestamp` | 288 | 16 | ms | 타임스탬프 |
| `StatusFlags` | 304 | 8 | - | `b0`=충전중, `b1`=밸런싱, `b2`=결함 |
| `CellCount` | 312 | 8 | - | 활성 셀 수 (기본 11개) |
| `FreshnessCounter` | 320 | 32 | - | 재전송 공격 방지용 단조 증가 카운터 |
| `CMAC_0~15` | 384~504 | 8×16 | - | AES-128 CMAC 태그 (16바이트) |

### StatusFlags 비트 정의

| 비트 | 의미 |
|------|------|
| bit 0 | 충전 중 (Charging) |
| bit 1 | 셀 밸런싱 중 (Balancing) |
| bit 2 | 결함 발생 (Fault) |

---

## 보안 프로토콜 상태 머신

```
              ┌─────────┐
   전원 ON    │  INIT   │ ← RESYNC 후 복귀
              └────┬────┘
                   │ 랜덤 Seed 생성 + UID 획득
                   │ AES-ECB(PSK)로 암호화
                   ▼
          ┌──────────────────┐
          │  KEY_EXCHANGE    │ → CAN ID 0x15 송신
          └────────┬─────────┘
                   │ ACK 대기
                   ▼
          ┌──────────────────┐
          │   WAIT_ACK       │ ← CAN ID 0x16 수신 + CMAC 검증
          └────────┬─────────┘
                   │ 세션키 유도 + CSEc/HSE에 로드
                   ▼
          ┌──────────────────┐
          │  OPERATIONAL     │ ↔ CAN ID 0x14 (데이터 송수신)
          └────────┬─────────┘
                   │ CMAC 3회 실패
                   ▼
          ┌──────────────────┐
          │    RESYNC        │ → CAN ID 0x17 송신 → INIT으로
          └──────────────────┘
```

---

## 사용 기술

### 임베디드 펌웨어

| 항목 | CMU (S32K144) | BMU (S32K344) |
|------|--------------|--------------|
| MCU | NXP S32K144F512M15 | NXP S32K344 |
| 보안 모듈 | CSEc (Cryptographic Services Engine) | HSE (Hardware Security Engine) |
| 대칭키 암호 | AES-128 ECB (암호화), AES-128 CMAC (생성) | AES-128 ECB (복호화), AES-128 CMAC (검증/생성) |
| 비대칭키 | — | Ed25519 (EDDSA, 블록체인 서명) |
| 난수 생성 | TRNG (CSEc 내장) | — |
| CAN | FlexCAN0, CAN-FD, 500kbps/2Mbps BRS | FlexCAN0, CAN-FD, 500kbps/2Mbps BRS |
| UART | LPUART1 (9600 baud, 데이터 수신) | LPUART6 (28800 baud, 디버그 출력) |
| RTOS | FreeRTOS | FreeRTOS |
| 드라이버 | NXP AUTOSAR RTD | NXP AUTOSAR RTD |
| 개발도구 | NXP S32 Design Studio 3.6.x | NXP S32 Design Studio 3.6.x |
| 플래셔 | PEmicro OpenSDA | PEmicro USBMULTILINK |

### PC / 호스트

| 항목 | 기술 |
|------|------|
| 시뮬레이션 | MATLAB/Simulink + MathWorks Electric Vehicle Simscape |
| Python 도구 | Python 3, pyserial, socket (UDP) |
| CAN 분석 | Vector CANoe |
| 블록체인 | Hyperledger Fabric (Go chaincode) |
| DBC | CAN 데이터베이스 (`BMS_SecureComm.dbc`) |

### 보안 알고리즘

| 알고리즘 | 목적 | 적용 위치 |
|----------|------|-----------|
| AES-128 ECB | UID/Seed 암호화 전송 | CMU 송신 → BMU 수신 복호화 |
| AES-128 CMAC | 배터리 데이터 무결성 인증 | CMU 생성 → BMU 검증 |
| KDF (NIST SP 800-108) | 세션키 유도 | CMU, BMU 동일 함수 |
| Ed25519 (EDDSA) | 검증된 데이터 블록체인 서명 | BMU HSE |
| Freshness Counter | 재전송 공격 방지 | 프레임마다 단조 증가 |

---

## 하드웨어 요구사항

- **S32K3X4EVB-Q172** (BMU 보드) × 1
- **S32K144EVB** (CMU 보드) × 1
- **PEmicro USBMULTILINK** 디버거 (BMU용)
- **OpenSDA USB** (CMU 보드 내장)
- CAN 트랜시버 케이블 (두 보드 연결)
- USB-to-Serial (COM 포트) — 시뮬레이터 연결 시

---

## 빌드 환경 설정

### 1. 툴체인 설치

[NXP S32 Design Studio 3.6.x](https://www.nxp.com/design/software/development-software/s32-design-studio-ide/s32-design-studio-for-s32-platform:S32DS-S32PLATFORM) 설치 후 `config.env`의 경로를 확인합니다.

### 2. `config.env` 수정

```bash
# COM 포트 (장치 관리자에서 확인)
BMU_COM=COM4           # BMU LPUART6 디버그 출력
CMU_COM=COM5           # CMU LPUART1 데이터 입력

# PEmicro 포트 ID (pegdbserver 연결 ID)
BMU_PORT=PEMF1A375     # BMU USB Multilink 포트
CMU_PORT=FDCB6E5B      # CMU OpenSDA 포트

# 빌드 모드 선택
BMS_MODE=BMS_MODE_EDDSA   # BMS_MODE_PLAIN_CAN | BMS_MODE_CMAC | BMS_MODE_EDDSA
```

### 3. Python 패키지 설치

```bash
pip install pyserial
```

---

## 실행 방법

### 전체 자동 실행 (권장)

```bash
# 빌드 + 플래시 + 배터리 시뮬레이터 + BMU 모니터 동시 실행
./start.sh

# 시뮬레이터 없이 실행 (실제 하드웨어 배터리 연결 시)
./start.sh nosim

# 빌드/플래시 없이 시뮬레이터만 실행
./start.sh simonly

# MATLAB Simulink 연결 모드
./start.sh matlab

# 블록체인 브릿지 모드 (Hyperledger Fabric 연동)
./start.sh blockchain
```

### 단계별 수동 실행

#### 1단계: 빌드

```bash
./build.sh all      # BMU + CMU 동시 빌드
./build.sh bmu      # BMU만 빌드
./build.sh cmu      # CMU만 빌드
```

#### 2단계: 플래시

```bash
./flash.sh all      # BMU + CMU 플래시
./flash.sh bmu      # BMU만 플래시
./flash.sh cmu      # CMU만 플래시
```

#### 3단계: 실행 및 모니터링

```bash
# BMU 시리얼 모니터 (CMAC 검증 결과 확인)
./run.sh monitor

# MATLAB Simulink 브릿지 시작
./run.sh matlab

# 배터리 시뮬레이터 단독 실행
cd firmware/tools
python battery_simulator.py --udp

# 블록체인 에이전트 브릿지 (agent_ingest_bmu.js 포트 3001 사용)
cd firmware/tools
python serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did <BMU_DID>
```

### Hyperledger Fabric 블록체인 구동

```bash
cd blockchain
./install-fabric.sh    # Fabric 바이너리 최초 설치
./start_fabric.sh      # 네트워크 시작 + 체인코드 배포

# BMU serial 데이터 수신 에이전트 실행
cd bmu-agent
npm install
node agent_ingest_bmu.js  # 포트 3001 (BMU serial path용)
```

> **에이전트 역할 분리:**
> - `agent_ingest_bmu.js` (포트 3001): **BMU serial 데이터 경로 전용.** `serial_to_agent.py`에서 전송하는 FC/SOC/signature/rawPayload를 수신하여 Ed25519 서명 검증 후 Fabric에 기록합니다. `./start.sh blockchain` 모드에서 사용됩니다.
> - `agent_generic.js` (포트 3000): **범용 DID/서명 검증 API.** MongoDB 저장 + Fabric 기록. ACA-Py 연동 테스트 또는 REST API 검증 시 사용합니다.

---

## 빌드 모드

`config.env`의 `BMS_MODE` 값으로 보안 수준을 선택합니다.

| 모드 | 설명 | 적합한 환경 |
|------|------|------------|
| `BMS_MODE_PLAIN_CAN` | 암호화 없음, 순수 CAN-FD 전송 | 초기 개발/디버깅 |
| `BMS_MODE_CMAC` | AES-128 CMAC 인증만 적용 | 기능 검증 |
| `BMS_MODE_EDDSA` | CMAC + Ed25519 서명 (블록체인 연동) | 최종 보안 검증 |

---

## 시리얼 모니터 출력 예시

BMU UART (COM4, 28800 baud)에서 확인할 수 있는 정상 동작 출력:

```
[BMU] Boot: LPUART6 OK
[BMU] Ed25519 key generated
[BMU] Creating FreeRTOS tasks...
[Task] CanRx started
[Task] Protocol started
[Task] DataProcess started
[Task] Monitor started
[BMU] Processing key exchange...
[BMU] Decrypted UID: 01 23 45 67 89 AB CD EF 01 23 45 67 89 AB CD EF
[BMU] UID auto-registered (discovery)
[BMU] Session key derived and imported
[Task] Key exchange OK -> OPERATIONAL
[BMU] OK FC=1 SOC=52428 T=2981 Cyc=0 Cells=11
[SIGN] FC=1 R=A1B2C3... S=D4E5F6... DATA=AABB...
[BMU] OK FC=2 SOC=52100 T=2982 Cyc=0 Cells=11
[SIGN] FC=2 R=... S=... DATA=...
```

---

## 주의사항

- `secrets.h` 파일은 **절대 VCS(git)에 커밋하지 마십시오**. `.gitignore`에 이미 등록되어 있습니다.
- CMU 보드의 **FlexNVM 파티셔닝**은 최초 1회만 필요합니다. 재파티셔닝 시 CSEc 키가 초기화됩니다.
- BMU HSE 키 카탈로그 포맷은 이미 포맷된 경우 `HSE_SRV_RSP_NOT_ALLOWED`를 반환하며, 이는 정상 동작입니다.
- `BMS_MODE` 변경 시 반드시 **클린 빌드**를 수행하십시오 (`build.sh`는 자동으로 오브젝트 파일을 삭제합니다).
- **빌드 모드 전환은 반드시 `build.sh` 또는 `start.sh`를 사용하십시오.** S32DS IDE에서 직접 빌드하면 `CFLAGS_EXTRA`가 전달되지 않아 기본 모드로 빌드됩니다.
