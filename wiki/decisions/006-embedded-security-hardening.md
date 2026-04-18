---
title: "ADR-006: 임베디드 보안 강화 로드맵"
date: 2026-04-10
tags: [adr, embedded, security, crypto]
doc_type: adr
status: accepted
---
# ADR-006: 임베디드 보안 강화 로드맵

## 배경

코드 리뷰(W4-W6 이후 추가 리뷰)에서 임베디드 보안 관련 2건이 확인됨.
둘 다 기능 정상 작동 중이며 실무 위험은 낮지만, 생산 배포 또는 논문 방어 시 개선이 필요한 항목.

## 항목 1: CMU FlexNVM 자동 파티셔닝 분리

### 현재 상태

- `CMU_BMS_S32K144/src/main.c:252-284` — `CMU_InitCsecHw()`
- 부팅 시 `EEERDY` 체크 → 이미 파티션됐으면 skip (가드 있음)
- 미파티션 보드에서만 Program Partition 명령 실행
- FlexNVM 파티셔닝은 **비가역적** (한 번 설정하면 mass erase 없이 변경 불가)

### 문제

- 개발 단계에서는 편리하지만, 생산 보드에서 런타임 빌드가 실수로 파티셔닝을 수행할 가능성 존재
- 제조 프로비저닝과 런타임 동작이 같은 바이너리에 혼재

### 결정: 생산 빌드 분리 (HSE NVM 프로비저닝 시점에 구현)

- `#ifdef PROVISIONING_BUILD` 가드로 파티셔닝 코드 분리
- 런타임 빌드에서는 `EEERDY` 미설정 시 `PROTO_STATE_ERROR`로 정지
- 프로비저닝 빌드: 파티셔닝 + PSK 로드 + 검증까지 수행하는 전용 바이너리

### 일정

- 현재: 가드 체크로 충분 (개발 보드 전부 파티션 완료 상태)
- HSE NVM 프로비저닝 구현 시: 프로비저닝 빌드 분리와 함께 적용

---

## 항목 2: AES-ECB UID 고정 암호문 → nonce 기반 전환

### 현재 상태

- CMU: `CMU_AesEcbEncrypt(g_uid, ...)` (main.c:628)
- BMU: `HSE_CIPHER_BLOCK_MODE_ECB` 복호화 (main.c:378)
- 키교환 1단계에서 UID/seed를 `AES-ECB(PSK, data)` 로 전송
- 이후 KDF: `SessionKey = CMAC(PSK, Label‖UID‖Seed‖Counter)` — NIST SP 800-108 준수

### 문제

- UID는 장치 고유 고정값 → 매 키교환마다 동일 암호문 생성
- CAN 버스 스니핑 시 동일 암호문으로 장치 추적(device tracking) 이론적 가능
- ECB 모드 자체의 교과서적 취약점 지적에 대한 논문 방어 부담

### 실질 위험 평가

| 공격 시나리오 | 전제 조건 | 위험도 |
|--------------|----------|--------|
| UID 암호문으로 장치 식별 | CAN 물리 접근 | **낮음** — OBD 포트 접근 필요 |
| PSK 추출 후 UID 복호화 | PSK 탈취 | **낮음** — PSK 탈취 시 더 큰 문제 |
| 세션키 추론 | 암호문만으로 | **없음** — seed 랜덤 + KDF 분리 |

### 결정: 프로토콜 v2에서 nonce 기반으로 전환

수정 방안:
1. CMU가 키교환 시작 시 랜덤 nonce(16B) 생성
2. `ECB(PSK, UID ⊕ nonce)` 또는 CTR 모드로 전환
3. nonce를 키교환 프레임에 평문 포함 (기밀성 불필요)
4. BMU 측도 동일하게 수정 (프로토콜 양쪽 동시 변경 필수)

### 논문 방어 (현재 설계 유지 시)

- "단일 16B 블록 ECB → 블록 내 패턴 노출 없음"
- "ECB는 전송 보호 전용, 최종 키는 KDF(CMAC) 파생"
- "UID 추적은 CAN 물리 접근 전제, 차량 내부 버스 보안은 범위 외"

### 일정

- 현재: 기능 정상, 논문에 방어 논거 명시
- 프로토콜 v2 (HSE NVM 프로비저닝과 동시): nonce 기반 전환
- BMU/CMU 동시 수정 필수 (한쪽만 바꾸면 핸드셰이크 실패)

---

## 공통 일정

| 시점 | 항목 |
|------|------|
| 현재 | 현행 유지, 논문 방어 논거 준비 |
| HSE NVM 프로비저닝 구현 시 | FlexNVM 빌드 분리 + ECB→nonce 전환 동시 적용 |
| 생산 배포 전 | 프로비저닝 빌드 검증, 키교환 프로토콜 v2 테스트 |
