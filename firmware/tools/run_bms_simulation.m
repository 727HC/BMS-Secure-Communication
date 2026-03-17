%% run_bms_simulation.m
%  Standalone battery simulator - sends data via UDP to dataProcess.py
%  No Simscape/Simulink required.
%
%  Usage:
%    1. Start dataProcess.py:  python dataProcess.py --port COM5 --baud 115200
%    2. Run this in MATLAB:    run_bms_simulation
%
%  Data flow:
%    This script -> UDP:5005 -> dataProcess.py -> UART(COM5) -> CMU -> CAN-FD -> BMU

function run_bms_simulation()
    %% Configuration
    UDP_IP   = '127.0.0.1';
    UDP_PORT = 5005;
    SIM_TIME = 600;      % seconds (10 minutes)
    DT       = 0.05;     % 50ms step

    NUM_CELLS = 11;

    %% Create UDP sender (Java-based, no toolbox needed)
    import java.net.DatagramSocket
    import java.net.DatagramPacket
    import java.net.InetAddress

    udpSocket = DatagramSocket();
    udpAddr   = InetAddress.getByName(UDP_IP);

    fprintf('Sending battery data to %s:%d every %.0fms\n', ...
            UDP_IP, UDP_PORT, DT*1000);
    fprintf('Simulation time: %ds\n', SIM_TIME);
    fprintf('Press Ctrl+C to stop\n\n');

    %% Simple battery model (standalone, no Simscape needed)
    soc = 0.95;
    cycles = 0;
    charging = false;
    t = 0;

    cleanup = onCleanup(@() udpSocket.close());

    while t < SIM_TIME
        %% Battery dynamics
        if ~charging
            soc = soc - 0.001 * DT;
            if soc <= 0.15
                charging = true;
                cycles = cycles + 1;
            end
        else
            soc = soc + 0.002 * DT;
            if soc >= 0.95
                charging = false;
            end
        end
        soc = max(0.05, min(0.99, soc));

        % Current
        if charging
            current = 5.0 + 0.3 * sin(t * 0.5);
        else
            current = -3.5 + 0.3 * sin(t * 0.5);
        end

        % Voltage
        vCell = 3.0 + 1.0 * soc + 0.1 * sin(t * 0.2);
        vTotal = vCell * NUM_CELLS;

        % Temperature (Kelvin)
        tempK = 273 + 25 + abs(current) * 0.8 + 2 * sin(t * 0.1);

        % Per-cell variations
        vParallel = zeros(1, NUM_CELLS);
        socParallel = zeros(1, NUM_CELLS);
        for i = 1:NUM_CELLS
            phase = (i-1) * 0.7 + t * 0.3;
            vParallel(i) = vCell + 0.02 * sin(phase);
            socParallel(i) = soc + 0.01 * sin(phase + 1.0);
        end

        %% Pack 27 doubles (216 bytes) - same format as Simscape output
        packet = [current, cycles, soc, ...
                  socParallel, tempK, vTotal, vParallel];

        % Send as little-endian doubles via Java UDP
        byteData = typecast(packet, 'uint8');
        dp = DatagramPacket(byteData, length(byteData), udpAddr, UDP_PORT);
        udpSocket.send(dp);

        %% Display
        if mod(round(t / DT), 20) == 0
            if charging
                modeStr = 'CHG';
            else
                modeStr = 'DIS';
            end
            fprintf('[t=%6.2fs] I=%+6.2fA V=%6.2fV SOC=%5.1f%% T=%5.1fC Cyc=%d %s\n', ...
                    t, current, vTotal, soc*100, tempK-273, cycles, modeStr);
        end

        t = t + DT;
        pause(DT);
    end

    fprintf('\nSimulation complete.\n');
end
