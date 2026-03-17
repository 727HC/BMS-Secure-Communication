# Simulink BEV Battery Model

## 파일
- `BEVsystemModel.slx` — 전기차 배터리 Simscape 모델
- `ElectricVehicleSimscape.prj` — 프로젝트 파일

## 실행 방법
1. `Electric-Vehicle-Simscape-master.zip` 압축 해제 필요 (전체 Simscape 프로젝트)
2. MATLAB에서:
```matlab
openProject('Electric-Vehicle-Simscape-master/ElectricVehicleSimscape.prj')
simOut = sim('BEVsystemModel', 'StopTime', '5');
replay_bev_data(simOut)
```

## Simscape 없이 사용
MATLAB만으로 배터리 시뮬레이션 가능:
```matlab
cd firmware/tools
run_bms_simulation
```

## Python만으로 사용 (MATLAB 불필요)
```bash
./start.sh    # battery_simulator.py --udp 자동 실행
```
