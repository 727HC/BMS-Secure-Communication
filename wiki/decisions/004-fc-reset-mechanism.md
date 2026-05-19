---
title: "ADR-004: Frame Counter 리셋 메커니즘"
date: 2026-04-07
tags: [adr, security, embedded, blockchain, fc]
doc_type: adr
status: accepted
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

### 옵션 A: 체인코드 ResetFCForDID (권장)
- 체인코드에 `ResetFCForDID(did string)` 함수 추가
- ManufacturerMSP 전용 (BMU 운영 주체)
- `lastFc` 키 삭제 → 다음 FC는 아무 값이나 수용
- 감사 로그: `FCResetEvent` 기록 (누가, 언제, 어떤 DID)
- **장점**: 펌웨어 수정 불필요, 운영 유연성
- **단점**: 리셋 남용 시 재전송 공격 window 열림
- **완화**: 리셋 후 일정 시간 이내 새 데이터 수신 검증

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

**옵션 A (ResetFCForDID) 권장**

이유:
1. 펌웨어 변경 없이 체인코드만 수정
2. 임베디드 측은 현재 동작 유지
3. 운영 시 Agent가 BMU 재부팅 감지 → 자동 ResetFCForDID 호출 가능
4. 감사 추적으로 남용 방지

## 구현 분담

| 항목 | 담당 | 내용 |
|------|------|------|
| `ResetFCForDID` 체인코드 함수 | 블록체인 세션 | ManufacturerMSP, 감사 로그, lastFc 삭제 |
| Agent 자동 리셋 호출 | 여권 세션 | BMU 재부팅 감지 시 ResetFCForDID 호출 |
| FC 시나리오 문서 | 임베디드 세션 | 이 문서 (완료) |
| 재부팅 테스트 | 임베디드 세션 | BMU 재부팅 → FC 충돌 재현 → 리셋 후 정상 확인 |
| **임시 catch-up 가드 (bridge)** | **임베디드 세션** | **`serial_to_agent.py --min-fc <N>` — fc < N 인 SIGN 라인 silent drop. 2026-05-19 추가** |

---

## Update 2026-05-19 — 실측 시나리오 A 발생 + 임시 대응

### 사건

CANoe rogue replay(`fc=74483`) 격리 + DID 회전 후 새 DID `HgBpAxtHJ4qRwsNiroaqvC`로 정상 ingest 진행 중, **BMU 보드 재부팅으로 FC가 1로 리셋**됨 (시나리오 A 정확히 일치). chaincode `lastFc=18846` 상태에서 bridge가 fresh-counter SIGN(fc=1, 240, 253, ..., 590)을 그대로 POST → 38건 reject.

passport 세션의 `[BMU-INGEST]` 미들웨어 + `did=HgBp + 4xx 38건` 통계로 신속 식별.

### 임시 대응 (현재 적용)

`serial_to_agent.py`에 `--min-fc <N>` 옵션 추가 (commit `a2691e9`):
- `args.min_fc > 0 and fc < args.min_fc` 인 SIGN 라인은 silent drop
- 50건 단위 진척 로그 (`[SKIP] FC=... < min-fc 18847`)
- BMU FC가 N 이상으로 catch-up하면 자동으로 정상 ingest 재개

운영 예:
```bash
python serial_to_agent.py ... --did HgBpAxtHJ4qRwsNiroaqvC --min-fc 18847
```

### 옵션 A vs 옵션 B 재검토 (실측 후)

| 측면 | 옵션 A (체인코드 Reset) | 옵션 B (HSE NVM 저장) | 임시 가드 (--min-fc) |
|---|---|---|---|
| 펌웨어 수정 | 불필요 | 필요 (HSE NVM write API) | 불필요 |
| 체인코드 수정 | 필요 | 불필요 | 불필요 |
| 호스트 도구 수정 | 불필요 | 불필요 | 필요 (적용 완료) |
| BMU 재부팅 후 데이터 손실 | 없음 (즉시 catch-up) | NVM 마지막 저장~재부팅 사이 gap | catch-up 기간 동안 drop |
| 운영 절차 | Agent가 자동 reset | 자동 (NVM 복원) | 사람이 `--min-fc` 수동 갱신 |
| NVM 수명 영향 | 없음 | 매 N번째 write (~10만회 한계) | 없음 |
| 보안 (재전송 공격) | reset 남용 시 window 열림 | 자연스러움 | drop은 안전, agent 측은 무관 |

**여전히 옵션 A 권장**. 옵션 B는 NVM 수명 + 구현 복잡도 비용이 옵션 A 대비 큼. 단, 옵션 A는 블체 세션의 chaincode 작업 필요.

### 임베디드 세션의 옵션 B 검토 (별도 트랙)

옵션 B (HSE NVM에 FC 저장/복원)는 옵션 A 부재 시의 fallback. 다음 검토 항목:
- HSE Key Catalog의 NVM 영역에 user-managed 키로 FC 8 byte 저장 가능 여부
- 저장 주기 100 frame vs 1000 frame trade-off (NVM 수명 vs gap window)
- 부팅 시 NVM 읽기 + `g_freshness_counter` 초기화 코드 위치 (`main.c` BMU 측)
- 실제 구현은 옵션 A 무산 시에만 진행

### 미해결 / 후속

- `ResetFCForDID` 체인코드 함수 (블체 세션) — 우선순위 상향 합의 완료 2026-05-19
- Agent 측 BMU 재부팅 감지 + 자동 호출 로직 (passport 세션)
- `--min-fc` 가드는 W6 영구 해결 전까지 유지. 매 DID 회전 / 재부팅 시점에 운영자가 `--min-fc` 값 갱신 필요
