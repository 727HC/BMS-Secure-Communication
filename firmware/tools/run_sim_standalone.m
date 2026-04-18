% run_sim_standalone.m - Standalone BMS simulation with UDP output
% Sends 27 doubles via UDP to dataProcess.py (same format as Simulink)

UDP_IP = '127.0.0.1';
UDP_PORT = 5005;
SIM_TIME = 30;
DT = 0.05;
NUM_CELLS = 11;

u = udpport("byte", "LocalPort", 0);
fprintf('Sending battery data to %s:%d every %.0fms for %ds\n', UDP_IP, UDP_PORT, DT*1000, SIM_TIME);

soc = 0.95; cycles = 0; charging = false; t = 0;

while t < SIM_TIME
    if ~charging
        soc = soc - 0.001 * DT;
        if soc <= 0.15, charging = true; cycles = cycles + 1; end
    else
        soc = soc + 0.002 * DT;
        if soc >= 0.95, charging = false; end
    end
    soc = max(0.05, min(0.99, soc));
    if charging, current = 5.0 + 0.3*sin(t*0.5); else, current = -3.5 + 0.3*sin(t*0.5); end
    vCell = 3.0 + 1.0*soc + 0.1*sin(t*0.2);
    vTotal = vCell * NUM_CELLS;
    tempK = 273 + 25 + abs(current)*0.8 + 2*sin(t*0.1);
    vP = zeros(1,NUM_CELLS); sP = zeros(1,NUM_CELLS);
    for i=1:NUM_CELLS
        phase = (i-1)*0.7 + t*0.3;
        vP(i) = vCell + 0.02*sin(phase);
        sP(i) = soc + 0.01*sin(phase+1.0);
    end
    packet = [current, cycles, soc, sP, tempK, vTotal, vP];
    byteData = typecast(packet, 'uint8');
    write(u, byteData, "uint8", UDP_IP, UDP_PORT);
    if mod(round(t/DT), 100) == 0
        fprintf('[t=%5.1fs] I=%+6.2fA V=%6.2fV SOC=%5.1f%% T=%5.1fC Cyc=%d\n', t, current, vTotal, soc*100, tempK-273, cycles);
    end
    t = t + DT;
    pause(DT);
end
fprintf('Done. Sent %d frames\n', round(SIM_TIME/DT));
clear u;
