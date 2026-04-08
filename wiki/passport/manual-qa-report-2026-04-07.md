# BATP 실사용 QA 결과

- 최초 점검 시각: 2026. 4. 7. AM 10:45:09
- 재점검 시각: 2026-04-07 12:27:59 KST
- 기준 URL: http://127.0.0.1:3001

| 항목 | 결과 | 비고 |
|---|---|---|
| 공통 진입: 대문 노출 | PASS | 기존 상태 유지 |
| 공통 진입: 계정 등록 탭 전환 | PASS | 기존 상태 유지 |
| 대시보드: KPI/차트/테이블 확인 | PASS | 기존 상태 유지 |
| 등록부: 여권 발급 모달 오픈 및 생성 | PASS | 기존 상태 유지 |
| 상세: 탭 전환과 action rail 확인 | PASS | `battery-passport.spec.js`의 상세 탭 전환/새로고침 유지 2건 통과, 해시 `tab=compliance` 유지 확인 |
| 원자재: 등록 모달 오픈 및 생성 | PASS | 기존 상태 유지 |
| QR/NFC: 수동 입력으로 상세 연결 | PASS | 기존 상태 유지 |
| 정비 운영: 서비스 계정 화면 진입 | PASS | 기존 상태 유지 |
| BMU 데이터: 조회 및 자동새로고침 토글 | PASS | Service 계정에서 `PASSPORT-BMU-DEVICE` 조회 시 `판독 기록` 대신 권한 안내 패널 노출 확인, 자동 새로고침 토글 노출 확인 |
| 회수 운영: 규제 계정 화면 진입 | PASS | 기존 상태 유지 |
| 감사 로그: 필터와 상세 확장 | PASS | Regulator 계정에서 `CREATE_PASSPORT` 필터 적용 후 `활성 필터`, `총 N건`, `여권 생성` 노출 확인 |

## 자동화 검증
- `cd e2e-tests && npx playwright test tests/c02_check.spec.js` → 1 passed
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --grep "11\. 프론트엔드 네비게이션|12\. 여권 상세 탭"` → 10 passed
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --config=playwright.config.js` → 41 passed
- `cd e2e-tests && npx playwright test tests/battery-passport.spec.js --grep "4\. 대시보드|11\. 프론트엔드 네비게이션.*dashboard 페이지 로드"` → 2 passed

## 메모
- 최초 FAIL 3건은 현재 기준으로 재현되지 않았다.
- BMU 데이터의 핵심 해석은 `판독 기록` 노출 여부가 아니라, Service 계정에서 RBAC 제약이 발생할 때 권한 안내 패널이 명확히 보이는지 여부다.
- 수동 브라우저 재점검 기준 첫 상세 대상 여권 ID는 `PASSPORT-1775467422705`였다.
- 로그인 UI 테스트는 현재 `#login` 직접 진입과 실제 placeholder/조직 카드 기준으로 안정화했다.
- BMU records API 테스트는 현재 백엔드 계약에 맞춰 BMU 시드 여권의 `count/bookmark/records[]` 응답 shape를 검증하도록 조정했다.
- `대기 항목` 배지는 `app.js`와 `maintenance.js`의 기준을 맞춰 숫자와 실제 목록이 어긋나지 않도록 수정했다.
- 주요 화면의 AI스러운 한국어 표현과 10~11px 텍스트를 줄이고, 본문/라벨 크기를 디자인 토큰 기준에 가깝게 정리했다.
