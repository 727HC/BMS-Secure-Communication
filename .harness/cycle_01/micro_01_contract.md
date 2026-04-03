# Micro 01 Contract

## Ledger Restatement

- Cycle 01 / target 12
- Micro-loop 01 / 15
- Completed cycles so far: 0
- Stopping allowed: NO

## Screen Focus

- `login-page`

## Aesthetic Hypothesis

로그인 화면을 일반 auth card가 아니라 `access checkpoint / credential intake desk` 로 재구성하면, 제품 첫인상에서 generic SaaS 냄새를 가장 빠르게 끊을 수 있다.

## Functional Constraints

- 로그인 / 회원가입 탭 유지
- 조직 선택 유지
- 사용자 ID / 비밀번호 입력 유지
- 기존 submit 흐름 유지
- 오류 표시 유지
- `emit('login', data)` 동작 유지

## Build Intent

- centered card 문법을 버리고, 접수 데스크형 문서 표면으로 재구성
- 조직 선택을 시각적으로 더 공식적인 issuer selection surface로 재해석
- 안내 텍스트를 제품 언어에 맞게 정제
- mobile에서도 정보 우선순위가 무너지지 않게 재배치
