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
