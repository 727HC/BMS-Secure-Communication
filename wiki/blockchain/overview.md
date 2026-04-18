---
title: "블록체인 세션 개요"
date: 2026-04-06
tags: [blockchain, overview]
doc_type: overview
---
# 블록체인 세션

## 담당 범위
- `passport-network/` — 4-Org Fabric 네트워크 설정, 채널, 피어, CA
- `chaincode/passport-contract/` — Go 체인코드 (40개 함수, GBA 21)

> 2026-04-06 재배분: 체인코드가 Passport → Blockchain 세션으로 이관 (ADR-002)

## KPI
- 읽기 1,500+ TPS
- 쓰기 150+ TPS

## 핵심 기술 스택
- Hyperledger Fabric 2.5
- Docker, CouchDB
- 4-Org 구성: Manufacturer, EVManufacturer, Service, Regulator

## 네트워크 구성
- 채널: passport-channel (단일)
- 체인코드: passport-contract (Go 1.22)
- 오더러: Raft 기반
- CA: 각 Org별 Fabric CA 운영

## 현황
- Phase 1 완료: 4-Org 네트워크 + passport-contract 배포
- bmu-agent 보안 리뷰 완료 (2026-04-02, Codex 코드 리뷰 8건 수정)
- TPS KPI 달성 작업 미착수

## 세션 경계 참고
- `bmu-agent/`, `webapp/` → Passport 세션 담당
- `chaincode/` → 블록체인 세션 담당 (2026-04-06~)
- 체인코드 변경 시 API 영향이 있으면 Passport 세션과 협의
