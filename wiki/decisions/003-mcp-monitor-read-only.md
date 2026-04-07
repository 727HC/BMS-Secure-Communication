---
title: "ADR-003: MCP Monitor 읽기 전용 원칙"
date: 2026-04-06
tags: [adr, mcp, security]
status: accepted
---

# ADR-003: MCP Monitor 읽기 전용 원칙

## 상태
Accepted

## 맥락
MCP Monitor가 Fabric admin identity를 공유하면서 자동 CA enrollment(`adminpw`)까지 수행하고 있었음. 모니터링 서버가 wallet을 변경하고 특권 identity를 생성하는 것은 보안 위험.

## 결정
MCP Monitor를 **완전한 읽기 전용 서비스**로 제한:
- `fabric-ca-client` 의존성 제거, 자동 enrollment 삭제
- Wallet identity는 `bmu-agent`에서 사전 등록된 것만 사용
- Fabric 호출은 `evaluateTransaction`(읽기)만 허용, `submitTransaction`(쓰기) 금지
- identity 없으면 명확한 에러 메시지로 안내

## 결과
- 모니터가 wallet을 변경할 수 없음 → 감사 추적 분리 유지
- `fabric-ca-client` 제거로 의존성 축소 (~350 LOC 삭제)
- bmu-agent가 먼저 실행되어 identity가 등록된 상태여야 모니터 사용 가능
