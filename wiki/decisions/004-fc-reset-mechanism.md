---
title: "ADR-004: Frame Counter 리셋 메커니즘"
date: 2026-04-07
tags: [adr, security, embedded, blockchain, fc]
doc_type: adr
status: implemented
---
# ADR-004: Frame Counter 리셋 메커니즘

## 배경

보안 리뷰(W6)에서 장비 재부팅 시 FC가 0으로 리셋되어 체인코드의 단조 증가 제약(`fc > lastFc`)에 걸리는 문제가 확인됨.

## FC 라이프사이클 현황

### CMU (송신)
- 부팅 시 `g_freshness_counter = 0`
- 키 교환 완료 후 `g_freshness_counter = 0` (리셋)
- 매 프레임 pre-increment (`g_freshness_counter++`) → 첫 전송 FC=1
- Resync 시 `g_freshness_counter = 0`

### BMU (수신/검증)
- 키 교환 완료 후 `g_expected_fc = 1`
- 첫 프레임 자동 동기화: `g_expected_fc <= 1 && rx_fc > 0` → sync
- Window 검증: `rx_fc ∈ [expected, expected + 100)`
- CMAC 성공 시 `g_expected_fc = rx_fc + 1`
- Resync 시 `g_expected_fc = 0`

### 체인코드 (원장)
- DID별 `lastFc` 상태 키로 단조 증가만 허용
- `fcVal <= lastFcVal` → 거부
- Invalidation 시 lastFc 재계산 (가장 높은 VALID 레코드로)
- **리셋 API 없음**

## 문제 시나리오

### 시나리오 A: 정상 재부팅 (같은 DID)
```
1. BMU 운영 중 FC=500까지 전송 완료
2. 체인코드 lastFc["BMU_001"] = 500
3. 전원 OFF → ON
4. CMU/BMU 키 교환 → FC=1부터 시작
5. 체인코드: fc=1 <= lastFc=500 → 거부
→ 결과: 모든 데이터 거부, 교착 상태
```

### 시나리오 B: 플래시 초기화 후 재부팅
```
시나리오 A와 동일. FC는 RAM 변수이므로 플래시 초기화 무관.
```

### 시나리오 C: 장비 교체 (새 DID)
```
1. 새 장비에 새 DID seed 프로비저닝
2. 체인코드에 해당 DID의 lastFc 없음
3. FC=1부터 정상 기록
→ 결과: 문제 없음 (새 DID이므로)
```

### 시나리오 D: FC uint32 오버플로
```
1. FC가 4,294,967,295에 도달 (5초 간격 → ~680년)
2. CMU: uint32 wrap → FC=0
3. BMU: (0 - 4294967295) = 1 (unsigned underflow) < 100 → window 통과
4. 체인코드: uint64이므로 오버플로 없음
→ 결과: 실무상 불가능, 무시 가능
```

## 해결 옵션

### 옵션 A: 체인코드 ResetFCForDID (채택/구현 완료)
- 체인코드에 `ResetFCForDID(did string, reason string)` 함수 추가
- ManufacturerMSP + RegulatorMSP만 허용
- `reason` 최소 10자, DID/passport 존재 및 일치 확인
- passport binding은 유지하고 DID별 FC high-water만 clear (`hasFc=false`)
- 감사 로그/이벤트: `FCRESET-{did}-{txid}` 기록 (DID, reason, invoker MSP, timestamp, previous FC)
- **장점**: 펌웨어 수정 불필요, 운영 유연성
- **단점**: 리셋 남용 시 재전송 공격 window 열림
- **완화**: 자동 호출 금지, 운영자 명시 호출, reason/audit 강제, 호출 직후 live ingest 검증

### 옵션 B: BMU FC를 HSE NVM에 저장
- 매 N번째 FC를 HSE NVM에 저장 (예: 100번마다)
- 재부팅 시 NVM에서 복원 → `g_freshness_counter = saved_fc`
- **장점**: 체인코드 수정 불필요
- **단점**: NVM write 수명 제한 (~10만회), 구현 복잡도 높음
- **단점**: 마지막 저장 이후~재부팅 사이 FC gap 발생 가능

### 옵션 C: 재부팅 시 새 DID 발급
- 비현실적: DID는 Indy 원장에 등록된 고정 식별자
- 매 재부팅마다 새 DID 발급은 운영 불가능

## 결정

**옵션 A (ResetFCForDID) 채택**

이유:
1. 펌웨어 변경 없이 체인코드만 수정
2. 임베디드 측은 현재 동작 유지
3. 운영자 peer invoke 또는 Passport 운영 UI로 즉시 회복 가능
4. 감사 추적으로 남용 방지
5. 실측에서 BMU reboot 후 50분 catch-up 대기 없이 현재 FC부터 즉시 기록 재개 확인

## 구현 결과 (2026-05-19)

- 배포: `passport-contract` v1.2 / sequence 3
- 함수: `ResetFCForDID(ctx, did, reason)`
- Auth: `ManufacturerMSP`, `RegulatorMSP`
- 동작: canonical `lastFc-{did}` binding은 보존하고 `fc=0`, `hasFc=false`로 high-water만 reset
- 감사: `FCRESET-{did}-{txid}` state log 저장 + Fabric event emit
- 운영 검증:
  - 신 DID `HgBpAxtHJ4qRwsNiroaqvC`, passport `MATLAB-BMU-002`
  - BMU reboot 후 `lastFc=18846`, BMU FC가 1부터 재시작해 reject 발생
  - `ResetFCForDID` invoke `status:200`
  - bridge를 `--min-fc` 없이 재기동하자 FC `8610+`부터 즉시 chain 기록 재개
  - 단조성 위반 0건, passport binding `MATLAB-BMU-002` + `0x2c9a0e0c` 유지 확인

## 운영 절차

1. BMU reboot/FC rollback alert 확인
2. 운영자가 DID와 passport binding을 확인
3. `ResetFCForDID(did, reason)` 수동 호출
4. `CheckBMUHotBinding(passportId, did)`로 `hasFc=false`, binding canonical 확인
5. bridge를 `--min-fc` 없이 재기동
6. 현재 BMU FC부터 `BMU recorded OK`가 재개되는지 확인

참고 runbook: `wiki/blockchain/reset-fc-runbook.md`

## 구현 분담

| 항목 | 담당 | 내용 |
|------|------|------|
| `ResetFCForDID` 체인코드 함수 | 블록체인 세션 | 완료 — Manufacturer/Regulator RBAC, reason 검증, 감사 로그/event, binding 보존 |
| 수동 peer invoke runbook | 블록체인 세션 | 완료 — `wiki/blockchain/reset-fc-runbook.md`, `scripts/invoke-reset-fc-for-did.sh` |
| Passport reset endpoint/UI | 여권 세션 | 후속 — 운영자 명시 호출만 허용, 자동 호출 금지 |
| reboot/FC rollback alert | 임베디드 세션 | 후속 — `serial_to_agent.py` 단발 alert, auto-call 금지 |
| FC 시나리오 문서 | 임베디드/블록체인 | 완료 — 본 ADR 구현 결과 포함 |
| 재부팅 테스트 | 임베디드 세션 | 완료 — BMU reboot → reset → FC `8610+` live 기록 재개 |
| 임시 catch-up 가드 (`--min-fc`) | 임베디드 세션 | 적용 이력 있음 — W6 구현 전 임시 조치. ResetFCForDID 검증 후 일반 운영 경로에서는 제거 |

---

## Update 2026-05-19 — 실측 시나리오 A 발생 + 임시 대응

### 사건

CANoe rogue replay(`fc=74483`) 격리 + DID 회전 후 새 DID `HgBpAxtHJ4qRwsNiroaqvC`로 정상 ingest 진행 중, **BMU 보드 재부팅으로 FC가 1로 리셋**됨 (시나리오 A 정확히 일치). chaincode `lastFc=18846` 상태에서 bridge가 fresh-counter SIGN을 그대로 POST했고 Passport `[BMU-INGEST]` 구조화 로그로 DID/4xx reject를 식별했다.

### 임시 대응

`serial_to_agent.py --min-fc <N>` 가드를 임시 적용했다.

- `fc < min-fc` SIGN 라인은 silent drop
- BMU FC가 N 이상으로 catch-up하면 자동으로 정상 ingest 재개
- 단점: catch-up 기간 동안 데이터가 체인에 기록되지 않음

이 가드는 W6 구현 전 운영 중단을 줄이기 위한 임시 수단이다. ResetFCForDID 검증 이후에는 운영자가 reset을 수행하고 bridge를 `--min-fc` 없이 재기동하는 절차가 표준이다.

### 옵션 A vs 옵션 B 재검토

| 측면 | 옵션 A (체인코드 Reset) | 옵션 B (HSE NVM 저장) | 임시 가드 (`--min-fc`) |
|---|---|---|---|
| 펌웨어 수정 | 불필요 | 필요 (HSE NVM write API) | 불필요 |
| 체인코드 수정 | 필요 | 불필요 | 불필요 |
| 호스트 도구 수정 | 불필요 | 불필요 | 필요 |
| BMU 재부팅 후 데이터 손실 | 없음 (즉시 재개) | NVM 마지막 저장~재부팅 사이 gap | catch-up 기간 동안 drop |
| 운영 절차 | 운영자 수동 reset + 감사 | 자동 (NVM 복원) | 운영자가 `--min-fc` 수동 갱신 |
| NVM 수명 영향 | 없음 | 매 N번째 write (~10만회 한계) | 없음 |
| 보안 (재전송 공격) | reset 남용 시 window 열림 | 자연스러움 | drop은 안전, ingest 지연 발생 |

**옵션 A 유지**. 옵션 B는 NVM 수명 + 구현 복잡도 비용이 옵션 A 대비 크다. 단, 옵션 A는 자동 호출 금지와 감사 로그가 필수다.

### 임베디드 세션의 옵션 B 검토 (별도 트랙)

옵션 B (HSE NVM에 FC 저장/복원)는 옵션 A 부재 시 fallback으로만 유지한다.

- HSE Key Catalog의 NVM 영역에 user-managed 키로 FC 8 byte 저장 가능 여부
- 저장 주기 100 frame vs 1000 frame trade-off (NVM 수명 vs gap window)
- 부팅 시 NVM 읽기 + `g_freshness_counter` 초기화 코드 위치 (`main.c` BMU 측)
- 실제 구현은 옵션 A 무산 또는 운영상 reset 절차가 부적합하다고 판단될 때만 진행

## 금지/주의

- Agent/bridge가 자동으로 `ResetFCForDID`를 호출하면 안 된다.
- CANoe/fixture replay가 남아 있는 DID에는 reset을 남발하지 않는다.
- `reason`에는 운영 맥락을 남기되 secret/token/path를 넣지 않는다.
- old DID cleanup은 source 격리 여부를 확인한 뒤 별도 운영 판단으로 진행한다.
