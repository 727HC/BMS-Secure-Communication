---
title: 시스템 아키텍처
date: 2026-04-06
tags: [architecture, overview]
---

# BMS-Blockchain 시스템 아키텍처

## 전체 구성

```
┌─────────────────────────────────────────────────┐
│                  Frontend (SPA)                  │
│            Vanilla JS + Vue 3 + Tailwind         │
├─────────────────────────────────────────────────┤
│               BMU Agent (Node.js)                │
│          Express + Fabric SDK + ACA-Py           │
├─────────────────────────────────────────────────┤
│          Hyperledger Fabric 2.5 Network          │
│   4-Org: Manufacturer, EVMfg, Service, Regulator │
│          passport-contract (Go 1.22)             │
├─────────────────────────────────────────────────┤
│            Embedded (NXP S32K3)                  │
│         BMU/CMU → CAN-FD → HSE 보안              │
├─────────────────────────────────────────────────┤
│            MCP Monitor Server                    │
│        tx-monitor, bmu-monitor, vc-monitor       │
└─────────────────────────────────────────────────┘
```

## 주요 디렉토리

> 2026-04-06 재배분 (ADR-002): chaincode → Blockchain, bmu-agent → Passport

| 디렉토리 | 설명 | 세션 |
|----------|------|------|
| `bmu-agent/` | Node.js API 서버, 41개 엔드포인트, 9개 라우트 그룹 | Passport |
| `webapp/frontend/` | Vue 3 SPA, 10개 페이지, 사이드바 레이아웃 | Passport |
| `passport-network/` | 4-org Fabric 네트워크 설정 | Blockchain |
| `chaincode/passport-contract/` | Go 체인코드, 40개 함수, GBA 21 | Blockchain |
| `embedded/`, `firmware/` | S32K3, CAN-FD, HSE | Embedded |
| `mcp-monitor/` | MCP 모니터링 서버, 4개 Tool | MCP |
| `wiki-mcp/` | wiki 지식 베이스 MCP 서버, 5개 Tool | 공통 |
| `wiki/` | Obsidian vault, 프로젝트 지식 베이스 | 공통 |

## Fabric 네트워크 상세

```
┌─ passport-channel ──────────────────────────────┐
│                                                  │
│  Org1 (Manufacturer)    Org2 (EVManufacturer)    │
│   peer0, CA              peer0, CA               │
│                                                  │
│  Org3 (Service)         Org4 (Regulator)         │
│   peer0, CA              peer0, CA               │
│                                                  │
│  Orderer (Raft)         CouchDB (per peer)       │
└──────────────────────────────────────────────────┘
```

- 채널: `passport-channel` (단일)
- 체인코드: `passport-contract` (Go 1.22, 40개 함수)
- 상태DB: CouchDB (Rich Query 지원)
- 인증: Fabric CA → X.509 인증서 → Wallet
- Gateway: 사용자별 Gateway pool (30분 TTL, Promise dedup)

### 체인코드 함수 분류

| 카테고리 | 함수 수 | 예시 |
|----------|---------|------|
| 원자재 | 2 | RegisterRawMaterial, QueryRawMaterials |
| 여권 CRUD | 6 | CreatePassport, QueryPassport, CorrectPassportData |
| 여권 조회 | 3 | QueryAllPassports, QueryPassportsWithPagination, GetPassportHistory |
| VIN 바인딩 | 1 | BindToVehicle |
| BMU 데이터 | 4 | RecordBMUData, QueryBMURecordsByPassport, InvalidateBMURecord |
| 정비/분석 | 4 | RequestMaintenance, CompleteMaintenance, RequestAnalysis, SubmitAnalysisResult |
| 재활용 | 3 | SetRecycleAvailability, ExtractMaterials, DisposeBattery |
| VC 앵커 | 8 | IssueCredential, RevokeCredential, QueryCredentialsByPassport |
| 유틸 | ~9 | buildPassportQuery (RBAC), checkPassportAccess, requireMSP |

### RBAC 매트릭스

| 기능 | Manufacturer | EVMfg | Service | Regulator |
|------|:---:|:---:|:---:|:---:|
| 여권 발급 | O | | | |
| VIN 바인딩 | | O | | |
| 정비/분석 요청 | | O | | |
| 분석 결과 제출 | | | O | |
| 재활용/폐기 | | | | O |
| BMU 데이터 기록 | O | O | | |
| FC 리셋 | O | | | O |
| 여권 조회 | 본인 생성분 | 본인 바인딩분 + MANUFACTURED | MAINTENANCE/ANALYSIS + 정비이력 | 전체 |
| VC 검증 이력 조회 (credential별) | passport 접근 권한 | passport 접근 권한 | passport 접근 권한 | passport 접근 권한 |
| VC 검증 이력 조회 (검증자별) | | | | O |
| 규제 검증 상태 업데이트 | | | | O |
| 실물-이력 검증 | O | | | O |
| 발급기관 목록 조회 | | | | O |
| 발급기관별 Credential 타입 | 본인 MSP | 본인 MSP | 본인 MSP | 전체 |
| VC 발급 요청 | passport 접근 권한 | passport 접근 권한 | passport 접근 권한 | passport 접근 권한 |
| VC 발급 승인/거부 | | | | O (+ 대상 IssuerMSP) |

## API 엔드포인트 (bmu-agent, 포트 3001)

| 그룹 | 경로 | 주요 메서드 |
|------|------|------------|
| auth | `/api/auth` | POST login, POST register |
| passport | `/api/passports` | GET /, POST /, GET /:id, PUT /:id/bind, POST /:id/correct |
| material | `/api/materials` | GET /, POST /, POST /:id/materials |
| bmu | `/api/bmu` | POST /data, GET /records/:passportId, POST /invalidate/:recordId |
| maintenance | `/api/maintenance` | POST /:id/request, POST /:id/log, POST /:id/accident |
| analysis | `/api/analysis` | POST /:id/request, POST /:id/result |
| recycling | `/api/recycling` | PUT /:id/availability, POST /:id/extract, POST /:id/dispose |
| vc | `/api/vc` | POST /issue, POST /revoke, GET /verify/:credentialId |
| did | `/api/did` | GET /verkey/:did, POST /schemas, POST /credential-definitions |

## 프론트엔드 (webapp/frontend)

- **레이아웃**: 64px 좌측 아이콘 사이드바 + 52px 상단바 (ADR-001)
- **기술**: Vue 3 CDN (빌드 없음), Tailwind CSS, Pretendard + Outfit + JetBrains Mono
- **페이지**: dashboard, passports, passport-detail, materials, bmu-data, maintenance, recycling, qr-scan, audit-log, login/landing
- **디자인 토큰**: `wiki/passport/design-tokens.md` 참조

## 데이터 흐름

1. BMU → CAN-FD → Agent `/api/bmu` → Fabric `RecordBMUData`
2. Agent → Fabric `CreatePassport` → CouchDB 저장
3. Frontend → Agent REST API → Fabric Query/Invoke
4. MCP Monitor → Agent 로그 (NDJSON) + Fabric 쿼리 (읽기 전용)

## MCP 모니터링 레이어

```
Claude Code ←stdio→ MCP Monitor ←→ Fabric (evaluateTransaction)
                                 ←→ logs/agent.log (NDJSON)
                                 ←→ Docker API (ps)
                                 ←→ HTTP (Agent, VON, ACA-Py)
```

MCP Monitor는 **읽기 전용** 관찰자:
- Fabric: `QueryPassportsWithPagination`, `QueryBMURecordsByPassport`, `QueryCredentialsByType` 등
- 로그: 구조화 JSON 로그를 tail-read (16KB 청크, 메모리 효율)
- 시스템: Docker 컨테이너 상태, HTTP 헬스체크
- VC RBAC: 연결된 org MSP에 따라 가시 범위 제한됨 (RegulatorMSP만 전체 조회)

## 임베디드 상세 데이터 경로

```
MATLAB/Simulink → UDP:5005 → dataProcess.py → UART → CMU(S32K144)
CMU → CAN-FD(AES-128 CMAC) → BMU(S32K344)
BMU → CMAC검증 → Ed25519서명 → UART(COM4,28800) → serial_to_agent.py
serial_to_agent.py → HTTP POST → Agent:3001/api/bmu/data → Fabric 원장
```

## 보안 계층

| 계층 | 메커니즘 | 구현 |
|------|----------|------|
| CMU↔BMU 통신 | AES-128 CMAC + FC | HSE 하드웨어 (352us) |
| 키 교환 | ECDH (부팅 시) | HSE 하드웨어 |
| 블록체인 서명 | Ed25519 | TweetNaCl 소프트웨어 (~5s) |
| 재전송 방지 | Frame Counter window | 프로토콜 레벨 |
| 디바이스 인증 | DID/VC | Hyperledger Indy + ACA-Py |

## 성능 수치 (DWT 측정, 2026-03-23)

| 항목 | 소요 시간 |
|------|-----------|
| AES-128 CMAC 검증 | 352us |
| E2E 처리 (FC+CMAC) | 367us |
| Ed25519 서명 | ~5,000ms |
| CMAC 성공률 | 99.9% |
