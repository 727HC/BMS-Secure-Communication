---
title: "embedded/ 폴더 허브"
date: 2026-04-18
tags: [embedded, index, hub]
doc_type: index
---
# embedded/

BMU/CMU 펌웨어, 보안 프로토콜, 하드웨어 제약을 설명하는 허브다.

## 핵심 진입점
- [[embedded/overview|세션 개요]]
- [[embedded/secrets-management|펌웨어 키/시크릿 관리]]
- [[embedded/activity-log|활동 로그]]

## 운영 기록
- [[embedded/activity-log|활동 로그]]
- [[decisions/006-embedded-security-hardening|ADR-006 — 임베디드 보안 강화]]

## 이 폴더에 두는 것
- BMU/CMU 펌웨어 보안 제약
- 키 / 시크릿 / 부트스트랩 운영 메모
- MCU / HSE / 주변장치 수준의 구현 맥락

## 핵심 주제
- AES-128 CMAC 기반 BMU↔CMU 인증
- HSE/CSEc 활용 제약
- UART/서명 브릿지 운영

## 함께 보는 문서
- [[common/architecture|시스템 아키텍처]]
- [[common/terminology|용어 사전]]
- [[decisions/006-embedded-security-hardening|ADR-006]]
- [[blockchain/README|Blockchain 허브]]
