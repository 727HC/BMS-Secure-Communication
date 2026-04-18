---
title: "배터리 여권 백엔드 요청사항"
date: 2026-04-13
tags: [passport, backend, handoff]
doc_type: handoff
---
# 배터리 여권 백엔드 요청사항

## 목적

현재 `webapp/frontend-react` 쪽 배터리 여권 UI는 1~3년차 요구를 기준으로 화면 슬롯과 일부 워크플로우를 먼저 반영했다.
하지만 실제 데이터와 API가 부족해서 여러 항목이 `정보 없음`, `증빙 없음`, `미검증`으로 보이거나, 일부 기능은 UI만 있고 실제 업무 흐름은 닫히지 않은 상태다.

이 문서는 백엔드가 채워줘야 할 **필드 / API / 상태 흐름**을 정리한 handoff다.

---

## 프론트에서 이미 반영된 항목

### 1년차 UI 반영 완료
- `IdentityTab`
  - 중량(`weight`)
  - EV 정보
    - `vin`
    - `evManufacturer`
    - `evAssemblyCountry`
    - `installDate`
  - 추가 제원 / 환경 정보
    - `manufacturingProcess`
    - `disposalMethod`
    - `carbonFootprint`
    - `recycledElementContent`
    - `extensionInfo`

### 2년차 UI 반영 완료
- `TrustTab`
  - VC 발급 이력 리스트
  - VC 검증 버튼
  - VC 폐기 버튼
- `VcVerifyModal`
- `VcRevokeModal`

### 3년차 UI 반영 완료
- `TraceabilityTab`
  - 물리적 이력 검증(BMU) 섹션
  - BMU 수집 건수 / 최근 수집일 / SOC 일치 여부 / 누적 방전 사이클
- `ComplianceTab`
  - 규제 증빙(VC) 검증 상태 섹션
  - 전체 VC 건수 / ACTIVE VC 건수 / 규제 요건 충족 여부 / 최근 증빙 발급일

---

## 백엔드가 채워줘야 할 필드

현재 UI에서 바로 사용하는 필드들이다. 여권 상세 API(`/api/passports/:id`) 응답에 포함되면 된다.

### 1년차 메타 필드
- `manufacturingProcess: string`
- `disposalMethod: string`
- `carbonFootprint: string | number`
- `recycledElementContent: string | object`
- `extensionInfo: string | object`
- `installDate: string`

### 권장 형식
- 날짜: ISO 8601
- 수치: 가능하면 number 유지
- 구조화 가능한 항목은 string보다 object 권장

예:

```json
{
  "manufacturingProcess": "전극 조립 > 활성화 > 최종 검사",
  "disposalMethod": "지정 회수 후 습식 재활용 공정",
  "carbonFootprint": 72.4,
  "recycledElementContent": {
    "cobalt": 12.1,
    "lithium": 18.4,
    "nickel": 9.7,
    "lead": 0
  },
  "extensionInfo": {
    "factorySite": "Busan Plant 2",
    "line": "LFP-03"
  }
}
```

---

## 백엔드가 보강해야 할 API

### 1. VC lifecycle 세부 흐름

현재 프론트는 아래 API를 사용 중이거나 기대한다.

- `GET /api/vc/passport/:passportId`
- `GET /api/vc/verify/:credentialId`
- `POST /api/vc/revoke`

여기서 추가로 부족한 건 아래다.

#### 필요 API
- **VC 검증 이력 조회**
  - `GET /api/vc/verify-log/:credentialId` 또는 유사 경로
- **검증자별 검증 이력 조회**
  - `GET /api/vc/verifier/:verifierDid/history` 또는 유사 경로
- **Credential 제출 / 다운로드**
  - 제출 상태 기록 API
  - 다운로드용 payload/API
- **발급 요청 / 승인 분리 흐름**
  - 현재는 issue 중심이라 request/approve 단계가 약함

### 2. 규제 검증 상태 API

현재는 프론트에서
- `GBA 준수율`
- `ACTIVE VC 존재 여부`

를 조합해서 `검증 완료 / 부분 검증 / 증빙 없음`을 계산한다.

하지만 실제로는 별도 규제 검증 상태가 있으면 더 정확하다.

#### 권장 API 또는 필드
- `regulatoryVerificationStatus`
  - `VERIFIED | PARTIAL | PENDING | FAILED`
- `regulatoryVerificationAt`
- `regulatoryVerifier`
- `regulatoryEvidenceIds: string[]`

### 3. 실물-이력 일치 검증 API

현재는 프론트에서 BMU 최신 `soc`와 여권 `currentSoc`를 비교하는 정도만 한다.
이건 임시 수준이라 실제 검증 결과를 백엔드가 내려주는 게 맞다.

#### 권장 필드/API
- `physicalHistoryVerification`
  - `status: VERIFIED | MISMATCH | PENDING`
  - `verifiedAt`
  - `reason`
  - `signals`

예:

```json
{
  "physicalHistoryVerification": {
    "status": "VERIFIED",
    "verifiedAt": "2026-04-13T15:00:00Z",
    "reason": "BMU latest SOC/SOH and passport snapshot matched",
    "signals": {
      "socMatched": true,
      "didMatched": true,
      "vinMatched": false
    }
  }
}
```

---

## GBA 21 관련 요청

중요: 기준은 **각 배터리가 100% 충족해야 한다**가 아니라,
**배터리 여권 구조 안에 GBA 21 항목이 모두 존재해야 한다**는 점이다.

### 백엔드 요청
- 현재 `Passport` 응답이 GBA 21 항목을 전부 담을 수 있도록 필드 존재 여부 재점검
- 값이 비어 있어도 좋지만, **필드 슬롯 자체는 빠지지 않게 유지**
- 누락 항목은 프론트가 식별할 수 있게 `null` 또는 빈 문자열로 일관되게 반환

---

## 우선순위

### P0
- 여권 상세 API에 1년차 메타 필드 추가
- GBA 21 필드 누락 여부 정리

### P1
- VC 검증 이력 / 검증자별 이력 / request-approve 흐름 추가
- 규제 검증 상태 명시 필드 추가

### P2
- 실물-이력 일치 검증 결과 구조화
- 제출/다운로드/증빙 패키지 흐름 추가

---

## 프론트 확인 포인트

백엔드 반영 후 아래 화면에서 바로 검증 가능하다.

- `/passports/PASSPORT-BMU-DEVICE`
  - `개요` 탭: 1년차 메타 필드 반영 확인
  - `규제·소재` 탭: 규제 증빙 상태 / GBA 21 필드 확인
  - `운영 이력` 탭: 물리적 이력 검증 상태 확인
  - `증빙` 탭: VC 검증/폐기/이력 기능 확인

---

## 한 줄 요약

프론트는 1~3년차 요구를 담을 **UI 슬롯과 기본 흐름은 반영 완료**했다.
이제 백엔드는 **메타 필드 채우기 + VC lifecycle API 확장 + 규제/실물 검증 상태 구조화**를 맡아주면 된다.
