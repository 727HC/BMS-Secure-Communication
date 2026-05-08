# 2026-05-08 — BMU parser 무결성 + bmu-agent 부트스트랩 정리

## 작업 주체
- Codex

## 작업 내용

이전 감사에서 P0/P1로 분류한 배터리여권 백엔드 위험을 수정했습니다.

- BMU `rawPayload` 파서가 `soc_u16`을 cell SOC 평균으로 보정하던 로직을 제거했습니다.
- `bmu-agent` 테스트 스크립트를 없는 `test-verify.js` 대신 Node 기본 테스트 러너로 교체했습니다.
- 없는 `agent_ingest_bmu.js`를 가리키던 `start:legacy` 스크립트를 제거했습니다.
- `server.js`를 `createApp()` / `startServer()`로 분리해 import 시 Fabric 연결과 `app.listen()`이 실행되지 않게 했습니다.
- 차량 이미지 업로드/조회에서 SVG를 제외하고 JPG/PNG/WebP만 허용하도록 제한했습니다.
- BMU 데이터 API의 직접 구현 rate-limit 버킷을 공용 `middleware/rate-limit.js` 사용으로 바꿨습니다.

## 변경 파일

- `bmu-agent/services/bmu-parser.service.js`
- `bmu-agent/tests/bmu-parser.test.js`
- `bmu-agent/tests/server-bootstrap.test.js`
- `bmu-agent/package.json`
- `bmu-agent/server.js`
- `bmu-agent/routes/passport.routes.js`
- `bmu-agent/routes/bmu.routes.js`
- `wiki/passport/activity-log.md`
- `wiki/passport/activity-log/2026-05-08-bmu-agent-hardening.md`

## 검증 결과

- `node -c bmu-agent/services/bmu-parser.service.js bmu-agent/routes/bmu.routes.js bmu-agent/routes/passport.routes.js bmu-agent/server.js bmu-agent/tests/*.test.js` 범위 구문 검증 통과
- `git diff --check -- bmu-agent/...` 통과
- `cd bmu-agent && npm test` 통과: 5개 테스트 모두 pass

## 미완료 / 남은 위험

- `bmu-agent/utils/request-validation.js`는 여전히 여러 라우트에 폭넓게 적용되지 않았습니다. 이번 변경에서는 공용 `middleware/rate-limit.js`를 BMU ingestion에 연결하는 선에서 범위를 제한했습니다.
- 프론트엔드 파일은 수정하지 않아 React 빌드는 실행하지 않았습니다.
- 현재 작업 전부터 `chaincode/passport-contract/*`, `wiki/blockchain/activity-log.md`, `.codex`에 다른 세션 변경이 있었습니다. Passport 작업에서는 건드리지 않았습니다.

## 교훈

- 서명된 원본 payload를 해석하는 파서는 보정/정규화보다 원본과 저장값의 1:1 대응을 우선해야 감사 가능성이 유지됩니다.
- Express 앱 생성과 프로세스 부트스트랩을 분리하면 Fabric 없이도 라우트와 미들웨어 단위 테스트를 추가할 수 있습니다.
