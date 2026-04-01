// Tool 4: System Status Monitoring
const { execSync } = require('child_process');
const axios = require('axios');
const fabricClient = require('../utils/fabric-client');

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3001';
const VON_URL = process.env.VON_URL || 'http://localhost:9000';
const ACAPY_URL = process.env.ACAPY_ADMIN_URL || 'http://localhost:8031';

// Expected Docker containers for the BMS blockchain platform
const EXPECTED_CONTAINERS = {
  fabric: [
    'peer0.manufacturer.battery.com',
    'peer0.evmanufacturer.battery.com',
    'peer0.service.battery.com',
    'peer0.regulator.battery.com',
    'orderer.battery.com',
    'ca_manufacturer',
    'ca_evmanufacturer',
    'ca_service',
    'ca_regulator',
    'ca_orderer',
  ],
  von: ['von-webserver-1', 'von-node1-1', 'von-node2-1', 'von-node3-1', 'von-node4-1'],
  acapy: ['acapy-bmu'],
};

function runCommand(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim();
  } catch {
    return null;
  }
}

function getDockerContainers() {
  const output = runCommand('docker ps --format "{{.Names}}\\t{{.Status}}\\t{{.Ports}}\\t{{.Image}}"');
  if (!output) return [];

  return output.split('\n').filter(Boolean).map((line) => {
    const [name, status, ports, image] = line.split('\t');
    return { name, status, ports, image, running: status?.includes('Up') };
  });
}

function categorizeContainer(name) {
  for (const [category, patterns] of Object.entries(EXPECTED_CONTAINERS)) {
    if (patterns.some((p) => name.includes(p))) {
      return category;
    }
  }
  if (name.includes('couchdb') || name.includes('couch')) return 'fabric';
  return 'other';
}

async function checkAgentStatus(verbose) {
  try {
    const res = await axios.get(`${AGENT_URL}/api/status`, { timeout: 5000 });
    return {
      status: 'running',
      url: AGENT_URL,
      fabric: res.data.fabric,
      channel: res.data.channel,
      contract: res.data.contract,
      org: res.data.org,
      ...(verbose ? { raw: res.data } : {}),
    };
  } catch (err) {
    return {
      status: 'down',
      url: AGENT_URL,
      error: err.code || err.message,
    };
  }
}

async function checkVonStatus(verbose) {
  try {
    const res = await axios.get(`${VON_URL}/status`, { timeout: 5000 });
    return {
      status: 'running',
      url: VON_URL,
      ...(verbose ? { raw: res.data } : {}),
    };
  } catch {
    // VON might not have /status — try root
    try {
      const res = await axios.get(VON_URL, { timeout: 5000 });
      return {
        status: 'running',
        url: VON_URL,
        note: 'Root accessible, /status not available',
      };
    } catch (err) {
      return { status: 'down', url: VON_URL, error: err.code || err.message };
    }
  }
}

async function checkAcaPyStatus(verbose) {
  try {
    const res = await axios.get(`${ACAPY_URL}/status`, { timeout: 5000 });
    return {
      status: 'running',
      url: ACAPY_URL,
      version: res.data?.version,
      ...(verbose ? { raw: res.data } : {}),
    };
  } catch (err) {
    return { status: 'down', url: ACAPY_URL, error: err.code || err.message };
  }
}

async function checkFabricStatus(verbose) {
  const containers = getDockerContainers();
  const fabricContainers = containers.filter((c) => categorizeContainer(c.name) === 'fabric');

  const peers = fabricContainers.filter((c) => c.name.includes('peer0'));
  const orderers = fabricContainers.filter((c) => c.name.includes('orderer'));
  const cas = fabricContainers.filter((c) => c.name.startsWith('ca_'));
  const couchdbs = fabricContainers.filter((c) => c.name.includes('couchdb') || c.name.includes('couch'));

  // Check Fabric connectivity via the client
  let fabricConnected = false;
  try {
    await fabricClient.evaluate('QueryPassportsWithPagination', '1', '');
    fabricConnected = true;
  } catch { /* ignore */ }

  const result = {
    connected: fabricConnected,
    peers: peers.map((c) => ({ name: c.name, status: c.running ? 'up' : 'down', uptime: c.status })),
    orderers: orderers.map((c) => ({ name: c.name, status: c.running ? 'up' : 'down', uptime: c.status })),
    cas: cas.map((c) => ({ name: c.name, status: c.running ? 'up' : 'down', uptime: c.status })),
    couchdb: couchdbs.map((c) => ({ name: c.name, status: c.running ? 'up' : 'down' })),
    totalContainers: fabricContainers.length,
    allHealthy: fabricContainers.every((c) => c.running),
  };

  if (verbose) {
    result.allContainers = fabricContainers;
  }

  // Missing containers check
  const runningNames = fabricContainers.map((c) => c.name);
  const missing = EXPECTED_CONTAINERS.fabric.filter(
    (expected) => !runningNames.some((r) => r.includes(expected))
  );
  if (missing.length > 0) {
    result.missing = missing;
    result.allHealthy = false;
  }

  return result;
}

async function execute(params) {
  const { action, verbose = false } = params;

  switch (action) {
    case 'overview': {
      const [agent, fabric, von, acapy] = await Promise.all([
        checkAgentStatus(verbose),
        checkFabricStatus(verbose),
        checkVonStatus(verbose),
        checkAcaPyStatus(verbose),
      ]);

      const containers = getDockerContainers();
      const totalUp = containers.filter((c) => c.running).length;

      return {
        action: 'overview',
        timestamp: new Date().toISOString(),
        summary: {
          agent: agent.status,
          fabric: fabric.allHealthy ? 'healthy' : 'degraded',
          fabricConnected: fabric.connected,
          von: von.status,
          acapy: acapy.status,
          dockerContainers: `${totalUp}/${containers.length} running`,
        },
        details: { agent, fabric, von, acapy },
      };
    }

    case 'fabric': {
      return {
        action: 'fabric',
        timestamp: new Date().toISOString(),
        ...(await checkFabricStatus(verbose)),
      };
    }

    case 'von': {
      return {
        action: 'von',
        timestamp: new Date().toISOString(),
        ...(await checkVonStatus(verbose)),
        containers: getDockerContainers()
          .filter((c) => categorizeContainer(c.name) === 'von')
          .map((c) => ({ name: c.name, status: c.running ? 'up' : 'down', uptime: c.status })),
      };
    }

    case 'acapy': {
      return {
        action: 'acapy',
        timestamp: new Date().toISOString(),
        ...(await checkAcaPyStatus(verbose)),
        containers: getDockerContainers()
          .filter((c) => categorizeContainer(c.name) === 'acapy')
          .map((c) => ({ name: c.name, status: c.running ? 'up' : 'down', uptime: c.status })),
      };
    }

    case 'agent': {
      const agentStatus = await checkAgentStatus(verbose);

      // Check node process
      const nodeProcs = runCommand("ps aux | grep 'node.*server.js' | grep -v grep");
      agentStatus.process = nodeProcs ? {
        running: true,
        info: nodeProcs.split('\n')[0],
      } : { running: false };

      return {
        action: 'agent',
        timestamp: new Date().toISOString(),
        ...agentStatus,
      };
    }

    case 'docker': {
      const containers = getDockerContainers();
      const categorized = {};

      for (const c of containers) {
        const cat = categorizeContainer(c.name);
        if (!categorized[cat]) categorized[cat] = [];
        categorized[cat].push({
          name: c.name,
          status: c.running ? 'up' : 'down',
          uptime: c.status,
          image: verbose ? c.image : undefined,
          ports: verbose ? c.ports : undefined,
        });
      }

      return {
        action: 'docker',
        timestamp: new Date().toISOString(),
        totalContainers: containers.length,
        running: containers.filter((c) => c.running).length,
        stopped: containers.filter((c) => !c.running).length,
        categories: categorized,
      };
    }

    default:
      return { error: `Unknown action: ${action}` };
  }
}

module.exports = { execute };
