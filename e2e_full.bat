@echo off
echo ╔══════════════════════════════════════╗
echo ║  BMS Full E2E Pipeline - One Click  ║
echo ╚══════════════════════════════════════╝
echo.

cd /d "C:\Users\heechan\Desktop\BMS"

:: ============================================
:: [0] Docker 확인
:: ============================================
echo [0] Docker 확인...
docker info > nul 2>&1
if %errorlevel% NEQ 0 (
    echo       [ERROR] Docker가 실행되지 않았습니다!
    echo       Docker Desktop을 먼저 실행하세요.
    pause
    exit /b 1
)
echo       Docker 실행 중!
echo.

:: ============================================
:: [1/4] 블록체인
:: ============================================
echo [1/4] 블록체인 확인...
curl -s http://localhost:3001/status > nul 2>&1
if %errorlevel%==0 (
    echo       Agent 이미 실행 중! 건너뜀.
    goto agent_ready
)
echo       Agent 미실행. 블록체인 시작 (WSL)...
start "" wsl bash -c "cd ~/bms-blockchain && ./start_all.sh"
echo       대기 중...

set /a count=0
:wait_agent
timeout /t 5 /nobreak > nul
set /a count+=1
curl -s http://localhost:3001/status > nul 2>&1
if %errorlevel%==0 (
    echo       Agent 연결 확인!
    goto agent_ready
)
if %count% GEQ 12 (
    echo       [WARN] Agent 60초 내 연결 안 됨. 수동 확인 필요.
    goto agent_ready
)
echo       대기 중... (%count%/12)
goto wait_agent

:agent_ready
echo.

:: ============================================
:: [2/4] MATLAB
:: ============================================
echo [2/4] MATLAB 확인...
tasklist /fi "imagename eq MATLAB.exe" 2>nul | find /i "MATLAB.exe" > nul
if %errorlevel%==0 (
    echo       MATLAB 이미 실행 중! 건너뜀.
) else (
    echo       MATLAB 시작 중...
    start "" matlab -nosplash -nodesktop -r "cd('C:\Users\heechan\Desktop\BMS\firmware\tools'); run_bms_simulation"
    echo       MATLAB 시작됨 (백그라운드)
    timeout /t 5 /nobreak > nul
)
echo.

:: ============================================
:: [3/4] 보드 리셋
:: ============================================
echo [3/4] 보드 리셋 필요!
echo       ============================
echo       BMU 리셋 버튼을 누르세요
echo       CMU 리셋 버튼을 누르세요
echo       ============================
pause
echo.

:: ============================================
:: [4/4] 브릿지
:: ============================================
echo [4/4] 브릿지 확인...

:: 기존 python 프로세스 정리 (COM 포트 충돌 방지)
tasklist /fi "imagename eq python.exe" 2>nul | find /i "python.exe" > nul
if %errorlevel%==0 (
    echo       기존 python 프로세스 종료 중...
    taskkill /f /im python.exe > nul 2>&1
    timeout /t 2 /nobreak > nul
)

echo       dataProcess.py 시작 (MATLAB → CMU)...
start /b python -u firmware\tools\dataProcess.py --port COM5 --baud 9600
timeout /t 3 /nobreak > nul

echo       serial_to_agent.py 시작 (BMU → Blockchain)...
echo.
echo ========================================
echo  E2E 파이프라인 실행 중 (Ctrl+C 종료)
echo ========================================
echo.
python -u firmware\tools\serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did T9CvMCARRdBqb2izCxUkmh
