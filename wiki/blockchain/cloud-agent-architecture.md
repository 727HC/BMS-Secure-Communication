---
title: "Cloud Agent 아키텍처"
date: 2026-04-13
updated: 2026-04-13
tags: [cloud-agent, mongodb, offchain, tps, architecture]
doc_type: reference
---
# Cloud Agent 아키텍처

논문 VI장 "Cloud Agent" 구현. 블록체인 + 클라우드 이중 저장 구조.

## 논문 설계

> "블록체인은 데이터의 해시 및 메타정보만을 기록, 클라우드 데이터베이스는 원본 데이터를 저장하여 고속 응답 요구를 충족"

## 구현

```
Fabric 원장 (신뢰 저장소)
    ↓ Block Event
MongoDB (고속 읽기 캐시)
    ↑
REST API (포트 3002)
```

### 구성 요소

| 컴포넌트 | 기술 | 역할 |
|---------|------|------|
| Block Event Listener | Fabric SDK | 블록 이벤트 수신, write set 파싱 |
| MongoDB | Docker (mongo:7) | 원본 데이터 저장, 인덱스 기반 고속 조회 |
| REST API | Express (포트 3002) | 여권/BMU/VC 조회, 검색, 통계 |
| Initial Sync | initial-sync.js | Fabric → MongoDB 초기 적재 |

### MongoDB 컬렉션

| 컬렉션 | docType | 인덱스 |
|--------|---------|-------|
| passports | batteryPassport | passportId(unique), did, vin, status, updatedAt |
| bmuRecords | bmuRecord | recordId(unique), passportId+fc, did+fc |
| snapshots | bmuSnapshot | passportId |
| credentials | verifiableCredential | credentialId(unique), passportId, issuerMsp+credType |
| verifications | vcVerification | verificationId |
| materials | rawMaterial | materialId |
| credentialRequests | credentialRequest | requestId |

### API 엔드포인트

| 경로 | 메서드 | 용도 |
|------|--------|------|
| /api/passports | GET | 여권 목록 (페이지네이션) |
| /api/passports/:id | GET | 여권 상세 |
| /api/passports/search | GET | 여권 검색 (VIN, DID, model 등) |
| /api/bmu/:passportId | GET | BMU 데이터 조회 |
| /api/credentials/:passportId | GET | VC 조회 |
| /api/stats | GET | 통계 (대시보드용) |
| /health | GET | 헬스체크 |

## TPS 성과

| 측정 | TPS | 목표 |
|------|-----|------|
| Cloud READ (MongoDB) | **1,571** | 1,500 ✅ |
| Fabric READ (CouchDB) | 407 | baseline |
| Fabric WRITE | 25.9 | 150 (미달) |

## 운영

```bash
# MongoDB
docker run -d --name mongodb-passport -p 27017:27017 -v mongodb-passport-data:/data/db mongo:7

# Cloud Agent
cd cloud-agent && node server.js

# 초기 동기화
node initial-sync.js
```

## 참고
- [[blockchain/kpi-targets|KPI 목표 및 달성 현황]]
- [[handoffs/blockchain/passport-handoff-2026-04-13|Passport 세션 handoff]] — Passport 세션 전달 사항
