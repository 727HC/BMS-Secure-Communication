---
title: "embedded/ 폴더 허브"
date: 2026-04-21
tags: [embedded, index, hub]
doc_type: index
status: current
---
# embedded/

BMU/CMU 펌웨어, 보안 프로토콜, 하드웨어 제약의 현재 기준 문서와 기록성 문서를 구분해서 안내하는 허브다.

## 현재 기준 문서
- [[embedded/bms-management-identifier-binding-2026-05-08|BMS management identifier binding handoff]]
- [[embedded/overview|세션 개요]]
- [[embedded/secrets-management|펌웨어 키/시크릿 관리]]
- [[decisions/006-embedded-security-hardening|ADR-006 — 임베디드 보안 강화]]

## 기록성 문서
- [[embedded/activity-log|활동 로그]]

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
- [[blockchain/README|Blockchain 허브]]

## 주의
- 현재 onboarding은 위 **현재 기준 문서**부터 시작한다.
- 활동 로그는 시계열 작업 기록으로만 본다.
