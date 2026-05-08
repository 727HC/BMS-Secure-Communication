---
title: "블록체인 세션 개요"
date: 2026-04-20
tags: [blockchain, overview]
doc_type: overview
status: current
---
# 블록체인 세션

> 현재 기준 문서
>
> 이 문서는 Blockchain 세션의 현재 책임 범위와 핵심 구조를 설명한다.
> 시계열 변경 이력은 [[blockchain/activity-log|활동 로그]]에서 별도로 본다.

## 담당 범위
- `passport-network/` — 4-Org Fabric 네트워크 설정, 채널, 피어, CA
- `chaincode/passport-contract/` — Go 체인코드 (여권, 원자재, BMU, VC 처리)

> 2026-04-06 재배분: 체인코드가 Passport → Blockchain 세션으로 이관됨 (ADR-002)

## 현재 목표
- 국가과제 KPI 기준 정리
- 체인코드 보안/운영 패턴 유지
- 네트워크와 체인코드 구조의 현재 기준 문서화

## 핵심 기술 스택
- Hyperledger Fabric 2.5
- Docker, CouchDB
- 4-Org 구성: Manufacturer, EVManufacturer, Service, Regulator
- Go 1.22 chaincode

## 현재 구조 요약
- 채널: `passportchannel`
- 체인코드: `passport-contract`
- 오더러: Raft 기반
- CA: 각 Org별 Fabric CA 운영


## Live E2E 기준 (2026-05-08)
- 현재 live chaincode: `passport-contract` v`1.4`, sequence `6`
- 다음 lifecycle 변경은 sequence `7`부터 진행한다.
- MATLAB/BMU E2E 기준 DID: `4d5CE8NZbkAVJxcypzaVhw`
- E2E passport: `PASSPORT-E2E-20260508040123`
- BMS binding code: `748293644` (`0x2c9a0e0c`, raw bytes `0c 0e 9a 2c`)
- 상세 상태: [[blockchain/e2e-live-status-2026-05-08|E2E Live Status — 2026-05-08]]

## 현재 참고 우선순위
- 구조: [[blockchain/chaincode-file-structure|체인코드 파일 구조]]
- KPI: [[blockchain/kpi-targets|KPI 목표]]
- 보안: [[blockchain/chaincode-security-fixes|체인코드 보안 수정 이력]]
- 쿼리 패턴: [[blockchain/couchdb-injection-pattern|CouchDB JSON Injection 방지 패턴]]
- 보조 아키텍처: [[blockchain/cloud-agent-architecture|Cloud Agent 아키텍처]]

## 세션 경계 참고
- `bmu-agent/`, `webapp/` → Passport 세션 담당
- `chaincode/`, `passport-network/` → Blockchain 세션 담당
- API 영향이 있는 변경은 Passport 세션과 협의한다.

## 기록성 문서
- historical 활동 로그: [[blockchain/activity-log|블록체인 세션 활동 로그]]
- handoff 기록: [[handoffs/blockchain/README|Blockchain handoff 허브]]
- review 기록: [[reviews/blockchain/README|Blockchain review 허브]]
