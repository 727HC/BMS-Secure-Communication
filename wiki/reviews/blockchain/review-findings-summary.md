---
title: "코드 리뷰 사실/거짓 판별 결과"
date: 2026-04-13
updated: 2026-04-13
tags: [review, verification, security]
doc_type: review
status: historical
---
# 코드 리뷰 사실/거짓 판별 결과

> 과거 기준 기록
>
> 이 문서는 특정 시점의 코드 리뷰 판정 결과를 요약한 기록이다. 현재 구조/정책 설명의 1차 source로 쓰지 않는다.


5회 코드 리뷰에서 총 60건+ 지적. 블록체인 세션에서 사실 여부 검증.

## 1차 — 디자인 리뷰 (MyDesignerBot, 13건)

| 판정 | 건수 | 대표 |
|------|------|------|
| 거짓 | 4 | materials 페이지 sync 이미 구현, pageSize 변수 참조 중, isEV/isEv Vue 컨벤션 정상, empty state CTA 이미 있음 |
| 부분 사실 | 4 | dashboard 정보 중복, 차트 summary 약함, 상태 시그널 평준화, trust section 중복 |
| 주관적 | 5 | 레이아웃, 폼 폭, 역할 분리 등 |

**핵심**: 리뷰어가 수정 전 코드를 본 것으로 추정.

## 2차 — 보안 리뷰 (MyCoderBot, 13건)

| 판정 | 건수 | 대표 |
|------|------|------|
| 사실 | 5 | DID↔passport 미강제, BindToVehicle 재바인딩, CorrectPassportData 승인없음, FC monotonic 있음, MSP 권한 있음 |
| 부분 사실 | 4 | BMU 무인증(Ed25519 있음), DID lookup timeout 없음, JWT fallback(production 체크 있음), Service 접근 철회 |
| 거짓/과장 | 2 | passportId 빈값 처리(체인코드가 거부), BMU 서명 미검증(MSP 인증 필요) |
| 판정 불가 | 2 | 임베디드 FC 롤오버, ISR 패턴 |

## 3차 — 보안 리뷰 (MyReviewerBot #1, 8건)

| 판정 | 건수 | 대표 |
|------|------|------|
| 사실 | 7 | DID lookup privileged 우회, VC history 무인증, GetCredentialHistory RBAC 없음, JWT fallback, CMU FlexNVM, AES-ECB |
| 부분 사실 | 1 | CMU FlexNVM(조건 분기 있음, 리뷰어 누락) |

**정확도 높음**. critical 2건은 실질 동일 이슈.

## 4차 — 보안 리뷰 (MyReviewerBot #2, 8건)

| 판정 | 건수 | 대표 |
|------|------|------|
| 거짓 | 2 | wallet 유출(gitignored, 저장소에 없음) |
| 사실+과장 | 2 | JWT/Fabric secret fallback(production에서 서버 시작 거부) |
| 사실 | 4 | register RBAC 체인, BMU snapshot 재계산 필드 누락, fabric.service CA admin 대행 |

**핵심**: wallet 유출 거짓 — 리뷰어가 working directory를 저장소와 혼동.

## 5차 — 내부 code-reviewer 에이전트 (18건)

| 판정 | 건수 | 대표 |
|------|------|------|
| critical | 3 | CouchDB JSON injection, VerifyCredentialStatus JSON injection, VC 3개 엔드포인트 무인증 |
| warning | 7 | BMU admin 실행, FC reset ID 충돌, 상태 전이 가드 부재 4건, rateBuckets 메모리 누수 |
| suggestion | 8 | SOC dataHash 불일치, DID verkey 무인증, 중복 if문, 캐시 미제한, 로거 불일치 등 |

**가장 정확하고 새로운 발견 많음**. CouchDB injection은 다른 리뷰어 모두 놓침.

## 교훈

1. 외부 리뷰어는 수정 전 코드를 보는 경우가 잦음 — 리뷰 전 최신 동기화 필수
2. wallet/secret "유출" 지적은 .gitignore 확인으로 즉시 판별 가능
3. CouchDB injection 같은 구조적 취약점은 패턴 리뷰에서만 발견됨 — 단건 검토로는 못 잡음
4. 상태 전이 가드 부재는 비즈니스 로직 이해 필요 — 보안 리뷰보다 도메인 리뷰에서 더 잘 잡힘
