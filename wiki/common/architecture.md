---
title: "시스템 아키텍처"
date: 2026-04-20
tags: [architecture, overview]
doc_type: reference
status: current
---
# BMS-Blockchain 시스템 아키텍처

> 현재 기준 문서
>
> 사용자용 주 인터페이스는 React 기반 프런트가 담당한다. 레거시 UI 경로는 호환용으로 남아 있지만, 이 문서는 현재 운영 기준만 설명한다.

## 전체 구성

```text
┌─────────────────────────────────────────────────┐
│              Frontend (Current UI)              │
│         React + TypeScript + Vite + Router      │
├─────────────────────────────────────────────────┤
│               BMU Agent (Node.js)               │
│          Express + Fabric SDK + ACA-Py          │
├─────────────────────────────────────────────────┤
│          Hyperledger Fabric 2.5 Network         │
│   4-Org: Manufacturer, EVMfg, Service, Regulator│
│          passport-contract (Go 1.22)            │
├─────────────────────────────────────────────────┤
│            Embedded (NXP S32K3)                 │
│         BMU/CMU → CAN-FD → HSE 보안             │
├─────────────────────────────────────────────────┤
│            MCP Monitor Server                   │
│        tx-monitor, bmu-monitor, vc-monitor      │
└─────────────────────────────────────────────────┘
```

## 주요 디렉토리

| 디렉토리 | 설명 | 세션 |
|----------|------|------|
| `bmu-agent/` | Node.js API 서버, 9개 라우트 그룹 | Passport |
| `webapp/frontend-react/` | 현재 React UI, 라우트 단위 및 내부 lazy loading 적용 | Passport |
| 레거시 프런트 호환 경로 | 기존 UI 호환 제공용 경로 | Passport |
| `passport-network/` | 4-org Fabric 네트워크 설정 | Blockchain |
| `chaincode/passport-contract/` | Go 체인코드, 여권/원자재/BMU/VC 처리 | Blockchain |
| `embedded/`, `firmware/` | S32K3, CAN-FD, HSE | Embedded |
| `mcp-monitor/` | MCP 모니터링 서버 | MCP |
| `wiki/` | Obsidian vault, 프로젝트 지식 베이스 | Common |

## 프런트엔드 계층
### 현재 UI
- React 19 + TypeScript + Vite
- React Router 기반 페이지 라우팅
- `AuthContext`, `ThemeContext`로 사용자 세션/테마 관리
- route-level + page-internal lazy loading 적용

### 서빙 방식
- `bmu-agent/server.js`가 React build가 있으면 `/`에서 현재 UI를 서빙한다.
- 호환 목적의 레거시 UI 경로는 별도 보조 경로로 남아 있다.

## 백엔드 계층
- Express API 서버
- Fabric SDK 연동
- ACA-Py / DID / VC 흐름 연계
- audit middleware와 상태 API 제공

## Fabric 네트워크 상세
- 채널: `passport-channel`
- 체인코드: `passport-contract`
- 상태 DB: CouchDB
- 인증: Fabric CA → X.509 인증서 → Wallet
- Gateway: 사용자별 Gateway pool

## 데이터 흐름
1. Frontend → Agent REST API
2. Agent → Fabric Query / Invoke
3. BMU 데이터 → Agent `/api/bmu` → Fabric 원장 기록
4. MCP Monitor → Fabric / 로그 / HTTP 상태를 읽기 전용으로 관찰

## 임베디드 데이터 경로
```text
MATLAB/Simulink → UDP:5005 → dataProcess.py → UART → CMU(S32K144)
CMU → CAN-FD(AES-128 CMAC) → BMU(S32K344)
BMU → CMAC검증 → Ed25519서명 → UART → serial_to_agent.py
serial_to_agent.py → HTTP POST → Agent `/api/bmu/data` → Fabric 원장
```

## 보안 계층
| 계층 | 메커니즘 | 구현 |
|------|----------|------|
| CMU↔BMU 통신 | AES-128 CMAC + FC | HSE 하드웨어 |
| 키 교환 | ECDH (부팅 시) | HSE 하드웨어 |
| 블록체인 서명 | Ed25519 | 소프트웨어 서명 |
| 재전송 방지 | Frame Counter window | 프로토콜 레벨 |
| 디바이스 인증 | DID/VC | ACA-Py + 원장 연계 |

## 함께 보는 문서
- [[passport/overview|배터리 여권 세션 개요]]
- [[passport/frontend|프론트엔드 구조]]
- [[blockchain/README|Blockchain 허브]]
- [[embedded/README|Embedded 허브]]
- [[mcp/README|MCP 허브]]
