# Micro 13 Contract

## Ledger Restatement

- Cycle 02 / target 12
- Micro-loop 13 / 15
- Completed cycles so far: 1
- Stopping allowed: NO

## Screen Focus

- `app shell` status lane refinement

## Aesthetic Hypothesis

shell ribbon과 nav band가 정리됐으니 상단 우측의 fabric / user 상태도 단순 pill이 아니라 network posture와 session holder를 가진 status lane으로 읽혀야 한다.

## Functional Constraints

- 기존 fabric polling 유지
- 기존 auth / logout 유지
- 기존 mobile compact indicator 유지

## Build Intent

- desktop에는 network posture / session holder card를 만든다.
- mobile에는 compact fabric posture를 유지한다.
- shell 상단에서 연결 상태와 세션 소유자를 더 직접적으로 보여준다.
