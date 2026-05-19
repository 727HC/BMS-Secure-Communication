@echo off
REM BMS Project — first-time dev environment setup
REM
REM S32DS 프로젝트(.args 파일들)가 "C:\BMS\..." 절대경로를 참조하므로,
REM 클론한 위치와 무관하게 C:\BMS 라는 디렉토리 정션이 필요하다.
REM
REM 이 스크립트는 한 번만 실행하면 된다.
REM 관리자 권한 불필요 (정션은 일반 사용자도 가능).

setlocal

REM 스크립트가 있는 디렉토리의 부모 = 프로젝트 루트
set "PROJECT_ROOT=%~dp0.."
pushd "%PROJECT_ROOT%"
set "PROJECT_ROOT=%CD%"
popd

if exist "C:\BMS\" (
    echo [skip] C:\BMS already exists. Verifying it points to this repo...
    if exist "C:\BMS\config.env" (
        echo [ok] C:\BMS is reachable. Build should work.
    ) else (
        echo [warn] C:\BMS exists but is not a valid junction to this repo.
        echo        If you want to reset it: rmdir C:\BMS  ^&^&  rerun this script.
    )
    goto :end
)

echo Creating junction: C:\BMS -^> %PROJECT_ROOT%
mklink /J C:\BMS "%PROJECT_ROOT%"
if errorlevel 1 (
    echo [error] mklink failed. Make sure you are on Windows and C:\ is writable.
    exit /b 1
)

echo.
echo [ok] Junction ready. S32DS builds (BMU/CMU) should now work.
echo      Verify: dir C:\BMS\config.env

:end
endlocal
