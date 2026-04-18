---
title: "펌웨어 키/시크릿 관리"
date: 2026-04-07
tags: [embedded, security, secrets]
doc_type: reference
---
# 펌웨어 키/시크릿 관리

## 키 종류

| 키 | 크기 | 용도 | 사용 디바이스 |
|----|------|------|---------------|
| PreSharedKey (PSK) | 16B (AES-128) | ECDH 키교환, KDF 입력, CMAC | BMU + CMU |
| EdDSA_Seed | 32B | Ed25519 키페어 생성 (블록체인 서명) | BMU만 |

## 현재 구조

```
firmware/common/secrets.h.example  ← git 추적 (템플릿, 0으로 채움)
firmware/common/secrets.h          ← git 무시 (**/secrets.h)

BMU_BMS_S32K344/src/common/secrets.h  ← git 무시, PSK + EdDSA_Seed
CMU_BMS_S32K144/src/common/secrets.h  ← git 무시, PSK만 사용
```

- `.gitignore`에 `**/secrets.h` 등록됨
- `!**/secrets.h.example`로 템플릿만 추적

## 키 사용 흐름

### PSK
```
secrets.h → #include → main.c
  → HSE/CSEc에 AES 키 import
  → 키교환: AES-ECB(PSK, UID||Seed)
  → KDF: SessionKey = CMAC(PSK, Label||UID||Seed||Counter)
  → 이후 SessionKey로 CMAC 계산 (PSK 직접 사용 안 함)
```

### EdDSA_Seed (BMU만)
```
secrets.h → #include → main.c:82-95 randombytes()
  → 첫 crypto_sign_keypair() 호출 시 EdDSA_Seed를 시드로 사용
  → 결정론적 Ed25519 키페어 생성
  → 이후 random 호출은 HSE TRNG 사용
```

## 개발 vs 생산 분리

| 항목 | 개발 | 생산 |
|------|------|------|
| PSK | 고정 테스트 키 (0x10-0x1F) | 하드웨어 RNG 생성 (`openssl rand -hex 16`) |
| EdDSA_Seed | ASCII 문자열 시드 | 하드웨어 RNG 32B |
| 배포 | secrets.h 수동 복사 | 제조 라인에서 JTAG/HSE 프로비저닝 |
| DID 등록 | VON 테스트 원장 | Indy 생산 원장 |

## 키 회전 절차

### PSK 회전
1. 새 PSK 생성
2. BMU + CMU 양쪽 secrets.h 업데이트
3. 양쪽 리플래시 (동시 교체 필수)
4. 재부팅 → 키교환으로 새 세션 키 파생

### EdDSA_Seed 회전
1. 새 시드 생성
2. BMU secrets.h 업데이트 + 리플래시
3. Indy 원장에 새 DID 등록 (또는 기존 DID 키 교체)
4. `config.env`의 `BMU_DID` 업데이트
5. 체인코드 FC 리셋 필요 (ADR-004 참조)

## HSE/CSEc NVM 프로비저닝 로드맵

현재 미구현. 향후 계획:

1. **제조 시**: JTAG으로 HSE NVM 키 슬롯에 PSK 기록
2. **부팅 시**: `HSE_ImportKey(NVM_SLOT)` → RAM 키 슬롯으로 로드
3. **secrets.h 불필요**: 키가 NVM에만 존재, 소스 코드에 포함 안 됨
4. **CSEc (CMU)**: `CSEc_LoadKey(KEY_1)` → RAM 로드

이 방식이 구현되면 secrets.h 파일 자체가 불필요해짐.
