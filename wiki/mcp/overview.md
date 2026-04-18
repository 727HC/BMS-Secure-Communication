---
title: "MCP 세션 개요"
date: 2026-04-06
tags: [mcp, overview]
doc_type: overview
---
# MCP 모니터링 세션

## 담당 범위
- `mcp-monitor/` — MCP 모니터링 서버 (읽기 전용, 블록체인 쓰기 없음)

## 아키텍처

```
MCP Client (Claude Code) ←stdio→ index.js ←→ tools/*.js ←→ Fabric / Logs / Docker
```

- Fabric 쿼리: `evaluateTransaction` (읽기 전용)
- 로그 소스: `logs/agent.log` (NDJSON, tee+logger 이중 기록 → 중복제거 적용)
- Wallet: `bmu-agent/wallet/` 공유 (자동 enrollment 없음, 사전 등록 필요)

## 제공 도구 (MCP Tools)

| Tool | Action | 설명 |
|------|--------|------|
| `monitor_transactions` | recent | 최근 트랜잭션 (로그 기반 + Fabric 보충) |
| | stats | 성공/실패 통계, TPS 측정 |
| | search | 함수명으로 검색 |
| `monitor_bmu` | anomalies | SOC/전압/온도 임계값 초과 탐지 |
| | latest | 최신 BMU 데이터 (INVALIDATED 필터링) |
| | frequency | 수신 빈도 분석, 30분+ 갭 알림 |
| | thresholds | 임계값 조회/변경 (cross-validation) |
| `monitor_vc` | events | VC 발급/폐기 이벤트 로그 |
| | expiring | 만료 임박 VC (기본 30일) |
| | stats | 타입/상태별 통계 (RBAC 범위 표시) |
| | revoked | 폐기된 VC 목록 |
| `system_status` | overview | 전체 시스템 요약 |
| | fabric | Fabric 노드 상세 |
| | von | VON Network 상태 |
| | acapy | ACA-Py 상태 |
| | agent | Agent 프로세스 상태 |
| | docker | Docker 컨테이너 목록 |

## 핵심 기술 스택
- `@modelcontextprotocol/sdk` ^1.12.1 — MCP 프로토콜
- `fabric-network` ^2.2.20 — Fabric SDK (읽기 전용)
- `axios` ^1.9.0 — HTTP 상태 체크 (Agent, VON, ACA-Py)
- `dotenv` ^17.3.1 — 환경변수
- stdio transport — Claude Code 연동

## 주요 설계 결정
- 로그 중복제거: `timestamp|category|message` Set 기반 (H2)
- BMU: `status !== 'INVALIDATED'` 필터 필수 (H5)
- VC: org MSP에 따라 데이터 범위 다름 → `dataScope` 필드 포함 (M8)
- 에러: 모든 도구에서 `throw` 통일 → `isError: true` MCP 응답 (MH6)
- 입력: `limit` int 1-500, `hours` 0.1-720, threshold min < max 강제 (M11)

## Hook 시스템 (`mcp-monitor/.claude/`)
- `SessionStart` → 세션 범위 자동 주입
- `PreToolUse (Edit|Write)` → mcp-monitor/ 외부 수정 차단
- `PostToolUse (Edit|Write)` → .js 자동 구문 검증 (`node -c`)
- `PostCompact` → 상태 보존 리마인더

## 4-Org RBAC 영향

| Org | MSP | VC 쿼리 범위 |
|-----|-----|-------------|
| Org1 | ManufacturerMSP | 자기 발급 VC만 |
| Org2 | EVManufacturerMSP | 자기 발급 VC만 |
| Org3 | ServiceMSP | 자기 발급 VC만 |
| Org4 | RegulatorMSP | **전체 VC** |

모니터가 Org1로 연결 시 ManufacturerMSP 범위만 보임. 전체 조회는 RegulatorMSP 필요.
