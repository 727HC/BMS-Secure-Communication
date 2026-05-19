---
title: "ADR-007: Blockchain write200 공식 재측정 Host Readiness Gate"
date: 2026-05-14
tags: [adr, blockchain, benchmark, performance, fabric]
doc_type: adr
status: accepted
---
# ADR-007: Blockchain write200 공식 재측정 Host Readiness Gate

## 상태
Accepted

## 맥락
write200 공식 재측정 hard gate는 다음을 요구한다.

- 4-org Caliper `write200` 10-repeat
- successful commit 기준
- 각 repeat `Succ==expected`, `Fail=0`, `Reject=0`
- TPS `p50>=200`, `p10>=150`, `min>=150`

현재 로컬 Docker host는 `8` CPU / `54.92GiB` memory다. 반복 evidence는 다음 패턴으로 수렴했다.

- cloud read2000: PASS (`4039.0 TPS`, errors `0`)
- JMeter read-only actual: PASS (`10000` samples, error `0%`, p95 `3 ms`)
- 4-org write official-like EV gateway 10-repeat:
  - Caliper `99892/100000`, `Fail=0`, `Reject=0`
  - TPS min/p10/p50 `115.6/115.6/180.6`
  - txmap/CouchDB/peer heights는 `100000/100000`
  - classification: `caliper_reporter_aggregation_artifact`

즉 ledger/world-state는 성공했지만, official Caliper Succ/TPS gate는 통과하지 못했다. `cl.txt` 외부 리뷰는 최소 `12 vCPU / 24GB`, 권장 `16 vCPU / 32GB / NVMe`에서 같은 harness를 재측정하라고 제안했다.

## 결정
공식 write200 재측정은 기본적으로 host readiness gate를 통과해야 한다.

- 기본 floor:
  - Docker CPUs `>= 12`
  - Docker memory `>= 24GiB`
- 공식 재측정 전에 `scripts/check-benchmark-host-readiness.sh`로 readiness를 검사한다.
- readiness 미달이면 `blocked_underpowered_host`로 종료하고 Fabric channel을 만들지 않는다.
- 진단 목적 강제 실행은 `ALLOW_UNDERPOWERED=true`로 가능하지만, 기본 official PASS 경로로 선호하지 않는다.
- official PASS는 여전히 Caliper report 기준이다. ledger/CouchDB count는 원인 분리 evidence이며 `Succ==expected` 대체값이 아니다.

## 결과
- 로컬 8-CPU 환경에서 같은 official 10-repeat 실패를 반복하지 않는다.
- 다음 유효 PASS 시도는 같은 disposable-channel/reconciliation 측정 방식을 12~16+ vCPU host에서 재실행한다.
- live `passportchannel`은 계속 read-only 원칙을 유지한다.
- benchmark cleanup은 wrapper exit trap으로 수행하고, orderer channel list가 `passportchannel` only인지 evidence로 남긴다.

## 후속 액션
- stronger host에서 host readiness를 확인한 뒤 동일한 write200 조건으로 재측정한다.
- run 완료 후 `summary.env`, `repeat-results.csv`, `ledger-reconciliation.json`, `final-status.env`, cleanup evidence를 보관한다.
- PASS 선언 전에는 모든 hard gate를 다시 대조한다.
