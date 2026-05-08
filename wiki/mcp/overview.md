---
title: "MCP 세션 개요"
date: 2026-04-21
tags: [mcp, overview]
doc_type: overview
status: current
---
# MCP 모니터링 세션

> 현재 기준 문서
>
> 이 문서는 MCP 세션의 현재 책임 범위와 도구 표면을 설명한다.
> 작업 이력은 [[mcp/activity-log|활동 로그]]에서 별도로 본다.

## 담당 범위
- `mcp-monitor/` — MCP 모니터링 서버 (읽기 전용, 블록체인 쓰기 없음)

## 현재 구조
```text
MCP Client (Claude Code) ← stdio → index.js ←→ tools/*.js ←→ Fabric / Passport API / Logs / Docker
```

## 현재 기준 원칙
- Fabric 쿼리는 `evaluateTransaction` 중심의 읽기 전용이다.
- 로그 소스는 `logs/agent.log` 기반이다.
- Passport 3차년도 관찰은 `GET /api/status`, `GET /api/audit`, `logs/audit.log` 기반이다.
- wallet은 공유하되 자동 enrollment 없이 사전 등록 흐름을 따른다.
- tool 결과는 관찰/상태 점검 목적에 집중한다.
- `/api/audit`는 사전 주입된 ManufacturerMSP/RegulatorMSP JWT만 사용하며, 토큰이 없으면 로컬 감사 로그 fallback을 사용한다.
- Fabric rich-query/typed state loader 오류(`docType` mismatch 등)는 fail-closed 결과로 보고, monitor가 조용히 skip하지 않고 `fabricQuery.errors[]` 또는 MCP `isError`로 노출한다.

## 제공 도구
| Tool | Action | 설명 |
|------|--------|------|
| `monitor_transactions` | recent / stats / search | 트랜잭션 로그와 통계 |
| `monitor_bmu` | anomalies / latest / frequency / thresholds | BMU 이상치 및 수신 상태 |
| `monitor_vc` | events / expiring / stats / revoked | VC 이벤트와 통계 |
| `system_status` | overview / fabric / von / acapy / agent / docker | 전체 시스템 상태 |
| `monitor_passport` | status / audit / trends / observation_plan | Passport API·감사·BMU/VC/error trend 읽기 전용 관찰 |

## 설계 포인트
- 로그 중복제거
- INVALIDATED BMU 필터링
- MSP 기반 VC 가시 범위 제어
- throw 기반 에러 signaling
- 입력값 cross-validation
- Passport 관찰 출력의 민감 필드 추가 redaction
- BMU ingestion failure trend/error rate, invalidation, freshness counter anomaly, VC issue failure trend, VC verification trend, chaincode `INTERNAL` error trend 집계
- BMU monitoring event 분리 표시: missing signature, invalid rawPayload, stale FC, DID mismatch, binding code zero/mismatch
- 3차년도 증적 경로는 `BMU -> Agent -> Fabric -> Passport/MCP`로 명시
- validation category 집계: holder DID mismatch, malformed `expiresAt`, malformed timestamp, invalid rawPayload, invalid `dataHash`, missing signature, stale FC, VC issue 400/VAL, DID mismatch, binding code zero/mismatch
- Fabric query error 정규화: `DOC_TYPE_MISMATCH`, `DECODE_FAILURE`, `FABRIC_EVALUATE_ERROR`, `MONITOR_CONFIGURATION_ERROR`, `QUERY_ERROR`

## 함께 보는 문서
- [[decisions/003-mcp-monitor-read-only|ADR-003]]
- [[decisions/005-mcp-session-hook-isolation|ADR-005]]
- [[common/architecture|시스템 아키텍처]]
- [[common/terminology|용어 사전]]

## 기록성 문서
- historical 작업 로그: [[mcp/activity-log|MCP 세션 활동 로그]]
