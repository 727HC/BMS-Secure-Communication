---
title: "임베디드 세션 개요"
date: 2026-04-06
tags: [embedded, overview]
doc_type: overview
---
# 임베디드 세션

## 담당 범위
- `embedded/` — BMU/CMU 구현
- `firmware/` — S32K3 펌웨어
- `firmware/tools/` — serial_to_agent.py 등 브릿지 스크립트
- `workspace_hse/` — HSE 샘플 프로젝트 (CQC Demo, FW Install)

## 핵심 기술 스택
- NXP S32K344 (BMU) — Cortex-M7, HSE, CAN-FD
- NXP S32K144 (CMU) — Cortex-M4, CSEc, CAN-FD
- FreeRTOS — 4-태스크 구조 (Rx/Protocol/DataProcess/Monitor)
- HSE — AES-128 CMAC (메시지 인증), NVM 키 카탈로그
- TweetNaCl — Ed25519 서명 (소프트웨어 fallback)
- CAN-FD — BMU↔CMU 보안 통신

## 보안 프로토콜
```
CMU → CAN-FD(AES-128 CMAC) → BMU → CMAC 검증 → Ed25519 서명 → UART 출력
```
- 세션 키: ECDH Key Exchange (부팅 시)
- 메시지 인증: AES-128 CMAC (HSE 하드웨어, 352us)
- 블록체인 서명: Ed25519 (TweetNaCl -O2, ~5s)
- Frame Counter: 재전송 공격 방지

## 빌드 환경
- IDE: S32 Design Studio (S32DS)
- 디버거: PEmicro Multilink
- BMU: standalone 빌드 (RTD 포함)
- CMU: S32DS 프로젝트
- tweetnacl.c만 `-O2`, 나머지 `-O0`

## 하드웨어 설정
- UART: COM4, 28800 baud
- 출력 포맷: `[SIGN] FC=N R=<64hex> S=<64hex> DATA=<96hex>`
- CMU 점퍼: J104/J107 설정 필수 (LPUART1 RX)
- DID seed: `BMUDevice01SecureComm00000000001` (32B 고정)

## 주요 교훈
1. HSE DMA는 SRAM만 접근 가능 — `const` 배열 금지
2. `.zero.table` 비면 BSS 미초기화 → 부팅 실패
3. FreeRTOS vPortSVCHandler — startup과 충돌 시 startup 쪽 주석
4. CMAC 계산은 payload 조립 완료 후 수행
5. TweetNaCl은 -O2로 5배 속도 개선 (25s→5s)
