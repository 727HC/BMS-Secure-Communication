---
title: ADR-006 — CANoe HTTP Binding rogue POSTer 격리 + 운영 규칙
status: Accepted
date: 2026-05-19
related: ADR-005 embedded hardening, ADR-004 (TBD) FC reset mechanism
tags: [adr, canoe, bmu, operations]
doc_type: adr
---

# 006. CANoe Configuration이 BMU 데이터 POST endpoint를 점유한 사건 정리

## Context

`canoe/BMS_Test.cfg` (Vector CANoe 19 configuration)에 `CANoe::Connectivity::HTTP` Binding이 활성화되어 있어, measurement Start 시 자동으로 하드코딩된 fixture(`fc=74483`, `rawHead=C02D73C032EB15...`, `sigLen=100` 비표준)를 약 35초마다 `http://localhost:3001/api/bmu/data`로 POST했음. 같은 endpoint를 bmu-agent가 사용하므로 임베디드 bridge와 충돌:

- bmu-agent 입장: 정상 source(임베디드 bridge)와 rogue 둘 다 `python-requests/2.31.0` UA + `::1` IP로 들어와 분간 불가
- chaincode 입장: 같은 DID `4d5CE8NZbkAVJxcypzaVhw`에 fc=74483~75449까지 rogue가 올린 lastFc가 단조성 제약을 흔들어 임베디드 측 정상 fc 1~17961 POST가 전부 reject
- audit.log: 양쪽 stream이 섞인 채 status code만 기록되어 source 분리 불가능
- 결과적으로 lastFc 오염 발생 → DID 회전 (4d5CE8 → HgBpAxtHJ4qRwsNiroaqvC)로 격리만 가능했음

## 발견 경로

1. **2026-05-19 13:xx KST** — 임베디드 측 SIM_FALLBACK 제거 + 파서 강화 작업 도중 bridge POST가 lastFc=74471로 막힘
2. **Passport 세션**이 `/tmp/bmu-agent-debug2.log`에 source-추적 미들웨어 추가 (`[BMU-INGEST]` ip/rp/ua/fc/bind/sigLen/rawHead 로깅)
3. **임베디드 측 추적**: Windows TCP 모니터(`Get-NetTCPConnection -RemotePort 3001`)로 outbound 잡으니 `CANoe64.exe (PID 49128)`이 ::1:3001로 연결 중인 것 확인. WSL 측에서는 `wsl-relay`가 uid=0으로 마스킹해서 안 보였음
4. **사용자 측 조치**: CANoe GUI에서 measurement Stop → fc=74483 replay 즉시 중단

## Root cause

CANoe Connectivity HTTP Binding은 `.cfg` 바이너리 내부에 endpoint URL + fixture payload + 주기를 저장하며, 별도 외부 텍스트 파일 없음. 이전 데모/테스트 셋업에서 만든 configuration이고, 그 뒤 비활성화되지 않은 채 남아 있었음.

## Decision (단기)

1. `canoe/BMS_Test.cfg` → `canoe/BMS_Test.cfg.disabled-20260519`로 이름 변경하여 CANoe 자동 로드 차단
2. 원본 cfg 전체를 `_backup/canoe-with-http-rogue-20260519/`에 백업 (panel/CAPL 재활용 가능)
3. `scripts/preflight-check.sh` 추가 — E2E 시작 전 CANoe64 실행 여부 + bmu-agent 단일 listener 자동 검증

## Decision (장기 옵션)

향후 CAN 실시간 모니터링 / 공격 시뮬레이션 도구가 다시 필요할 때:

| 옵션 | 설명 | 권장 시점 |
|---|---|---|
| A. 새 cfg를 처음부터 만들기 | CANoe File > New Configuration, Panel/CAPL만 import, HTTP Binding 절대 추가 안 함 | 다음 데모 준비 시 |
| B. 백업 cfg를 GUI로 정리 | `_backup/.../BMS_Test.cfg` 열기 → Configuration > Connectivity > HTTP block 제거 → 새 이름으로 저장 | 시간 여유 있을 때 |
| C. 별도 vTEST.studio 프로젝트로 분리 | CAN 분석은 CANoe, BMU 시뮬레이션은 별 도구로 isolation | 운영 단계 진입 시 |

## 운영 규칙 (Operating Rules)

1. **CANoe Start 전 preflight 필수**: `bash scripts/preflight-check.sh`로 외부 POSTer 부재 확인
2. **bmu-agent에 source-추적 미들웨어 유지** (passport 세션 책임): `/tmp/bmu-agent-debug2.log`의 `[BMU-INGEST]` 패턴이 사라지면 디버그 능력도 사라짐
3. **rogue 의심 시 first probe**: `Get-NetTCPConnection -RemotePort 3001 -State Established`로 Windows 측 outbound 추적. 또는 `wsl ss -tn` (단 wsl-relay가 uid 마스킹)
4. **임베디드 bridge는 항상 `--did <당시 DID>` 명시**: DID 회전 후 `config.env`의 `BMU_DID` 업데이트 누락 시 잘못된 DID로 catch-up 시도 발생

## 검증

- `canoe/BMS_Test.cfg` 미존재 → 다음 CANoe Start 시 빈 워크스페이스
- `_backup/canoe-with-http-rogue-20260519/BMS_Test.cfg` 존재 (복원 가능)
- `bash scripts/preflight-check.sh` 실행 시 CANoe64 running하면 ⚠ 경고 출력
- 임베디드 bridge 신 DID `HgBpAxtHJ4qRwsNiroaqvC` POST 성공 (BMU recorded OK)

## Lessons (lessons_embedded.md에 반영)

- **부수 자산(CANoe configuration, MATLAB Simulink 셋업 등)은 stateful + invisible** — 부수 도구가 정상 endpoint를 점유할 수 있고, observability 없으면 영원히 묻힘
- **observability가 토대보다 먼저**: 토대(보안 통신 + chaincode)가 멀쩡해도 source 추적 없으면 운영 불능
- **cold-start 시나리오**가 happy-path보다 더 많은 버그 드러냄 (MATLAB silent → CMU SIM_FALLBACK 발견 사례)
