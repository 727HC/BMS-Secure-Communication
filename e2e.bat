@echo off
echo ========================================
echo  BMS Full E2E Pipeline (MATLAB mode)
echo ========================================
echo.
echo  1. MATLAB: run_bms_simulation 실행 중이어야 합니다
echo  2. 블록체인: start_all.sh 실행 중이어야 합니다
echo  3. 보드: BMU+CMU 리셋 완료되어야 합니다
echo.
echo  Ctrl+C로 종료
echo ========================================
echo.

cd /d "C:\Users\heechan\Desktop\BMS"

echo [1/2] dataProcess.py 시작 (MATLAB → CMU)...
start /b python -u firmware\tools\dataProcess.py --port COM5 --baud 9600

timeout /t 3 /nobreak > nul

echo [2/2] serial_to_agent.py 시작 (BMU → Blockchain)...
python -u firmware\tools\serial_to_agent.py --port COM4 --baud 28800 --agent http://localhost:3001 --did T9CvMCARRdBqb2izCxUkmh
