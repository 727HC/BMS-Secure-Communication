---
title: "리스크 수용 기록"
date: 2026-04-13
tags: [security, risk, decision]
doc_type: review
status: historical
---
# 리스크 수용 기록

> 과거 기준 기록
>
> 이 문서는 특정 시점에 수용한 리스크를 기록한 review note다. 현재 거버넌스 판단은 ADR과 현재 코드 상태를 함께 본다.


코드 리뷰에서 지적되었으나 현재 단계(국가과제 연구/시제품)에서 리스크 수용한 항목.

## C-6. 단일 Orderer 노드

- **지적**: Raft 클러스터에 consenter 1개. 장애 시 네트워크 전체 정지.
- **수용 근거**: 현재 dev/연구 환경. 장애 시 재시작으로 복구 가능. 데이터 유실 없음 (원장 영속).
- **전환 시점**: production 배포 전 3노드 이상 Raft 클러스터로 확장.

## C-7. Ed25519 서명 체인코드 내 미검증

- **지적**: BMU 데이터의 signature 필드를 체인코드에서 암호학적 검증하지 않음. 저장만 함.
- **수용 근거**: (1) Fabric MSP 인증으로 submitTransaction 자체가 인가된 조직만 가능. (2) Agent에서 Ed25519 서명 검증 완료 후 기록. (3) 체인코드 내 nacl 라이브러리 의존성 추가 + 성능 비용 대비 실익 낮음.
- **전환 시점**: 외부 조직 참여 또는 Agent 우회 경로 발생 시 체인코드 검증 추가.

## M-6. MaintenanceLogs 배열 무한 증가

- **지적**: BatteryPassport struct 내 MaintenanceLogs, AccidentLogs 배열이 크기 제한 없이 증가.
- **수용 근거**: 배터리 수명 내 정비 횟수는 수백 건 이하. 현재 데이터 규모에서 문제 없음.
- **전환 시점**: 실서비스 운영 전 아카이빙 정책 (최근 N건만 passport에 유지, 나머지 별도 docType) 수립.

## M-13. sanitizeSelector vs json.Marshal

- **지적**: CouchDB 쿼리에 `sanitizeSelector()` (문자열 이스케이프) 사용. `json.Marshal`이 더 안전.
- **수용 근거**: 현재 `"`, `\` 이스케이프로 injection 방어 충분. 14곳 전부 적용 완료. 실제 공격 벡터는 Fabric MSP 인증으로 이중 차단.
- **전환 시점**: 체인코드 대규모 리팩토링 시 json.Marshal 기반 쿼리 빌더로 전환.
