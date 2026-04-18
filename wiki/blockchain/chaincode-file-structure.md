---
title: "체인코드 파일 분리 구조"
date: 2026-04-13
updated: 2026-04-13
tags: [chaincode, refactor, structure]
doc_type: reference
---
# 체인코드 파일 분리 구조

코드 리뷰 C-6 (God Object) 해결. 3053줄 단일 파일 → 7개 파일 분리.

## 파일 구조

| 파일 | 줄 | 역할 |
|------|-----|------|
| `types.go` | 337 | struct 14개, const, var (credTypeIssuers, fieldCorrectors, validSignalKeys) |
| `helpers.go` | 186 | txTimestamp, sanitizeSelector, RBAC (requireMSP, checkPassportAccess 등), normalizePassport, mergeSnapshot |
| `passport_tx.go` | 866 | 여권 CRUD + 상태 변경 13개 함수 |
| `bmu_tx.go` | 360 | BMU 데이터 3개 함수 (RecordBMUData, InvalidateBMURecord, ResetFCForDID) |
| `vc_tx.go` | 650 | VC + 규제/실물 검증 + 발급요청/승인 13개 함수 |
| `query.go` | 680 | 조회 함수 15개 |
| `main.go` | 18 | 엔트리포인트 |

## 규칙

- 모든 파일은 `package main`
- 새 함수 추가 시 해당 카테고리 파일에 작성
- struct 추가는 `types.go`
- RBAC/헬퍼 추가는 `helpers.go`
- 조회 전용 함수는 `query.go`

## 참고
- [[chaincode-security-fixes]] — 보안 수정 이력
- [[couchdb-injection-pattern]] — CouchDB injection 방지
