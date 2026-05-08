---
title: "2026-05-08 Passport 코드 리뷰 결과"
date: 2026-05-08
tags: [passport, code-review, hardening]
doc_type: review
status: current
---
# 2026-05-08 Passport 코드 리뷰 결과

## 범위
- 검토/수정 범위: `bmu-agent/`, `webapp/frontend-react/`, `wiki/passport/`
- 직접 수정 금지: `chaincode/`, `passport-network/`, `embedded/`, `firmware/`, `mcp-monitor/`
- 기준 문서: `CLAUDE.md`, `wiki/passport/design-tokens.md`, `wiki/Object/BMS__.pdf`

## 리뷰 결과표

| ID | 위험도 | 영역 | 파일 | 근거 | 영향 | 조치 |
|---|---|---|---|---|---|---|
| P-F01 | High | 입력 검증/API 계약 | `bmu-agent/routes/auth.routes.js`, `utils/request-validation.js` | `parseInt('1abc', 10)` 계열 입력이 정상 org/page 값처럼 해석될 수 있었음 | 잘못된 조직 선택, Fabric 호출 전 검증 실패 누락 | 정수/숫자 strict parser, `category: VAL` 응답 추가, 회귀 테스트 추가 |
| P-F02 | High | 입력 검증/원장 쓰기 | `bmu-agent/routes/passport.routes.js`, `analysis.routes.js`, `recycling.routes.js`, `vc.routes.js`, `material.routes.js`, `maintenance.routes.js`, `did.routes.js`, `bmu.routes.js` | ID, pagination, status enum, physical signals, recyclingRates 객체 검증이 라우트마다 불균일 | 체인코드/Fabric까지 불량 요청 전달, INTERNAL 마스킹 또는 원장 쓰기 실패 | 공용 validator 적용, pagination/bookmark/status/object/array 검증 추가 |
| P-F03 | High | 감사/개인정보·센서 데이터 | `bmu-agent/middleware/audit.js` | 기존 `sanitizeBody`는 shallow delete만 수행 | nested token/signature/rawPayload가 NDJSON audit 로그에 남을 수 있음 | 재귀 redaction으로 `password`, `token`, `secret`, `signature`, `rawPayload`, `privateKey`, `authorization` 마스킹 |
| P-F04 | Medium | BMU parser 정합성 | `bmu-agent/services/bmu-parser.service.js` | `Buffer.from(hex, 'hex')`는 non-hex/odd-length 입력을 조용히 잘라낼 수 있음 | 잘못된 BMU payload가 size mismatch로만 보이거나 디버깅이 어려움 | even-length hex 선검증 추가, 테스트 추가 |
| P-F05 | Medium | 서버 부트스트랩/테스트성 | `bmu-agent/server.js` | 기존 구조는 import 시 listener/shutdown handler 등록 위험 | 단위 테스트와 route validation 테스트가 서버 실행 부작용에 취약 | `createApp`, `startServer`, `shutdown` 분리 유지, bootstrap 테스트 통과 |
| P-F06 | Medium | 차량 이미지 업로드 | `bmu-agent/routes/passport.routes.js` | 기존 `image/*` 허용과 `.svg` 조회가 XSS 표면이 될 수 있음 | 인증된 사용자 대상 SVG 스크립트/active content 위험 | JPG/PNG/WebP MIME+확장자 allowlist, SVG 조회 제거 |
| P-F07 | Medium | BMU ingestion 안정성 | `bmu-agent/routes/bmu.routes.js`, `middleware/rate-limit.js` | 라우트 자체 rate bucket 구현이 중복되고 테스트/재사용 어려움 | 운영 제한 정책 drift | 공용 `createRateLimiter`로 통합 |
| P-F08 | Medium | 3차년도 정정 UI | `webapp/frontend-react/src/components/modals/passport-detail/CorrectionModal.tsx` | 체인코드 정정 가능 필드 중 `manufacturingProcess`, `disposalMethod`, `recycledElementContent`, `extensionInfo`, EV binding fields가 UI에 없었음 | 3차년도 추가 속성/정정 기능을 UI에서 수행 불가 | 정정 필드 옵션 확장, JSON 필드 힌트 추가, 테스트 갱신 |
| P-R01 | Remaining | Chaincode 의존 | `chaincode/passport-contract/*` | 3차년도 smart contract 자동 검증/업데이트, 초기 발급 시 확장 속성 반영은 Passport 세션만으로 완결 불가 | BMS PDF 3차년도 일부는 앱 레벨에서 `blocked-by-chaincode-session` | `wiki/passport/cross-session-handoff-2026-05-08.md`에 복붙용 요청문 작성 |
| P-R02 | Remaining | 검증 범위 | 성능/침투/대규모 부하 | 현재 goal에서 단위/빌드 검증은 수행했으나 대규모 부하·침투 테스트는 별도 환경 필요 | 3차년도 성능/보안 시험 결과서 요구는 미충족 | BMS mapping에서 `blocked-by-other-session`/후속 QA로 표시 |

## 수정 요약
- 공용 request validation을 엄격화하고 주요 Passport API 라우트에 적용했다.
- 감사 로그의 민감값/원시 BMU payload 재귀 마스킹을 추가했다.
- BMU parser의 raw hex 선검증을 추가했다.
- Passport 정정 UI에 3차년도 추가 속성·EV 연결 정정 필드를 노출했다.

## 검증 요약
- `node -c` 대상 JS 파일 통과.
- `cd bmu-agent && npm test` → 16개 테스트 통과.
- `cd webapp/frontend-react && npx tsc --noEmit --pretty false` 통과.
- `cd webapp/frontend-react && npm test` → 168 files / 1258 tests 통과.
- `cd webapp/frontend-react && npm run build` 통과.
- 최종 `git diff --check`는 완료 감사 단계에서 실행.
