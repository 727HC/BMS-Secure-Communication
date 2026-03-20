%% setup_simulink_udp.m
%  Configure Electric Vehicle Simscape model to send battery data via UDP
%
%  Usage:
%    1. Extract Electric-Vehicle-Simscape-master.zip
%    2. Open MATLAB, cd to this directory
%    3. Run: setup_simulink_udp
%
%  Data flow:
%    Simulink BEV Model -> UDP Send (port 5005) -> dataProcess.py -> UART -> CMU
%
%  Sends 27 doubles (216 bytes) per step:
%    [iCellModel, numCyclesCellModel, socCellModel,
%     socParallelAssembly(1:11), temperatureCellModel,
%     vCellModel, vParallelAssembly(1:11)]

function setup_simulink_udp()
    %% Configuration
    UDP_REMOTE_IP   = '127.0.0.1';
    UDP_REMOTE_PORT = 5005;
    SAMPLE_TIME     = 0.05;  % 50ms (matches CMU_TX_PERIOD_MS)

    % Path to EV Simscape project
    evSimscapePath = fullfile('..', '..', 'Electric-Vehicle-Simscape-master');

    %% Check if project exists
    prjFile = fullfile(evSimscapePath, 'ElectricVehicleSimscape.prj');
    if ~isfile(prjFile)
        % Try extracting zip
        zipFile = fullfile('..', '..', 'Electric-Vehicle-Simscape-master.zip');
        if isfile(zipFile)
            fprintf('Extracting %s...\n', zipFile);
            unzip(zipFile, fullfile('..', '..'));
        else
            error('Cannot find EV Simscape project at: %s\nExtract Electric-Vehicle-Simscape-master.zip first.', evSimscapePath);
        end
    end

    %% Open project
    fprintf('Opening EV Simscape project...\n');
    proj = openProject(prjFile);

    %% Open main model
    modelName = 'BEVsystemModel';
    modelPath = fullfile(evSimscapePath, 'Model', [modelName '.slx']);

    if ~isfile(modelPath)
        error('Model not found: %s', modelPath);
    end

    fprintf('Loading model: %s\n', modelName);
    load_system(modelPath);

    %% Find BMS-related signals
    % The BatteryManagementSystem block typically outputs these signals
    fprintf('\nSearching for battery signals in model...\n');

    % List all blocks to find BMS-related ones
    allBlocks = find_system(modelName, 'Type', 'Block');
    bmsBlocks = allBlocks(contains(allBlocks, 'Battery', 'IgnoreCase', true));

    fprintf('Found %d battery-related blocks:\n', length(bmsBlocks));
    for i = 1:min(10, length(bmsBlocks))
        fprintf('  %s\n', bmsBlocks{i});
    end

    %% Create UDP sender wrapper model
    wrapperModel = 'BMS_UDP_Sender';

    if bdIsLoaded(wrapperModel)
        close_system(wrapperModel, 0);
    end

    fprintf('\nCreating UDP sender model: %s\n', wrapperModel);
    new_system(wrapperModel);
    open_system(wrapperModel);

    %% Add blocks to wrapper model
    % UDP Send block
    udpSendPath = [wrapperModel '/UDP_Send'];
    add_block('simulink/Sinks/To Workspace', [wrapperModel '/ToWorkspace']);

    % Check if Instrument Control Toolbox is available for UDP
    hasUDP = ~isempty(ver('instrument'));

    if hasUDP
        try
            add_block('instrumentlib/UDP Send', udpSendPath);
            set_param(udpSendPath, 'remoteAddress', UDP_REMOTE_IP);
            set_param(udpSendPath, 'remotePort', num2str(UDP_REMOTE_PORT));
            fprintf('Added UDP Send block (port %d)\n', UDP_REMOTE_PORT);
        catch
            hasUDP = false;
        end
    end

    if ~hasUDP
        % Fallback: Use MATLAB Function block with udp()
        fprintf('Instrument Control Toolbox not found.\n');
        fprintf('Using MATLAB Function block for UDP send.\n');

        matlabFcnPath = [wrapperModel '/UDP_Send_Fcn'];
        add_block('simulink/User-Defined Functions/MATLAB Function', matlabFcnPath);

        % Set the MATLAB Function code
        % Note: This creates a basic structure. User may need to edit.
    end

    %% Create the signal packer (MATLAB Function block)
    packerPath = [wrapperModel '/BMS_Signal_Packer'];
    add_block('simulink/User-Defined Functions/MATLAB Function', packerPath);

    % Save wrapper model
    wrapperFile = fullfile(evSimscapePath, [wrapperModel '.slx']);
    save_system(wrapperModel, wrapperFile);
    fprintf('Saved: %s\n', wrapperFile);

    %% Print manual setup instructions
    fprintf('\n');
    fprintf('================================================================\n');
    fprintf('  SETUP INSTRUCTIONS\n');
    fprintf('================================================================\n');
    fprintf('\n');
    fprintf('The EV Simscape model is loaded. You need to:\n');
    fprintf('\n');
    fprintf('1. In BEVsystemModel, find the BMS output signals:\n');
    fprintf('   - iCellModel (current)\n');
    fprintf('   - vCellModel (voltage)\n');
    fprintf('   - socCellModel (SOC)\n');
    fprintf('   - temperatureCellModel (temperature)\n');
    fprintf('   - numCyclesCellModel (cycles)\n');
    fprintf('   - vParallelAssembly (cell voltages)\n');
    fprintf('   - socParallelAssembly (cell SOCs)\n');
    fprintf('\n');
    fprintf('2. Add a "To Workspace" block or use the script below\n');
    fprintf('   to send data via UDP during simulation.\n');
    fprintf('\n');
    fprintf('3. Alternative: Use the callback-based approach below.\n');
    fprintf('\n');
    fprintf('================================================================\n');
    fprintf('  QUICK START: Run simulation with UDP output\n');
    fprintf('================================================================\n');
    fprintf('\n');
    fprintf('After connecting signals, run:\n');
    fprintf('  run_bms_simulation()\n');
    fprintf('\n');

    %% Close wrapper (keep main model open)
    close_system(wrapperModel, 0);

    fprintf('Setup complete. Model "%s" is loaded.\n', modelName);
end

%% ========================================================================
%  Alternative: Standalone simulation with UDP output
%  Use this if you can't easily modify the Simulink model
%  ========================================================================
function run_bms_simulation()
    %% Configuration
    UDP_IP   = '127.0.0.1';
    UDP_PORT = 5005;
    SIM_TIME = 60;       % seconds
    DT       = 0.05;     % 50ms step

    NUM_CELLS = 11;

    %% Create UDP sender
    u = udpport("byte", "LocalPort", 0);

    fprintf('Sending battery data to %s:%d every %.0fms\n', ...
            UDP_IP, UDP_PORT, DT*1000);
    fprintf('Simulation time: %ds\n', SIM_TIME);
    fprintf('Press Ctrl+C to stop\n\n');

    %% Simple battery model (standalone, no Simscape needed)
    soc = 0.95;
    cycles = 0;
    charging = false;
    t = 0;

    cleanup = onCleanup(@() clear('u'));

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

        % Send as little-endian doubles
        byteData = typecast(packet, 'uint8');
        write(u, byteData, "uint8", UDP_IP, UDP_PORT);

        %% Display
        if mod(round(t / DT), 20) == 0
            fprintf('[t=%6.2fs] I=%+6.2fA V=%6.2fV SOC=%5.1f%% T=%5.1f°C Cyc=%d %s\n', ...
                    t, current, vTotal, soc*100, tempK-273, cycles, ...
                    ternary(charging, 'CHG', 'DIS'));
        end

        t = t + DT;
        pause(DT);
    end

    fprintf('\nSimulation complete.\n');
end

function result = ternary(cond, trueVal, falseVal)
    if cond
        result = trueVal;
    else
        result = falseVal;
    end
end
