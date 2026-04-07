---
title: 용어 사전
date: 2026-04-06
tags: [terminology, reference]
---

# 용어 사전

## 배터리 여권

| 용어 | 설명 |
|------|------|
| BATP | Battery Passport — 배터리 여권 플랫폼 |
| GBA 21 | Global Battery Alliance 규격 (20+ 필드) |
| DID | Decentralized Identifier — 분산 식별자 |
| VC | Verifiable Credential — 검증 가능 인증서 |
| SOC | State of Charge — 충전 상태 (%) |
| SOH | State of Health — 건강 상태 (%) |

## Fabric

| 용어 | 설명 |
|------|------|
| MSP | Membership Service Provider |
| ManufacturerMSP | 배터리 제조사 (Org1) |
| EVManufacturerMSP | EV 완성차 제조사 (Org2) |
| ServiceMSP | 정비/분석 기관 (Org3) |
| RegulatorMSP | 규제/검증 기관 (Org4) |
| RBAC | Role-Based Access Control — 역할 기반 권한 |
| CCP | Common Connection Profile — Fabric 네트워크 접속 설정 파일 |
| Gateway | Fabric SDK 게이트웨이 — 피어 연결 및 트랜잭션 제출 |
| Wallet | X.509 인증서 저장소 (파일시스템 기반) |
| Endorsement | 트랜잭션 보증 — 피어가 시뮬레이션 후 서명 |
| Orderer | 트랜잭션 순서 결정 노드 (Raft 합의) |
| CouchDB | 상태DB — Rich Query (JSON selector) 지원 |
| Bookmark | CouchDB 페이지네이션 커서 |
| MVCC_READ_CONFLICT | 동시 쓰기 충돌 (재시도 필요) |

## 임베디드

| 용어 | 설명 |
|------|------|
| BMU | Battery Management Unit — S32K344 (Cortex-M7) |
| CMU | Cell Management Unit — S32K144 (Cortex-M4) |
| CAN-FD | Controller Area Network Flexible Data-rate |
| HSE | Hardware Security Engine (S32K3 내장, AES/ECC/CMAC) |
| CSEc | Cryptographic Service Engine compressed (S32K1 내장) |
| S32K3 | NXP 차량용 MCU (Cortex-M7, HSE 내장) |
| S32K1 | NXP 차량용 MCU (Cortex-M4, CSEc 내장) |
| CMAC | Cipher-based Message Authentication Code (AES-128) |
| ADKP | Application Debug Key/Password — HSE 디버그 인증 키 |
| FC | Frame Counter — 재전송 공격 방지용 순차 카운터 |
| TweetNaCl | 경량 암호 라이브러리 (Ed25519 서명) |
| DWT | Data Watchpoint and Trace — ARM 성능 측정 카운터 |
| RTD | Real-Time Drivers — NXP AUTOSAR 드라이버 패키지 |
| PEmicro | 디버거/프로그래머 (Multilink) |
| ECDH | Elliptic Curve Diffie-Hellman — 키 교환 프로토콜 |

## MCP / 모니터링

| 용어 | 설명 |
|------|------|
| MCP | Model Context Protocol — AI 도구 표준 프로토콜 |
| stdio transport | 표준입출력 기반 MCP 통신 방식 |
| NDJSON | Newline-Delimited JSON — 구조화 로그 포맷 |
| TPS | Transactions Per Second — 초당 트랜잭션 처리량 |
| dataScope | VC 쿼리 시 org RBAC에 따른 데이터 가시 범위 |
| INVALIDATED | BMU 레코드 무효화 상태 (필터링 대상) |
| evaluateTransaction | Fabric 읽기 전용 쿼리 (원장 변경 없음) |
| submitTransaction | Fabric 쓰기 트랜잭션 (MCP Monitor는 사용 금지) |

## 상태 코드

| 상태 | 한글 | 설명 |
|------|------|------|
| MANUFACTURED | 제조완료 | 여권 발급 직후 |
| ACTIVE | 운행중 | VIN 바인딩 완료, 운행 중 |
| MAINTENANCE | 정비중 | 정비 요청 접수됨 |
| ANALYSIS | 분석중 | 분석 진행 중 |
| RECYCLING | 재활용 | 재활용 프로세스 진행 |
| DISPOSED | 폐기 | 최종 폐기 처리 |
