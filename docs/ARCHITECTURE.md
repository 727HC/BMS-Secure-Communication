# xEV BMS 보안 플랫폼 - 배터리 여권 시스템 아키텍처

> **과제명:** xEV BMS 보안 플랫폼 개발
> **연차:** 3차년도
> **문서 버전:** 2.0.0
> **최종 수정일:** 2026-03-20

---

## 1. 시스템 개요

### 1.1 목적

본 시스템은 **GBA(Global Battery Alliance) 21 규격**을 준수하는 **배터리 여권(Battery Passport) 플랫폼**으로, xEV(전기차)에 장착되는 배터리의 전주기(제조 ~ 폐기)를 블록체인 기반으로 투명하게 관리한다. BMU(Battery Management Unit) 하드웨어에서 수집된 실시간 센서 데이터를 Ed25519 디지털 서명으로 무결성 검증 후 분산원장에 기록하며, DID(Decentralized Identifier)를 통한 기기 인증 체계를 적용한다.

### 1.2 4개 조직 역할

| 조직 | MSP ID | 역할 | 주요 권한 |
|------|--------|------|-----------|
| **제조사 (Manufacturer)** | `ManufacturerMSP` | 배터리 셀/팩 제조업체 | 원자재 등록, 여권 발급, BMU 데이터 기록 |
| **EV 제조사 (EVManufacturer)** | `EVManufacturerMSP` | 전기차 제조업체 | VIN 바인딩, 정비/분석 요청, 사고 기록 |
| **정비/분석 (Service)** | `ServiceMSP` | 정비소, 분석 기관 | 정비 이력 기록, SOH 분석 결과 제출, 재활용 판정 |
| **검증기관 (Regulator)** | `RegulatorMSP` | 인증/규제 기관 | 재활용 판정, 원자재 추출, 배터리 폐기 처리 |

### 1.3 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| 블록체인 네트워크 | Hyperledger Fabric | 2.5 |
| 합의 알고리즘 | etcdraft (Raft) | - |
| 상태 데이터베이스 | CouchDB | 3.3.2 |
| 스마트 컨트랙트 | Go (fabric-contract-api-go v2) | Go 1.21+ |
| Agent 서버 | Node.js + Express | 18 LTS+ |
| 프론트엔드 | Vanilla JS (SPA) | - |
| DID 인프라 | Hyperledger Indy (VON Network) | - |
| DID Agent | ACA-Py (Aries Cloud Agent - Python) | 1.2.2 |
| 서명 알고리즘 | Ed25519 (TweetNaCl) | - |
| BMU 펌웨어 | NXP S32K344 / S32K144 | - |
| 보안 통신 | AES-128 CMAC + CAN-FD | - |

---

## 2. 아키텍처 다이어그램

```
 +------------------------------------------------------------------+
 |                    BMU Hardware Layer                             |
 |                                                                  |
 |  +------------------+    CAN-FD (AES-128 CMAC)   +-----------+  |
 |  | CMU (S32K144)    | --------------------------> | BMU       |  |
 |  | 11-cell sensing  |    64B SecuredFrame_t       | (S32K344) |  |
 |  +------------------+                             | Ed25519   |  |
 |                                                   | signing   |  |
 |                                                   +-----+-----+  |
 +-------------------------------------------------------|---------+
                                                          | UART
                                                          | (28800 baud)
 +-------------------------------------------------------|---------+
 |  Host PC                                               v         |
 |  +---------------------------------------------------+          |
 |  | serial_to_agent.py                                 |          |
 |  | Parse [BMU] OK / [SIGN] lines -> POST /api/bmu/data          |
 |  +---------------------------+---------------------------+       |
 +------------------------------|-------------------------------+
                                | HTTP POST
                                v
 +=================================================================+
 |                     Agent Server (Node.js :3001)                 |
 |                                                                  |
 |  +------------+  +----------------+  +------------------------+  |
 |  | auth.routes|  | passport.routes|  | bmu.routes             |  |
 |  | (JWT)      |  | (CRUD)         |  | (BMU data ingest)      |  |
 |  +------------+  +----------------+  +------------------------+  |
 |  +----------------+  +-----------------+  +------------------+   |
 |  | material.routes|  | maintenance.rtes|  | analysis.routes  |   |
 |  +----------------+  +-----------------+  +------------------+   |
 |  +-------------------+  +---------------+                        |
 |  | recycling.routes  |  | did.routes    |                        |
 |  +-------------------+  +-------+-------+                        |
 |                                 |                                |
 |  +------------------+   +------+--------+   +-----------------+  |
 |  | fabric.service   |   | did.service   |   | bmu-parser      |  |
 |  | (Gateway SDK)    |   | (Ed25519)     |   | (48B decode)    |  |
 |  +--------+---------+   +------+--------+   +-----------------+  |
 +-----------|-------------------|---------------------------------+
             |                   |
             v                   v
 +=========================+   +============================+
 | Hyperledger Fabric      |   | DID Infrastructure         |
 | Network                 |   |                            |
 | (passport_net)          |   | +------------------------+ |
 |                         |   | | VON Network (:9000)    | |
 | +---------------------+ |   | | (Hyperledger Indy)     | |
 | | Orderer (:7050)     | |   | | 4 Validator Nodes      | |
 | | OrdererMSP (Raft)   | |   | +----------+-------------+ |
 | +---------------------+ |   |            |               |
 |                         |   | +----------v-------------+ |
 | +-----+ +-----+        |   | | ACA-Py (:8031)         | |
 | |Peer0| |Peer0|        |   | | DID Resolution         | |
 | |Mfg  | |EVM  |        |   | | Verkey Lookup          | |
 | |:7051| |:9051|        |   | +------------------------+ |
 | +--+--+ +--+--+        |   +============================+
 | +--+--+ +--+--+        |
 | |Peer0| |Peer0|        |
 | |Svc  | |Reg  |        |
 | |11051| |13051|        |
 | +--+--+ +--+--+        |
 |    |       |            |
 | +--v--+ +--v--+        |
 | |Couch| |Couch|        |   +=========================+
 | |DB x4| |DB x4|        |   | Browser (SPA)           |
 | +------+------+        |   |                         |
 +=========================+   | index.html + app.js     |
                               | Vue-style pages         |
                               | -> /api/* endpoints     |
                               +=========================+
```

---

## 3. 네트워크 토폴로지

### 3.1 Fabric 네트워크 컨테이너

| 컨테이너명 | 역할 | 포트 | MSP ID | Docker 네트워크 |
|------------|------|------|--------|-----------------|
| `orderer.battery.com` | Orderer (Raft) | 7050, 7053(Admin), 9443(Ops) | `OrdererMSP` | `passport_net` |
| `peer0.manufacturer.battery.com` | Manufacturer Peer | 7051, 9444(Ops) | `ManufacturerMSP` | `passport_net` |
| `peer0.evmanufacturer.battery.com` | EVManufacturer Peer | 9051, 9445(Ops) | `EVManufacturerMSP` | `passport_net` |
| `peer0.service.battery.com` | Service Peer | 11051, 9446(Ops) | `ServiceMSP` | `passport_net` |
| `peer0.regulator.battery.com` | Regulator Peer | 13051, 9447(Ops) | `RegulatorMSP` | `passport_net` |

### 3.2 CA (Certificate Authority) 컨테이너

| 컨테이너명 | CA 이름 | 포트 | 대상 조직 |
|------------|---------|------|-----------|
| `ca_manufacturer` | `ca-manufacturer` | 7054, 17054(Ops) | ManufacturerMSP |
| `ca_evmanufacturer` | `ca-evmanufacturer` | 8054, 18054(Ops) | EVManufacturerMSP |
| `ca_service` | `ca-service` | 9054, 19054(Ops) | ServiceMSP |
| `ca_regulator` | `ca-regulator` | 10054, 20054(Ops) | RegulatorMSP |
| `ca_orderer` | `ca-orderer` | 11054, 21054(Ops) | OrdererMSP |

### 3.3 CouchDB 컨테이너

| 컨테이너명 | 호스트 포트 | 내부 포트 | 연결 피어 |
|------------|------------|-----------|-----------|
| `couchdb0` | 5984 | 5984 | `peer0.manufacturer.battery.com` |
| `couchdb1` | 7984 | 5984 | `peer0.evmanufacturer.battery.com` |
| `couchdb2` | 8984 | 5984 | `peer0.service.battery.com` |
| `couchdb3` | 9984 | 5984 | `peer0.regulator.battery.com` |

### 3.4 애플리케이션 서비스

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Battery Passport Agent | 3001 | Node.js REST API + SPA 서빙 |
| VON Network | 9000 | Hyperledger Indy 네트워크 (4 Validator) |
| ACA-Py (Admin API) | 8031 | DID 해석, Verkey 조회, Indy Ledger 연동 |
| ACA-Py (Inbound) | 8030 | Agent-to-Agent 통신 |

### 3.5 채널 및 체인코드 구성

| 항목 | 값 |
|------|-----|
| 채널명 | `passportchannel` |
| 체인코드명 | `passport-contract` |
| 체인코드 언어 | Go |
| 보증 정책 | `MAJORITY Endorsement` |
| 참여 조직 | Manufacturer, EVManufacturer, Service, Regulator |

---

## 4. 체인코드 함수 목록

`passport-contract` 체인코드는 총 **19개** 함수를 포함하며, MSP 기반 RBAC(Role-Based Access Control)을 적용한다.

### 4.1 쓰기(Submit) 트랜잭션

| # | 함수명 | 허용 MSP | 설명 | 주요 파라미터 |
|---|--------|----------|------|--------------|
| 1 | `RegisterRawMaterial` | ManufacturerMSP | 원자재 등록 | materialId, name, origin, supplier, quantity, unit, certificationId |
| 2 | `CreateBatteryPassport` | ManufacturerMSP | 배터리 여권 발급 (GBA 21) | passportId, batteryId, did, model, serialNumber, manufacturerName, manufactureCountry, cellManufacturer, cellManufactureCountry, manufactureDate, cellType, chemistry, cellCount, weight, totalEnergy, energyDensity, ratedCapacity, expectedLifespan, voltageRange, temperatureRange |
| 3 | `RecordBMUData` | ManufacturerMSP | BMU 실시간 데이터 기록 | recordId, passportId, did, dataHash, signature, fc, soc, voltage, current, temperature, cellCount, statusFlags, dischargeCycles, timestamp |
| 4 | `BindToVehicle` | EVManufacturerMSP | 전기차 VIN 바인딩 | passportId, vin, installDate, evManufacturer, evAssemblyCountry |
| 5 | `RequestMaintenance` | EVManufacturerMSP | 정비 요청 (ACTIVE -> MAINTENANCE) | passportId, maintenanceType, description |
| 6 | `AddMaintenanceLog` | ServiceMSP | 정비 이력 기록 (MAINTENANCE -> ACTIVE) | passportId, maintenanceType, description, technician |
| 7 | `AddAccidentLog` | EVManufacturerMSP, ServiceMSP | 사고/사건 이력 기록 | passportId, severity, description, reporter |
| 8 | `RequestAnalysis` | EVManufacturerMSP | SOH 분석 요청 (-> ANALYSIS) | passportId |
| 9 | `SubmitAnalysisResult` | ServiceMSP | 분석 결과 제출 (ANALYSIS -> ACTIVE) | passportId, soh, soce, remainingLifeCycle, recycleAvailable |
| 10 | `SetRecycleAvailability` | ServiceMSP, RegulatorMSP | 재활용 가능 여부 설정 | passportId, available |
| 11 | `ExtractMaterials` | RegulatorMSP | 원자재 추출 기록 (-> RECYCLING) | passportId, recyclingRatesJSON |
| 12 | `DisposeBattery` | RegulatorMSP | 배터리 폐기 처리 (-> DISPOSED) | passportId |

### 4.2 읽기(Evaluate) 트랜잭션

| # | 함수명 | 허용 MSP | 설명 | 주요 파라미터 |
|---|--------|----------|------|--------------|
| 13 | `QueryPassport` | 전체 | 여권 단건 조회 | passportId |
| 14 | `QueryAllPassports` | 전체 | 전체 여권 목록 조회 (기본 100건) | - |
| 15 | `QueryPassportsWithPagination` | 전체 | 여권 페이지네이션 조회 | pageSize, bookmark |
| 16 | `GetPassportHistory` | 전체 | 여권 블록체인 변경이력 조회 | passportId |
| 17 | `QueryBMURecordsByPassport` | 전체 | 여권별 BMU 기록 조회 | passportId, pageSize, bookmark |
| 18 | `QueryBatteryByDID` | 전체 | DID 기반 여권 조회 | did |
| 19 | `QueryRawMaterials` | 전체 | 전체 원자재 목록 조회 | - |

---

## 5. API 엔드포인트

Agent 서버(`http://localhost:3001`)의 REST API 전체 목록이다. 인증이 필요한 엔드포인트는 JWT Bearer Token을 `Authorization` 헤더에 포함해야 한다.

### 5.1 인증 (Auth)

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/auth/register` | - | 전체 | 사용자 등록 (CA Enroll) + JWT 발급 |
| POST | `/api/auth/login` | - | 전체 | 로그인 + JWT 발급 |

### 5.2 배터리 여권 (Passport)

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/passports` | JWT | Manufacturer | 배터리 여권 발급 (GBA 21) |
| GET | `/api/passports` | - | 전체 | 전체 여권 목록 조회 |
| GET | `/api/passports/:id` | - | 전체 | 여권 단건 조회 |
| GET | `/api/passports/:id/history` | - | 전체 | 여권 블록체인 변경이력 |
| PUT | `/api/passports/:id/bind` | JWT | EVManufacturer | VIN 바인딩 (차량 장착) |

### 5.3 BMU 데이터

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/bmu/data` | - | - | BMU 원시 데이터 수신 (48B hex) + 서명 검증 + 블록체인 기록 |
| GET | `/api/bmu/records/:passportId` | - | 전체 | 여권별 BMU 기록 조회 (페이지네이션) |

### 5.4 원자재 (Material)

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/materials` | JWT | Manufacturer | 원자재 등록 |
| GET | `/api/materials` | - | 전체 | 원자재 목록 조회 |

### 5.5 정비 (Maintenance)

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/maintenance/:id/request` | JWT | EVManufacturer | 정비 요청 (ACTIVE -> MAINTENANCE) |
| POST | `/api/maintenance/:id/log` | JWT | Service | 정비 이력 기록 (-> ACTIVE 복귀) |
| POST | `/api/maintenance/:id/accident` | JWT | EVManufacturer, Service | 사고 이력 기록 |

### 5.6 분석 (Analysis)

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/analysis/:id/request` | JWT | EVManufacturer | SOH 분석 요청 (-> ANALYSIS) |
| POST | `/api/analysis/:id/result` | JWT | Service | 분석 결과 제출 (-> ACTIVE) |

### 5.7 재활용 (Recycling)

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| PUT | `/api/recycling/:id/availability` | JWT | Service, Regulator | 재활용 가능 여부 판정 |
| POST | `/api/recycling/:id/extract` | JWT | Regulator | 원자재 추출 기록 (-> RECYCLING) |
| POST | `/api/recycling/:id/dispose` | JWT | Regulator | 배터리 폐기 처리 (-> DISPOSED) |

### 5.8 DID 관리

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| POST | `/api/did/register` | API Key | 관리자 | Indy Ledger에 DID 등록 |
| GET | `/api/did/verkey/:did` | - | 전체 | DID 공개키(Verkey) 조회 |
| POST | `/api/did/verify` | - | 전체 | Ed25519 서명 검증 |

### 5.9 시스템 상태

| Method | Path | 인증 | 허용 조직 | 설명 |
|--------|------|------|-----------|------|
| GET | `/api/status` | - | 전체 | Fabric 연결 상태, 채널, 컨트랙트, 현재 조직 정보 |

---

## 6. GBA 21 필드 매핑

EU 배터리 규정에 따른 GBA 21개 필수 항목과 체인코드 `BatteryPassport` 구조체 필드 간 매핑이다.

| # | GBA 21 항목 | 체인코드 필드 | JSON 키 | 타입 |
|---|-------------|--------------|---------|------|
| 1 | 배터리 ID | `BatteryID` | `batteryId` | string |
| 2 | 배터리 모델 | `Model` | `model` | string |
| 3 | 일련번호 | `SerialNumber` | `serialNumber` | string |
| 4 | EV 제조사 | `EVManufacturer` | `evManufacturer` | string |
| 5 | EV 조립 국가 | `EVAssemblyCountry` | `evAssemblyCountry` | string |
| 6 | 배터리 제조사 | `ManufacturerName` | `manufacturerName` | string |
| 7 | 제조 국가 | `ManufactureCountry` | `manufactureCountry` | string |
| 8 | 셀 제조사 | `CellManufacturer` | `cellManufacturer` | string |
| 9 | 셀 제조 국가 | `CellManufactureCountry` | `cellManufactureCountry` | string |
| 10 | 제조일 | `ManufactureDate` | `manufactureDate` | string (ISO) |
| 11 | 셀 유형 | `CellType` | `cellType` | string |
| 12 | 화학 성분 | `Chemistry` | `chemistry` | string |
| 13 | 셀 수 | `CellCount` | `cellCount` | int |
| 14 | 중량 (kg) | `Weight` | `weight` | float64 |
| 15 | 총 에너지 (kWh) | `TotalEnergy` | `totalEnergy` | float64 |
| 16 | 에너지 밀도 (Wh/kg) | `EnergyDensity` | `energyDensity` | float64 |
| 17 | 정격 용량 (Ah) | `RatedCapacity` | `ratedCapacity` | float64 |
| 18 | 기대 수명 (cycles) | `ExpectedLifespan` | `expectedLifespan` | int |
| 19 | 전압 범위 (min-nom-max) | `VoltageRange` | `voltageRange` | string |
| 20 | 온도 범위 (min-max) | `TemperatureRange` | `temperatureRange` | string |
| 21 | DID (디지털 식별자) | `DID` | `did` | string |

### 6.1 추가 동적 필드 (운영 중 갱신)

| 필드 | JSON 키 | 설명 | 갱신 시점 |
|------|---------|------|-----------|
| `CurrentSOC` | `currentSoc` | 현재 충전 상태 (%) | BMU 데이터 수신 시 |
| `CurrentSOH` | `currentSoh` | 현재 건강 상태 (%) | 분석 결과 제출 시 |
| `SOCE` | `soce` | 에너지 충전 상태 (%) | 분석 결과 제출 시 |
| `TotalDischargeCycles` | `totalDischargeCycles` | 누적 방전 주기 | BMU 데이터 수신 시 |
| `RemainingLifeCycle` | `remainingLifeCycle` | 잔여 수명 (cycles) | 분석 결과 제출 시 |
| `Status` | `status` | 배터리 상태 | 상태 전이 시 |
| `VIN` | `vin` | 차량 식별번호 | VIN 바인딩 시 |
| `MaintenanceLogs` | `maintenanceLogs` | 정비 이력 배열 | 정비 기록 추가 시 |
| `RecyclingRates` | `recyclingRates` | 원자재별 회수율 (%) | 원자재 추출 시 |

---

## 7. 데이터 흐름

### 7.1 BMU 데이터 수집 흐름

```
[CMU (S32K144)]                    [BMU (S32K344)]                    [Host PC]
     |                                   |                                |
     |  1. 11셀 센서 데이터 수집          |                                |
     |  BatteryData_t (48 bytes)         |                                |
     |                                   |                                |
     |  2. CAN-FD 전송                   |                                |
     |  SecuredFrame_t (64B)             |                                |
     |  = Data(48B) + CMAC(16B)          |                                |
     | --------------------------------> |                                |
     |                                   |  3. CMAC 검증                  |
     |                                   |  4. Ed25519 서명 생성           |
     |                                   |                                |
     |                                   |  5. UART 출력                  |
     |                                   |  [BMU] OK FC=N SOC=...         |
     |                                   |  [SIGN] FC=N R=... S=...       |
     |                                   | -----------------------------> |
     |                                   |                                |
     |                                   |           6. serial_to_agent.py |
     |                                   |              Parse + HTTP POST  |
     |                                   |                                |
     |                                   |           7. Agent Server       |
     |                                   |              DID Verkey 조회    |
     |                                   |              Ed25519 서명 검증  |
     |                                   |              SHA-256 해시 생성  |
     |                                   |              Fabric 원장 기록   |
```

#### BatteryData_t 구조 (48 bytes, Little-Endian, Packed)

| 오프셋 | 크기 | 필드 | 타입 | 설명 |
|--------|------|------|------|------|
| 0 | 4 | `current_A` | float | 셀 전류 (A) |
| 4 | 4 | `voltage_V` | float | 셀 전압 (V) |
| 8 | 2 | `soc_u16` | uint16 | 평균 SOC (0~65535 -> 0.0~1.0) |
| 10 | 2 | `discharge_cycles` | uint16 | 방전 주기 수 |
| 12 | 2 | `temperature_u16` | uint16 | 온도 인코딩 (K, 스케일링) |
| 14 | 11 | `cell_voltage[11]` | uint8[] | 셀별 전압 (2.5~4.2V 매핑) |
| 25 | 11 | `cell_soc[11]` | uint8[] | 셀별 SOC (0~100%) |
| 36 | 2 | `timestamp_ms` | uint16 | 타임스탬프 (ms, 65535 래핑) |
| 38 | 1 | `status_flags` | uint8 | b0=충전중, b1=밸런싱, b2=결함 |
| 39 | 1 | `cell_count` | uint8 | 활성 셀 수 (기본 11) |
| 40 | 4 | `freshness_counter` | uint32 | FC (Freshness Counter) |
| 44 | 4 | `reserved` | uint8[] | 예약 영역 |
| **합계** | **48** | | | `static_assert: 4+4+2+2+2+11+11+2+1+1+4+4 = 48` |

### 7.2 배터리 전주기 상태 흐름

```
                    +-------------------------------------------+
                    |              Battery Lifecycle             |
                    +-------------------------------------------+

  +--------------+        +---------+        +-------------+
  | MANUFACTURED | -----> | ACTIVE  | -----> | MAINTENANCE |
  | (여권 발급)    |  VIN   | (운행중)  |  정비    | (정비중)      |
  +--------------+  바인딩  +----+----+  요청    +------+------+
                           |    ^              |      |
                           |    |  정비완료     |      |
                           |    +--------------+      |
                           |    ^                     |
                           |    |  분석완료            |
                           |    |                     |
                      분석  |    |                     |
                      요청  v    |                     |
                    +----+-------+                    |
                    | ANALYSIS   | <------------------+
                    | (분석중)     |    (MAINTENANCE에서도
                    +----+-------+     분석 요청 가능)
                         |
                         | 재활용 판정
                         v
                    +-----------+        +----------+
                    | RECYCLING | -----> | DISPOSED |
                    | (재활용중)  |  폐기   | (폐기완료) |
                    +-----------+  처리   +----------+
```

#### 상태 전이 규칙

| 현재 상태 | 이벤트 | 다음 상태 | 허용 조직 |
|-----------|--------|-----------|-----------|
| `MANUFACTURED` | VIN 바인딩 | `ACTIVE` | EVManufacturer |
| `ACTIVE` | 정비 요청 | `MAINTENANCE` | EVManufacturer |
| `MAINTENANCE` | 정비 완료 (로그 기록) | `ACTIVE` | Service |
| `ACTIVE` | 분석 요청 | `ANALYSIS` | EVManufacturer |
| `ANALYSIS` | 분석 결과 제출 | `ACTIVE` | Service |
| `ACTIVE` / `RECYCLING 판정` | 원자재 추출 | `RECYCLING` | Regulator |
| `RECYCLING` | 폐기 처리 | `DISPOSED` | Regulator |

---

## 8. 실행 방법

### 8.1 사전 요구사항

- Docker / Docker Compose
- Go 1.21+
- Node.js 18 LTS+
- Python 3.10+ (serial_to_agent.py 사용 시)
- Hyperledger Fabric 바이너리 (`fabric-samples/bin/`)

### 8.2 전체 원클릭 실행

```bash
# 전체 스택 실행 (VON + ACA-Py + Fabric + Agent)
./start_all.sh

# VON/ACA-Py가 이미 실행 중이면 스킵
./start_all.sh --skip-von

# Fabric이 이미 실행 중이면 스킵
./start_all.sh --skip-fabric

# Agent만 실행 (나머지 전부 스킵)
./start_all.sh --agent-only
```

### 8.3 개별 실행

```bash
# 1. Fabric 네트워크 시작 (4-org + 체인코드 배포)
./start_passport_network.sh up

# 2. Agent 서버 시작 (조직 번호로 구분)
cd bmu-agent
FABRIC_ORG=1 node server.js    # 제조사로 실행
FABRIC_ORG=2 node server.js    # EV제조사로 실행
FABRIC_ORG=3 node server.js    # 정비/분석으로 실행
FABRIC_ORG=4 node server.js    # 검증기관으로 실행

# 3. 전주기 데모 시나리오 실행
./test/demo-lifecycle.sh

# 4. BMU 시리얼 브리지 실행 (하드웨어 연결 시)
cd firmware/tools
python serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did <BMU_DID>
```

### 8.4 네트워크 종료

```bash
# Fabric 네트워크 종료 (컨테이너 + 볼륨 삭제)
cd passport-network && ./network.sh down

# 또는
./start_passport_network.sh down
```

### 8.5 주요 환경변수

| 환경변수 | 기본값 | 설명 |
|---------|--------|------|
| `FABRIC_ORG` | `1` | 실행할 조직 번호 (1~4) |
| `FABRIC_CHANNEL` | `passportchannel` | Fabric 채널명 |
| `FABRIC_CONTRACT` | `passport-contract` | 체인코드명 |
| `FABRIC_IDENTITY` | `admin` | Fabric 사용자 ID |
| `FABRIC_ADMIN_SECRET` | `REMOVED_SECRET_ROTATED_2026_04_18` | CA 관리자 비밀번호 |
| `ACA_PY_URL` | `http://localhost:8031` | ACA-Py Admin API URL |
| `DEFAULT_BMU_DID` | (없음) | BMU 기본 DID |
| `PORT` | `3001` | Agent 서버 포트 |
| `ADMIN_API_KEY` | (없음) | DID 등록 API 인증 키 |
| `FABRIC_TLS_VERIFY` | `true` | TLS 검증 활성화 여부 |

---

## 9. 성능 측정 결과

단일 클라이언트 순차 요청 기준 벤치마크 결과이다. 4-org 네트워크에서 `MAJORITY Endorsement` 정책 (최소 3개 조직 보증) 적용 환경에서 측정하였다.

### 9.1 트랜잭션 성능

| 작업 | 평균 응답시간 | TPS | 측정 환경 |
|------|-------------|-----|-----------|
| 배터리 여권 발급 (`CreateBatteryPassport`) | 1,863 ms | 0.35 | Submit TX, 4-org endorsement |
| 여권 단건 조회 (`QueryPassport`) | 55 ms | 18.2 | Evaluate TX, 로컬 피어 |
| BMU 데이터 기록 (`RecordBMUData`) | 2,186 ms | 0.32 | Submit TX + 여권 업데이트 |
| 여권 목록 조회 (`QueryAllPassports`) | 120 ms | 8.3 | CouchDB Rich Query |
| VIN 바인딩 (`BindToVehicle`) | 1,750 ms | 0.37 | Submit TX |
| 여권 이력 조회 (`GetPassportHistory`) | 85 ms | 11.8 | History Query |

### 9.2 측정 조건

| 항목 | 값 |
|------|-----|
| 클라이언트 | 단일 클라이언트, 순차 요청 |
| Orderer 합의 | etcdraft (단일 Orderer) |
| 블록 생성 | BatchTimeout 2s, MaxMessageCount 10 |
| 네트워크 | 로컬 Docker (WSL2) |
| CouchDB | v3.3.2, 기본 설정 |

### 9.3 비고

- Submit 트랜잭션의 응답시간에는 보증(Endorsement) + 순서화(Ordering) + 커밋(Commit) 전 과정이 포함된다.
- `RecordBMUData`는 BMU 레코드 저장 + 여권 상태 업데이트(2회 PutState)를 수행하므로 다른 Submit TX보다 느리다.
- 병렬 클라이언트 환경에서는 TPS가 유의미하게 향상될 것으로 예상된다.
- Evaluate 트랜잭션(조회)은 로컬 피어에서만 처리되므로 응답이 빠르다.

---

## 10. 디렉토리 구조

```
bms-blockchain/
|
|-- chaincode/
|   |-- passport-contract/             # 메인 체인코드 (Go)
|   |   |-- passport_contract.go       # 19개 함수, RBAC, GBA 21 구조체
|   |   |-- go.mod / go.sum
|   |   +-- vendor/                    # Go 의존성
|   |
|   +-- bms-contract/                  # 레거시 체인코드 (BMSData 단순 기록)
|       |-- bms_contract.go
|       +-- vendor/
|
|-- passport-network/                  # Fabric 4-org 네트워크 정의
|   |-- configtx/
|   |   +-- configtx.yaml              # 채널 프로필, 4개 조직 MSP 정의
|   |-- compose/
|   |   |-- compose-net.yaml           # Orderer + 4 Peers
|   |   |-- compose-couch.yaml         # CouchDB x4
|   |   |-- compose-ca.yaml            # CA x5 (4 org + orderer)
|   |   +-- docker/peercfg/core.yaml
|   |-- organizations/
|   |   |-- registerEnroll.sh           # CA 등록/인증서 발급
|   |   |-- ccp-generate.sh            # Connection Profile 생성
|   |   +-- fabric-ca/                 # 조직별 CA 설정
|   |       |-- manufacturer/
|   |       |-- evmanufacturer/
|   |       |-- service/
|   |       |-- regulator/
|   |       +-- ordererOrg/
|   |-- scripts/
|   |   |-- createChannel.sh
|   |   |-- deployCC.sh
|   |   |-- envVar.sh
|   |   +-- utils.sh
|   +-- network.sh                     # 네트워크 관리 스크립트
|
|-- bmu-agent/                         # Node.js Agent 서버
|   |-- server.js                      # Express 앱 진입점
|   |-- config/
|   |   |-- fabric.js                  # 4-org Fabric 설정
|   |   +-- auth.js                    # JWT 인증 설정
|   |-- routes/
|   |   |-- auth.routes.js             # 회원가입/로그인
|   |   |-- passport.routes.js         # 여권 CRUD + VIN 바인딩
|   |   |-- bmu.routes.js              # BMU 데이터 수신
|   |   |-- material.routes.js         # 원자재 관리
|   |   |-- maintenance.routes.js      # 정비 관리
|   |   |-- analysis.routes.js         # SOH 분석
|   |   |-- recycling.routes.js        # 재활용/폐기
|   |   +-- did.routes.js              # DID 등록/검증
|   |-- services/
|   |   |-- fabric.service.js          # Fabric Gateway 연결 관리
|   |   |-- did.service.js             # ACA-Py DID 연동
|   |   |-- bmu-parser.service.js      # 48B BatteryData_t 파싱
|   |   +-- auth.service.js            # CA Enroll + JWT 발급
|   |-- middleware/
|   |   |-- auth.js                    # JWT 인증 미들웨어
|   |   +-- rbac.js                    # MSP 기반 RBAC 미들웨어
|   |-- agent_generic.js               # 범용 Agent (레거시)
|   |-- agent_ingest_bmu.js            # BMU 전용 Agent (레거시)
|   |-- test-verify.js                 # DID 서명 검증 E2E 테스트
|   +-- package.json
|
|-- webapp/                            # 웹 프론트엔드 (SPA)
|   +-- frontend/
|       |-- index.html                 # 메인 HTML
|       |-- app.js                     # SPA 라우터
|       +-- pages/
|           |-- login.js               # 로그인 페이지
|           |-- dashboard.js           # 대시보드
|           |-- passports.js           # 여권 목록
|           |-- passport-detail.js     # 여권 상세
|           |-- bmu-data.js            # BMU 데이터
|           |-- materials.js           # 원자재 관리
|           |-- maintenance.js         # 정비 관리
|           +-- recycling.js           # 재활용 관리
|
|-- firmware/                          # BMU/CMU 펌웨어 관련
|   |-- common/
|   |   +-- bms_protocol.h             # 공통 프로토콜 정의 (48B 구조체, CAN-FD, CMAC)
|   +-- tools/
|       |-- serial_to_agent.py         # UART -> Agent HTTP 브리지
|       |-- battery_simulator.py       # 배터리 데이터 시뮬레이터
|       +-- dataProcess.py             # 데이터 처리 유틸리티
|
|-- von-network/                       # Hyperledger Indy (VON Network)
|   +-- server/                        # VON 웹서버
|
|-- fabric-samples/                    # Hyperledger Fabric 바이너리/샘플
|   |-- bin/                           # peer, orderer, configtxgen 등
|   +-- config/                        # Fabric 기본 설정
|
|-- test/
|   +-- demo-lifecycle.sh              # 전주기 데모 시나리오 (9단계)
|
|-- start_all.sh                       # 전체 스택 원클릭 실행
|-- start_passport_network.sh          # 4-org Fabric 네트워크 실행
|-- start_fabric.sh                    # 레거시 2-org 네트워크 실행
+-- install-fabric.sh                  # Fabric 바이너리 설치
```

---

## 부록: 보안 체계 요약

### A. 하드웨어 계층 보안

| 보안 기능 | 구현 방식 |
|----------|----------|
| CMU-BMU 통신 인증 | AES-128 CMAC (세션 키 기반) |
| 키 교환 | AES-ECB(PSK, UID+Seed) -> KDF (NIST SP 800-108) |
| 재전송 방지 | Freshness Counter (FC), 윈도우 크기 100 |
| 데이터 서명 | Ed25519 (BMU HSE 모듈) |
| CAN-FD 프레임 | 48B Data + 16B CMAC = 64B SecuredFrame |

### B. 블록체인 계층 보안

| 보안 기능 | 구현 방식 |
|----------|----------|
| 조직 인증 | Fabric MSP (X.509 인증서) |
| 접근 제어 | 체인코드 내 RBAC (MSP 기반 `requireMSP()`) |
| 데이터 무결성 | SHA-256 해시 + 블록 해시 체인 |
| 기기 인증 | DID (Hyperledger Indy) + Ed25519 서명 검증 |
| 통신 보안 | gRPC TLS (Peer/Orderer 간) |
| API 인증 | JWT Bearer Token |
