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
MCP Client (Claude Code) ← stdio → index.js ←→ tools/*.js ←→ Fabric / Logs / Docker
```

## 현재 기준 원칙
- Fabric 쿼리는 `evaluateTransaction` 중심의 읽기 전용이다.
- 로그 소스는 `logs/agent.log` 기반이다.
- wallet은 공유하되 자동 enrollment 없이 사전 등록 흐름을 따른다.
- tool 결과는 관찰/상태 점검 목적에 집중한다.

## 제공 도구
| Tool | Action | 설명 |
|------|--------|------|
| `monitor_transactions` | recent / stats / search | 트랜잭션 로그와 통계 |
| `monitor_bmu` | anomalies / latest / frequency / thresholds | BMU 이상치 및 수신 상태 |
| `monitor_vc` | events / expiring / stats / revoked | VC 이벤트와 통계 |
| `system_status` | overview / fabric / von / acapy / agent / docker | 전체 시스템 상태 |

## 설계 포인트
- 로그 중복제거
- INVALIDATED BMU 필터링
- MSP 기반 VC 가시 범위 제어
- throw 기반 에러 signaling
- 입력값 cross-validation

## 함께 보는 문서
- [[decisions/003-mcp-monitor-read-only|ADR-003]]
- [[decisions/005-mcp-session-hook-isolation|ADR-005]]
- [[common/architecture|시스템 아키텍처]]
- [[common/terminology|용어 사전]]

## 기록성 문서
- historical 작업 로그: [[mcp/activity-log|MCP 세션 활동 로그]]
