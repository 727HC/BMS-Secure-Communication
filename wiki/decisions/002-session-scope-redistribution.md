---
title: "ADR-002: 세션 범위 재배분"
date: 2026-04-06
tags: [adr, architecture, sessions]
status: accepted
---

# ADR-002: 세션 범위 재배분

## 상태
Accepted (Passport + Blockchain 세션 합의)

## 맥락
기존 배분에서 체인코드(`chaincode/`)가 Passport 세션, API 서버(`bmu-agent/`)가 Blockchain 세션에 있어 기술 스택과 역할이 불일치.
- 체인코드는 Go + Fabric SDK로 블록체인 도메인
- bmu-agent는 Node.js + Express로 애플리케이션 도메인
- 블록체인 세션이 이미 bmu-agent 보안 리뷰를 수행한 상태

## 결정
기술 스택 기준으로 재배분:

| Session | Before | After |
|---------|--------|-------|
| Passport | `chaincode/`, `webapp/` | `bmu-agent/`, `webapp/` |
| Blockchain | `passport-network/`, `bmu-agent/` | `passport-network/`, `chaincode/` |

## 결과
- Blockchain 세션: Fabric 인프라 + 체인코드 전체 관할
- Passport 세션: API 서버 + 프론트엔드 전체 관할
- 체인코드 변경 시 API 영향이 있으면 두 세션 협의 필요
