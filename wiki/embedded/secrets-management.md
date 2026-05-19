---
title: "펌웨어 키/시크릿 관리"
date: 2026-04-07
updated: 2026-05-19
tags: [embedded, security, secrets]
doc_type: reference
status: current
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

## 위협 모델 (Threat Model)

### 보호 대상
- **PSK**: KDF 입력으로 모든 세션 키를 파생하는 마스터 시크릿. 유출 시 모든 CAN-FD 통신 복호화 + 위조 가능
- **EdDSA_Seed**: BMU 블록체인 서명 키의 시드. 유출 시 임의의 가짜 BMU 데이터를 chain에 기록 가능

### 가정 (Adversary capabilities)
| 공격 | 방어 수단 | 잔존 위험 |
|---|---|---|
| 펌웨어 binary 추출 (`secrets.h` 컴파일된 부분) | 현재 미방어 — secrets.h가 .rodata에 그대로 박힘 | 보드 물리 접근 시 PSK + Seed 추출 가능. HSE NVM 프로비저닝 시 해결 |
| 빌드 시스템 침투 | `.gitignore`로 git 노출 차단 + `**/.env` ignore | 빌드 머신 자체 침해 시 secrets.h 노출. HSE NVM으로 이전 시 해결 |
| 네트워크 도청 (CAN-FD bus) | AES-CBC + CMAC + FC anti-replay | 키 자체 노출 안 됨, 세션 키만 도청 가능 (KDF로 분리) |
| Replay attack | FC 단조성 (BMU 측 window + chaincode lastFc) | ADR-004 참조 |
| 디버거 attach (JTAG) | 생산 단계에서 JTAG 영구 disable 필요 | 미적용. 개발 단계라 OK, production 진입 시 강제 |
| supply chain | 제조사가 신뢰 가능 가정 | secure boot + HSM 기반 attestation은 향후 검토 |

### 명시적 NON-goals (현재 단계)
- 보드 물리 분해 + 디캡(decap) 공격 — 학술 데모 단계라 제외
- side-channel (전력 분석, EM 분석) — 동일
- HSE 자체의 보안 부트 + 키 attestation — Vector 제조사 신뢰

## 운영 체크리스트

### 새 키 발급 시 (개발자 작업)
- [ ] `openssl rand -hex 16` (PSK 16B) 또는 `openssl rand -hex 32` (Seed 32B)
- [ ] `firmware/common/secrets.h.example` 복사 → `firmware/common/secrets.h`
- [ ] 값 채우기 (배열 형태, 0xXX 16진수)
- [ ] BMU/CMU 양쪽 src/common/에도 복사 (또는 빌드 시스템이 자동 카피)
- [ ] `git status`에 `secrets.h` 안 보이는지 확인 (gitignore 작동)
- [ ] 빌드 + 플래시 후 키 교환 로그 정상 확인 (`[Task] Key exchange OK -> OPERATIONAL`)
- [ ] EdDSA_Seed 변경했으면 Indy 원장에 새 DID 등록 + `config.env` `BMU_DID` 업데이트

### 코드 리뷰 시
- [ ] `git diff`에 secrets.h 변경분 없음 (있으면 fatal — 추적 차단 우회 의심)
- [ ] 새 키가 평문으로 README/주석/로그에 들어가지 않음
- [ ] 키 회전 절차가 변경된 경우 이 문서 동기화

### 인수인계 시
- [ ] secrets.h 별도 안전 채널 전달 (이메일/Slack 절대 금지, password manager 또는 1Password vault 권장)
- [ ] 새 머신 setup 시 `scripts/setup-dev-env.bat` 실행 후 secrets.h 수동 배포
- [ ] BMU_DID는 config.env에 평문 OK (DID는 공개 식별자, secret 아님)

## 현재 상태 vs 목표

| 항목 | 현재 (2026-05-19) | 목표 (production) |
|---|---|---|
| PSK 저장 | `secrets.h` 컴파일 시 .rodata 박힘 | HSE NVM 키 슬롯 (RAM 로드만) |
| EdDSA_Seed 저장 | `secrets.h` 컴파일 시 .rodata 박힘 | HSE NVM 키 슬롯 |
| 키 회전 | 양쪽 보드 재플래시 | NVM 슬롯 재기록 (재플래시 없이) |
| DID seed 파생 | 결정론적 시드 → keypair | HSE 내부 Ed25519 키 생성 (export 불가) |
| 빌드 머신 침해 대응 | 키 노출 (`.h` 파일 + 빌드 산출물) | 키 불필요 (NVM 측에만 존재) |

향후 마이그레이션은 [ADR-006 임베디드 보안 강화](../decisions/006-embedded-security-hardening.md)에서 다룬다.

## 관련 문서

- `firmware/common/secrets.h.example` — 인라인 사용 가이드 (개발자 1차 참조)
- [ADR-004 FC reset mechanism](../decisions/004-fc-reset-mechanism.md) — EdDSA_Seed 회전 시 chain FC 처리
- [ADR-005 build paths](../decisions/005-build-paths.md) — secrets.h가 의존하는 빌드 경로 정책
- [ADR-006 임베디드 보안 강화](../decisions/006-embedded-security-hardening.md)
- `firmware/README.md` "운영 보안 권고" 섹션

## 잠재 사고 사례 (학습용)

- **CA root 재생성 시 SDK 지갑 캐시 stale**: secrets와 직접 관련은 없지만 동일한 "비밀 자산 stale" 패턴. `ops_fabric_ca_regen_sop` 메모리 참조
- **CANoe configuration이 정상 endpoint 점유**: secrets와 무관하나 "stateful invisible asset" 위험. ADR-006 참조
- **빌드 머신의 secrets.h 잔존**: 옛 PSK secrets.h가 백업/구버전에 남아있는 위험. 회전 시 옛 secrets.h는 안전하게 폐기 (shred 또는 secure delete)
