---
title: "임베디드 세션 개요"
date: 2026-04-21
tags: [embedded, overview]
doc_type: overview
status: current
---
# 임베디드 세션

> 현재 기준 문서
>
> 이 문서는 Embedded 세션의 현재 책임 범위와 핵심 구현 축을 설명한다.

## 담당 범위
- `embedded/` — BMU/CMU 구현
- `firmware/` — S32K3 펌웨어
- `firmware/tools/` — serial_to_agent.py 등 브릿지 스크립트
- `workspace_hse/` — HSE 샘플 프로젝트

## 핵심 기술 스택
- NXP S32K344 (BMU)
- NXP S32K144 (CMU)
- FreeRTOS
- HSE / CSEc
- TweetNaCl (Ed25519 fallback)
- CAN-FD

## 현재 기준 요약
- BMU↔CMU 보안 통신은 AES-128 CMAC + Frame Counter 기반으로 운영한다.
- 블록체인 연계 서명 경로는 BMU 출력 → 브리지 → Agent → 원장 기록 흐름을 따른다.
- 임베디드 이슈는 하드웨어 제약, 메모리 배치, HSE/CSEc 사용 한계가 핵심이다.

## 보안 프로토콜
```text
CMU → CAN-FD(AES-128 CMAC) → BMU → CMAC 검증 → Ed25519 서명 → UART 출력
```
- 세션 키: ECDH Key Exchange
- 메시지 인증: AES-128 CMAC
- 블록체인 서명: Ed25519
- Frame Counter: 재전송 공격 방지

## 빌드 / 운영 메모
- IDE: S32 Design Studio
- 디버거: PEmicro Multilink
- BMU: standalone 빌드
- CMU: S32DS 프로젝트
- 성능 병목이 큰 crypto 루틴은 별도 최적화가 필요할 수 있다.

## 현재 기준 참고 문서
- [[embedded/secrets-management|펌웨어 키/시크릿 관리]]
- [[common/architecture|시스템 아키텍처]]
- [[decisions/006-embedded-security-hardening|ADR-006]]

## 기록성 문서
