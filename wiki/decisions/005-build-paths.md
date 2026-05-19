---
title: ADR-005 — S32DS 빌드 인자의 절대경로 의존
status: Accepted (단기) · Open (장기 마이그레이션)
date: 2026-05-19
---

# 005. S32DS 빌드 인자의 절대경로 의존 — 정션으로 우회

## Context

BMU/CMU 두 S32DS 프로젝트의 빌드 인자 파일들(`.args`)에 `C:/BMS/...` 형태의 절대경로가 박혀 있다. 프로젝트 초기 구현(`8038a6a`) 이래 한 번도 바뀌지 않았다.

영향받는 파일 (BMU/CMU 합쳐 10개+):

```
BMU_BMS_S32K344/Debug_FLASH/src/main.args
BMU_BMS_S32K344/Debug_FLASH/board/Port_Ci_Port_Ip_Cfg.args
BMU_BMS_S32K344/Debug_FLASH/generate/src/Clock_Ip_Cfg.args
BMU_BMS_S32K344/Debug_FLASH/Project_Settings/Startup_Code/exceptions.args
CMU_BMS_S32K144/Debug_FLASH/CMU_BMS_S32K144.args
CMU_BMS_S32K144/Debug_FLASH/src/main.args
CMU_BMS_S32K144/Debug_FLASH/board/Port_Ci_Port_Ip_Cfg.args
CMU_BMS_S32K144/Debug_FLASH/generate/src/Clock_Ip_Cfg.args
CMU_BMS_S32K144/Debug_FLASH/Project_Settings/Startup_Code/exceptions.args
CMU_BMS_S32K144/Debug_FLASH/RTD/src/Clock_Ip.args
```

이 파일들은 S32DS Eclipse IDE가 build configuration export 시 자동 생성하며, GUI 워크스페이스의 `${workspace_loc:/PROJECT}` 변수를 export 시점에 절대경로로 resolve한다. 따라서 GUI에서 재export하면 다시 절대경로가 박힌다.

## 단기 결정 (현재 적용)

`C:\BMS` 디렉토리 정션을 사용해 우회한다.

- `scripts/setup-dev-env.bat` — `mklink /J C:\BMS <project_root>` 실행
- `firmware/README.md` — 빌드 섹션 맨 앞에 사전 setup 안내
- 관리자 권한 불필요, 데이터 이동 없음, 클론 위치와 무관

**근거**:
- 즉시 빌드 가능
- S32DS GUI workflow 보존 (재export 시에도 정상 작동)
- 다음 개발자도 README 따라 5초 만에 복원

**제약**:
- Windows 전용 (Linux/Mac은 심볼릭 링크 + 경로 조정 필요)
- 이미 `C:\BMS`에 다른 디렉토리가 있으면 충돌
- CI/CD에서는 runner 시작 시 정션 생성 step 필요

## 장기 옵션 (백로그)

### 옵션 A: `.args` 절대경로 → 상대경로 마이그레이션
- 모든 `.args` 파일에서 `C:/BMS/<proj>/...` → `../../...` 변환
- 장점: 정션 불필요, 완전한 portability
- 단점: GUI에서 재export 시 절대경로 복귀 → 매번 수동 fix 필요. CI에 export 검증 step 추가하지 않으면 회귀 발생

### 옵션 B: 빌드 시점 sed 후처리
- `e2e.sh` / `build.sh` 진입에 `.args` 파일들을 임시 패치(sed)하여 현재 경로로 치환
- 장점: GUI workflow 그대로 유지
- 단점: 빌드 스크립트 복잡도 증가, 패치 누락 시 디버깅 어려움

### 옵션 C: S32DS workspace variable 정책 변경
- 모든 include 경로를 `${ProjDirPath}` 같은 Eclipse 빌트인 변수로 통일
- 장점: S32DS export가 항상 상대경로 유지
- 단점: 외부 SDK 경로(C:/NXP/...)는 어차피 절대경로 필요. 부분 해결

## 결정

**단기**: 정션 방식 채택. setup 스크립트 + README 명시.

**장기**: 옵션 A 또는 B로 마이그레이션. 다음 임베디드 빌드 시스템 정비 시 검토 (예: S32DS 버전 업그레이드, RTD 업데이트 같은 큰 변경 묶음에 포함).

## 검증

- 새 클론에서 `scripts/setup-dev-env.bat` 실행 → `make -j4 all` 즉시 성공
- 기존 정션 환경에서 스크립트 재실행 → "already exists" 메시지 + skip
- BMU/CMU 빌드 모두 정상 ELF 생성 (text size 변화 없음, 기존 빌드와 동일)
