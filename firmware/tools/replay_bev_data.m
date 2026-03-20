%% replay_bev_data.m
%  Replays BEVsystemModel simulation data via UDP to dataProcess.py
%
%  Prerequisites:
%    1. Run BEVsystemModel simulation first (simOut must exist in workspace)
%    2. Start dataProcess.py: python dataProcess.py --port COM5 --baud 9600
%
%  Usage:
%    simOut = sim('BEVsystemModel', 'StopTime', '5');
%    replay_bev_data(simOut)

function replay_bev_data(simOut)
    %% Configuration
    UDP_IP   = '127.0.0.1';
    UDP_PORT = 5005;
    DT       = 0.05;  % 50ms replay interval
    NUM_CELLS_HW = 11; % Hardware expects 11 cells

    %% Extract signals from simulation output
    logs = simOut.logsout;

    current_ts = logs.getElement('Current').Values;
    soc_ts     = logs.getElement('SoC').Values;
    temp_ts    = logs.getElement('temp').Values;
    cellV_ts   = logs.getElement('Cellvolt').Values;
    hvVolt_ts  = logs.getElement('HV Battery Voltage').Values;
    time_vec   = current_ts.Time;

    numSamples = length(time_vec);
    numCells   = size(soc_ts.Data, 2);  % 10 cells from model

    fprintf('Loaded %d samples, %d cells, %.1fs duration\n', ...
            numSamples, numCells, time_vec(end));

    %% Create UDP sender (Java, no toolbox needed)
    import java.net.DatagramSocket
    import java.net.DatagramPacket
    import java.net.InetAddress

    udpSocket = DatagramSocket();
    udpAddr   = InetAddress.getByName(UDP_IP);
    cleanup   = onCleanup(@() udpSocket.close());

    fprintf('Sending to %s:%d every %.0fms\n', UDP_IP, UDP_PORT, DT*1000);
    fprintf('Press Ctrl+C to stop\n\n');

    %% Replay loop (repeat data continuously)
    frameCount = 0;
    cycles = 0;

    while true
        for idx = 1:numSamples
            %% Get values at this time step
            I    = double(current_ts.Data(idx));
            vTot = double(hvVolt_ts.Data(idx));
            rawSoc = mean(double(soc_ts.Data(idx, :)));
            rawTemp = mean(double(temp_ts.Data(idx, :)));

            % Auto-detect SOC scale: if max > 1, it's percentage (0~100)
            if rawSoc > 1
                avgSoc = rawSoc / 100;  % percentage -> fraction
            else
                avgSoc = rawSoc;        % already fraction
            end

            % Auto-detect Temp scale: if > 200, it's already Kelvin
            if rawTemp > 200
                avgTemp = rawTemp;      % already Kelvin
            else
                avgTemp = rawTemp + 273; % Celsius -> Kelvin
            end

            % Per-cell SOC (pad to 11 cells)
            socCells = zeros(1, NUM_CELLS_HW);
            for c = 1:min(numCells, NUM_CELLS_HW)
                sv = double(soc_ts.Data(idx, c));
                if sv > 1, sv = sv / 100; end
                socCells(c) = sv;
            end
            % Pad remaining cells with average
            for c = (numCells+1):NUM_CELLS_HW
                socCells(c) = avgSoc;
            end

            % Per-cell voltage (pad to 11)
            vCells = zeros(1, NUM_CELLS_HW);
            avgCellV = vTot / numCells;
            for c = 1:min(numCells, NUM_CELLS_HW)
                vCells(c) = double(cellV_ts.Data(idx, c));
            end
            for c = (numCells+1):NUM_CELLS_HW
                vCells(c) = avgCellV;
            end

            %% Pack 27 doubles (216 bytes) — same format as dataProcess.py expects
            packet = [I, cycles, avgSoc/100, socCells, avgTemp, vTot, vCells];

            byteData = typecast(packet, 'uint8');
            dp = DatagramPacket(byteData, length(byteData), udpAddr, UDP_PORT);
            udpSocket.send(dp);

            frameCount = frameCount + 1;

            %% Display every 20th frame
            if mod(frameCount, 20) == 0
                fprintf('[%06d] I=%+6.1fA V=%6.1fV SOC=%5.1f%% T=%5.1fC\n', ...
                        frameCount, I, vTot, avgSoc, avgTemp-273);
            end

            pause(DT);
        end

        % Loop completed — increment cycle count, replay
        cycles = cycles + 1;
        fprintf('--- Cycle %d complete, replaying ---\n', cycles);
    end
end
