# Passport 세션 — webapp + bmu-agent

## 범위
- `webapp/frontend/` — Vue 3 SPA (10개 페이지)
- `bmu-agent/` — Node.js API 서버 (41개 엔드포인트)

## 수정 금지
- `chaincode/` → 블록체인 세션
- `passport-network/` → 블록체인 세션
- `embedded/`, `firmware/` → 임베디드 세션
- `mcp-monitor/` → MCP 세션

## 프론트엔드 규칙
- `wiki/passport/design-tokens.md` 색상/폰트/크기 규칙 준수
- 본문 14px 이상, 라벨 12px 이상
- 다크 배경 카드, 글래스모피즘, AI 글로우 효과 금지
- 수정 후 `node -c` 구문 검증 필수
- Playwright 스크린샷으로 시각 확인 권장

## API 규칙
- 입력 검증: 필수 필드 null 체크
- 에러 응답: `{ error: string }` 형식 통일
- MVCC_READ_CONFLICT 시 재시도 (retryOnConflict)
- 인증: authenticateToken 미들웨어 필수

## 한국어 규칙
- "흐름", "건" 같은 AI 번역체 금지
- "배터리 건강" → "배터리 상태", "규제 적합" → "규제 준수"
- 자연스러운 한국어, 본문은 "~합니다" 체

## 작업 완료 시
- `wiki/passport/activity-log.md`에 세션 단위로 기록
- Task Packet 사용 시 acceptance tests 전부 통과 확인
