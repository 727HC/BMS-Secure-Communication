@echo off
echo ╔══════════════════════════════════════╗
echo ║  BMS Full E2E Pipeline - One Click  ║
echo ╚══════════════════════════════════════╝
echo.

cd /d "C:\BMS"

echo [1/4] 블록체인 시작 (WSL)...
wsl bash -c "cd ~/bms-blockchain && ./start_all.sh" > nul 2>&1 &
echo       대기 중 (60초)...

:: Agent:3001 준비 대기
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

echo [2/4] MATLAB 시뮬레이션 시작...
start "" matlab -nosplash -nodesktop -r "cd('C:\BMS\firmware\tools'); run_bms_simulation"
echo       MATLAB 시작됨 (백그라운드)
timeout /t 5 /nobreak > nul
echo.

echo [3/4] 보드 리셋 필요!
echo       ============================
echo       BMU 리셋 버튼을 누르세요
echo       CMU 리셋 버튼을 누르세요
echo       ============================
pause
echo.

echo [4/4] E2E 브릿지 시작...
start /b python -u firmware\tools\dataProcess.py --port COM5 --baud 9600
timeout /t 3 /nobreak > nul
python -u firmware\tools\serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did T9CvMCARRdBqb2izCxUkmh
