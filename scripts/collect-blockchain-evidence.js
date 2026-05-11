#!/usr/bin/env node
'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROFILE = 'PassportBenchmarkChannel';
const DEFAULT_PROFILE_EXPECTED_BATCH_TIMEOUT = '4s';
const DEFAULT_PROFILE_EXPECTED_MAX_MESSAGE_COUNT = 2000;
const DEFAULT_PROFILE_EXPECTED_PREFERRED_MAX_BYTES = 4194304;
const MODES = new Set(['benchmark-safe', 'evaluation-dday']);
const PROVENANCE = new Set(['channel-bound', 'independent-service-benchmark']);
const FABRIC_BIN = path.join(ROOT, 'fabric-samples', 'bin');
const FABRIC_CFG_PATH = path.join(ROOT, 'passport-network', 'compose', 'docker', 'peercfg');
const FABRIC_ENV = { PATH: `${FABRIC_BIN}:${process.env.PATH || ''}`, FABRIC_CFG_PATH };

function parseArgs(argv) {
  const args = {
    mode: 'benchmark-safe',
    profile: DEFAULT_PROFILE,
    dryRun: false,
    readProvenance: 'independent-service-benchmark',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--mode': args.mode = requireValue(argv, ++i, arg); break;
      case '--channel': args.channel = requireValue(argv, ++i, arg); break;
      case '--profile': args.profile = requireValue(argv, ++i, arg); break;
      case '--run-id': args.runId = requireValue(argv, ++i, arg); break;
      case '--write-log': args.writeLog = requireValue(argv, ++i, arg); break;
      case '--read-log': args.readLog = requireValue(argv, ++i, arg); break;
      case '--out': args.out = requireValue(argv, ++i, arg); break;
      case '--read-provenance': args.readProvenance = requireValue(argv, ++i, arg); break;
      case '--fabric-channel': args.fabricChannel = requireValue(argv, ++i, arg); break;
      case '--cloud-health-url': args.cloudHealthUrl = requireValue(argv, ++i, arg); break;
      case '--dry-run': args.dryRun = true; break;
      case '-h':
      case '--help':
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!args.channel) throw new Error('--channel is required');
  if (!args.runId) args.runId = `${args.mode}-${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`;
  if (!args.fabricChannel) {
    args.fabricChannel = args.readProvenance === 'channel-bound' ? args.channel : 'independent-read-model';
  }
  if (!args.out) args.out = path.join(ROOT, '.omx', 'evidence', 'blockchain', args.runId);
  if (!args.cloudHealthUrl) args.cloudHealthUrl = 'http://localhost:3002/health';
  return args;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function usage() {
  console.log(`Usage: node scripts/collect-blockchain-evidence.js --mode <benchmark-safe|evaluation-dday> --channel <name> --profile PassportBenchmarkChannel [options]\n\nOptions:\n  --run-id <id>\n  --write-log <path>\n  --read-log <path>\n  --out <directory>\n  --read-provenance <channel-bound|independent-service-benchmark>\n  --fabric-channel <channel-or-independent-read-model>\n  --dry-run`);
}

function validateArgs(args) {
  if (!MODES.has(args.mode)) throw new Error(`mode invariant violation: ${args.mode}`);
  if (!PROVENANCE.has(args.readProvenance)) throw new Error(`readModelProvenance invariant violation: ${args.readProvenance}`);
  if (args.profile !== DEFAULT_PROFILE) throw new Error(`profile invariant violation: ${args.profile}`);
  if (args.mode === 'benchmark-safe' && args.channel === 'passportchannel') {
    throw new Error('benchmark-safe invariant violation: channel.name must not be passportchannel');
  }
  if (args.mode === 'evaluation-dday' && args.channel !== 'passportchannel') {
    throw new Error('evaluation-dday invariant violation: channel.name must be passportchannel');
  }
  if (args.readProvenance === 'channel-bound' && args.fabricChannel !== args.channel) {
    throw new Error('cloud provenance invariant violation: channel-bound fabricChannel must equal channel.name');
  }
  if (args.mode === 'benchmark-safe' && args.channel !== 'passportchannel' && args.readProvenance === 'channel-bound' && args.fabricChannel === 'passportchannel') {
    throw new Error('cloud provenance invariant violation: generated-channel evidence cannot use default passportchannel read model');
  }
}

function safeExec(cmd, cmdArgs, opts = {}) {
  const command = [cmd, ...cmdArgs].join(' ');
  try {
    const stdout = execFileSync(cmd, cmdArgs, {
      cwd: opts.cwd || ROOT,
      timeout: opts.timeout || 10000,
      encoding: 'utf8',
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, command, stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err) {
    return {
      ok: false,
      command,
      stdout: String(err.stdout || '').trim(),
      stderr: String(err.stderr || err.message || '').trim(),
      exitCode: typeof err.status === 'number' ? err.status : 1,
    };
  }
}

function safeShell(command, opts = {}) {
  try {
    const stdout = execSync(command, {
      cwd: opts.cwd || ROOT,
      timeout: opts.timeout || 15000,
      encoding: 'utf8',
      env: { ...process.env, ...(opts.env || {}) },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: '/bin/bash',
    });
    return { ok: true, command, stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (err) {
    return {
      ok: false,
      command,
      stdout: String(err.stdout || '').trim(),
      stderr: String(err.stderr || err.message || '').trim(),
      exitCode: typeof err.status === 'number' ? err.status : 1,
    };
  }
}

function fabricPeerShell(peerCommand) {
  return safeShell(
    [
      `export PATH="${FABRIC_BIN}:$PATH"`,
      `export FABRIC_CFG_PATH="${FABRIC_CFG_PATH}"`,
      `cd "${path.join(ROOT, 'passport-network')}"`,
      'export NETWORK_HOME="$PWD" VERBOSE=false',
      '. scripts/envVar.sh',
      'setGlobals 1 >/dev/null',
      peerCommand,
    ].join('; '),
    { timeout: 20000 },
  );
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function writeText(file, content) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, content || '', 'utf8');
}

async function copyLog(source, destDir, fallbackName) {
  await ensureDir(destDir);
  if (!source) return { path: '', sha256: '', status: 'not-provided' };
  const absolute = path.resolve(ROOT, source);
  const dest = path.join(destDir, path.basename(source) || fallbackName);
  try {
    await fsp.copyFile(absolute, dest);
    const hash = crypto.createHash('sha256').update(await fsp.readFile(dest)).digest('hex');
    return { path: relative(dest), sha256: hash, status: 'copied' };
  } catch (err) {
    const marker = `${dest}.missing.txt`;
    await writeText(marker, `missing log: ${source}\n${err.message}\n`);
    return { path: relative(marker), sha256: '', status: 'missing' };
  }
}

function relative(file) {
  return path.relative(ROOT, file);
}

function parseWriteMetrics(text) {
  const plan = /Write:\s*(\d+)\s*tx\s*@\s*([\d.]+)\s*TPS/i.exec(text || '');
  const planned = plan ? { txNumber: Number(plan[1]), targetTps: Number(plan[2]) } : {};
  const summary = /write-bmu-data:\s*Succ\s+(\d+)\s*\/\s*Fail\s+(\d+)\s*\/\s*Send Rate\s+([\d.]+)\s*TPS\s*\/.*?Throughput\s+([\d.]+)\s*TPS\s*\/\s*Succ-only\s+([\d.]+)\s*TPS/i.exec(text || '');
  if (summary) {
    return {
      ...planned,
      succ: Number(summary[1]),
      fail: Number(summary[2]),
      sendRateTps: Number(summary[3]),
      throughputTps: Number(summary[4]),
      succOnlyTps: Number(summary[5]),
    };
  }
  const table = /write-bmu-data\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+).*?\|\s*([\d.]+)\s*\|?\s*$/im.exec(text || '');
  if (table) {
    return { ...planned, succ: Number(table[1]), fail: Number(table[2]), sendRateTps: Number(table[3]), throughputTps: Number(table[4]) };
  }
  return planned;
}

function parseReadMetrics(text) {
  const tps = /CLOUD READ TPS:\s*([\d.]+)/i.exec(text || '');
  const completed = /Completed:\s*(\d+),\s*Errors:\s*(\d+)/i.exec(text || '');
  return {
    throughputTps: tps ? Number(tps[1]) : undefined,
    completed: completed ? Number(completed[1]) : undefined,
    errors: completed ? Number(completed[2]) : undefined,
  };
}

function parsePeerHeight(raw) {
  const match = /"height":\s*(\d+)/.exec(raw || '');
  return match ? Number(match[1]) : undefined;
}

function parseSyncMeta(raw) {
  if (!raw) return {};
  const block = /blockNumber:\s*(\d+)/.exec(raw) || /"blockNumber"\s*:\s*(\d+)/.exec(raw);
  const channel = /channel:\s*'([^']+)'/.exec(raw) || /"channel"\s*:\s*"([^"]+)"/.exec(raw);
  const runId = /runId:\s*'([^']+)'/.exec(raw) || /"runId"\s*:\s*"([^"]+)"/.exec(raw);
  return {
    lastBlock: block ? Number(block[1]) : undefined,
    channel: channel ? channel[1] : undefined,
    runId: runId ? runId[1] : undefined,
  };
}

function parseCloudHealth(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readDecodedChannelConfig(configPath) {
  if (!fs.existsSync(configPath)) return {};
  try {
    const decoded = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const orderer = decoded?.data?.data?.[0]?.payload?.data?.config?.channel_group?.groups?.Orderer;
    const values = orderer?.values || {};
    const batchTimeout = values.BatchTimeout?.value?.timeout;
    const batchSize = values.BatchSize?.value;
    return {
      batchTimeout,
      maxMessageCount: parseMaybeNumber(batchSize?.max_message_count),
      preferredMaxBytes: parseMaybeNumber(batchSize?.preferred_max_bytes),
      absoluteMaxBytes: parseMaybeNumber(batchSize?.absolute_max_bytes),
    };
  } catch {
    return {};
  }
}

function validateDecodedChannelConfig({ args, decodeConfig, actualChannelConfig }) {
  if (args.dryRun) return;

  const missing = [];
  if (!decodeConfig.ok) missing.push('decodeStatus');
  if (!actualChannelConfig.batchTimeout) missing.push('batchTimeout');
  if (!Number.isFinite(actualChannelConfig.maxMessageCount)) missing.push('maxMessageCount');
  if (!Number.isFinite(actualChannelConfig.preferredMaxBytes)) missing.push('preferredMaxBytes');

  if (missing.length > 0) {
    throw new Error(`channel config invariant violation: ${missing.join(', ')} unavailable`);
  }
}

function parseMaybeNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validateCloudProvenance({ args, cloudHealth, syncMeta, healthRequired }) {
  if (args.readProvenance !== 'channel-bound') {
    return { status: 'independent-service-benchmark', healthFabricChannel: cloudHealth.fabricChannel };
  }

  if (healthRequired && !cloudHealth.fabricChannel) {
    throw new Error('cloud provenance invariant violation: /health fabricChannel is required for channel-bound evidence');
  }
  if (cloudHealth.fabricChannel && cloudHealth.fabricChannel !== args.channel) {
    throw new Error(`cloud provenance invariant violation: /health fabricChannel ${cloudHealth.fabricChannel} != ${args.channel}`);
  }
  if (cloudHealth.readModelProvenance && cloudHealth.readModelProvenance !== 'channel-bound') {
    throw new Error(`cloud provenance invariant violation: /health readModelProvenance ${cloudHealth.readModelProvenance} != channel-bound`);
  }
  if (syncMeta.channel && syncMeta.channel !== args.channel) {
    throw new Error(`cloud provenance invariant violation: syncMetaChannel ${syncMeta.channel} != ${args.channel}`);
  }
  return {
    status: cloudHealth.fabricChannel ? 'verified' : 'dry-run-unverified',
    healthFabricChannel: cloudHealth.fabricChannel,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateArgs(args);

  const outDir = path.resolve(ROOT, args.out);
  const logsDir = path.join(outDir, 'logs');
  const artifactsDir = path.join(outDir, 'artifacts');
  await ensureDir(logsDir);
  await ensureDir(artifactsDir);

  const commands = [];
  const runCommand = async (key, runner, rawPath) => {
    const result = runner();
    commands.push({ step: key, command: result.command, exitCode: result.exitCode, ok: result.ok });
    await writeText(path.join(outDir, rawPath), [result.stdout, result.stderr].filter(Boolean).join('\n'));
    return result;
  };

  const gitCommit = safeExec('git', ['rev-parse', 'HEAD']);
  const gitStatus = safeExec('git', ['status', '--porcelain']);
  const fabricPeer = safeExec('peer', ['version'], { timeout: 5000, env: FABRIC_ENV });
  const configtxgen = safeExec('configtxgen', ['--version'], { timeout: 5000, env: FABRIC_ENV });
  const docker = safeExec('docker', ['--version'], { timeout: 5000 });
  const dockerCompose = safeShell('docker compose version', { timeout: 5000 });
  const caliper = safeShell('cd caliper-workspace && (npx caliper --version || node -p "require(\'./package.json\').devDependencies?.[\'@hyperledger/caliper-cli\'] || require(\'./package.json\').dependencies?.[\'@hyperledger/caliper-cli\'] || \'unknown\'")', { timeout: 10000 });

  const writeLogCopy = await copyLog(args.writeLog, logsDir, 'caliper.log');
  const readLogCopy = await copyLog(args.readLog, logsDir, 'cloud-read.log');
  const writeLogText = writeLogCopy.status === 'copied' ? await fsp.readFile(path.join(ROOT, writeLogCopy.path), 'utf8') : '';
  const readLogText = readLogCopy.status === 'copied' ? await fsp.readFile(path.join(ROOT, readLogCopy.path), 'utf8') : '';

  const peerHeight = await runCommand('peer-height', () => fabricPeerShell(`peer channel getinfo -c "${args.channel}"`), 'logs/peer-height.txt');
  const queryCommitted = await runCommand('querycommitted', () => fabricPeerShell(`peer lifecycle chaincode querycommitted -C "${args.channel}" -n passport-contract`), 'logs/querycommitted.txt');
  const mongoSync = await runCommand('mongo-sync', () => safeExec('docker', ['exec', 'mongodb-passport', 'mongosh', 'battery_passport', '--quiet', '--eval', `printjson(db.getCollection("_sync_meta").findOne({_id:"lastBlock:${args.fabricChannel}"}) || db.getCollection("_sync_meta").findOne({_id:"lastBlock"}) || db.getCollection("_sync_meta").findOne({_id:"initialSync:${args.fabricChannel}"}))`], { timeout: 10000 }), 'logs/mongo-sync.txt');
  const healthUrl = new URL(args.cloudHealthUrl);
  const cloudHealth = await runCommand('cloud-health', () => safeExec('curl', ['-fsS', '--max-time', '3', healthUrl.toString()], { timeout: 5000 }), 'logs/cloud-health.json');

  const fetchConfig = await runCommand('fetch-channel-config', () => {
    if (args.dryRun) return { ok: true, command: `DRY-RUN fetch config for ${args.channel}`, stdout: 'dry-run', stderr: '', exitCode: 0 };
    return fabricPeerShell(`peer channel fetch config "${path.join(artifactsDir, `${args.channel}_config.block`)}" -o localhost:7050 --ordererTLSHostnameOverride orderer.battery.com -c "${args.channel}" --tls --cafile "$ORDERER_CA"`);
  }, 'logs/channel-config-fetch.txt');

  const decodeConfig = await runCommand('decode-channel-config', () => {
    const blockPath = path.join(artifactsDir, `${args.channel}_config.block`);
    const jsonPath = path.join(artifactsDir, `${args.channel}_config.json`);
    if (args.dryRun || !fs.existsSync(blockPath)) return { ok: args.dryRun, command: `DRY-RUN decode config for ${args.channel}`, stdout: args.dryRun ? 'dry-run' : 'config block missing', stderr: '', exitCode: args.dryRun ? 0 : 1 };
    return safeShell(`export PATH="${FABRIC_BIN}:$PATH"; configtxlator proto_decode --input "${blockPath}" --type common.Block --output "${jsonPath}"`, { timeout: 20000 });
  }, 'logs/channel-config-decode.txt');

  const syncMeta = parseSyncMeta(mongoSync.stdout || mongoSync.stderr);
  const cloudHealthBody = parseCloudHealth(cloudHealth.stdout);
  const cloudProvenance = validateCloudProvenance({
    args,
    cloudHealth: cloudHealthBody,
    syncMeta,
    healthRequired: !args.dryRun,
  });
  const actualChannelConfig = readDecodedChannelConfig(path.join(artifactsDir, `${args.channel}_config.json`));
  validateDecodedChannelConfig({ args, decodeConfig, actualChannelConfig });

  const evidence = {
    schemaVersion: 1,
    runId: args.runId,
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    repo: {
      commit: gitCommit.stdout || '',
      statusPorcelain: gitStatus.stdout || '',
    },
    versions: {
      fabricPeer: fabricPeer.stdout || fabricPeer.stderr || '',
      fabricConfigtxgen: configtxgen.stdout || configtxgen.stderr || '',
      caliper: caliper.stdout || caliper.stderr || '',
      docker: docker.stdout || docker.stderr || '',
      dockerCompose: dockerCompose.stdout || dockerCompose.stderr || '',
    },
    channel: {
      name: args.channel,
      profile: args.profile,
      invariants: [
        'benchmark-safe: channel.name != passportchannel',
        'evaluation-dday: channel.name == passportchannel',
        'evaluation-dday: channel.profile == PassportBenchmarkChannel',
      ],
      configBlockPath: relative(path.join(artifactsDir, `${args.channel}_config.block`)),
      decodedConfigJsonPath: relative(path.join(artifactsDir, `${args.channel}_config.json`)),
      batchTimeout: actualChannelConfig.batchTimeout,
      maxMessageCount: actualChannelConfig.maxMessageCount,
      preferredMaxBytes: actualChannelConfig.preferredMaxBytes,
      absoluteMaxBytes: actualChannelConfig.absoluteMaxBytes,
      expectedBatchTimeout: args.profile === DEFAULT_PROFILE ? DEFAULT_PROFILE_EXPECTED_BATCH_TIMEOUT : undefined,
      expectedMaxMessageCount: args.profile === DEFAULT_PROFILE ? DEFAULT_PROFILE_EXPECTED_MAX_MESSAGE_COUNT : undefined,
      expectedPreferredMaxBytes: args.profile === DEFAULT_PROFILE ? DEFAULT_PROFILE_EXPECTED_PREFERRED_MAX_BYTES : undefined,
      fetchStatus: fetchConfig.ok ? 'ok' : 'failed',
      decodeStatus: decodeConfig.ok ? 'ok' : 'failed',
    },
    chaincode: {
      queryCommittedRawPath: 'logs/querycommitted.txt',
      name: 'passport-contract',
      endorsementPolicy: "OR('ManufacturerMSP.peer','EVManufacturerMSP.peer','ServiceMSP.peer','RegulatorMSP.peer')",
      queryCommittedStatus: queryCommitted.ok ? 'ok' : 'failed',
    },
    ledger: {
      peerHeightRawPath: 'logs/peer-height.txt',
      height: parsePeerHeight(peerHeight.stdout),
      status: peerHeight.ok ? 'ok' : 'failed',
    },
    mongoSync: {
      lastBlock: syncMeta.lastBlock,
      rawPath: 'logs/mongo-sync.txt',
      channel: syncMeta.channel,
      runId: syncMeta.runId,
      status: mongoSync.ok ? 'ok' : 'failed',
    },
    cloud: {
      healthUrl: healthUrl.toString(),
      healthRawPath: 'logs/cloud-health.json',
      status: cloudHealth.ok ? 'ok' : 'failed',
      fabricChannel: args.fabricChannel,
      healthFabricChannel: cloudHealthBody.fabricChannel,
      readModelProvenance: args.readProvenance,
      healthReadModelProvenance: cloudHealthBody.readModelProvenance,
      provenanceStatus: cloudProvenance.status,
      syncMetaRawPath: 'logs/mongo-sync.txt',
      syncMetaChannel: syncMeta.channel,
      syncMetaRunId: syncMeta.runId,
    },
    benchmarks: {
      write: {
        tool: 'Caliper',
        logPath: writeLogCopy.path,
        logSha256: writeLogCopy.sha256,
        logStatus: writeLogCopy.status,
        txNumber: Number(process.env.CALIPER_WRITE_TX_NUMBER || 10000),
        targetTps: Number(process.env.CALIPER_WRITE_TARGET_TPS || 300),
        ...parseWriteMetrics(writeLogText),
      },
      read: {
        tool: 'scripts/tps-benchmark-cloud.js',
        logPath: readLogCopy.path,
        logSha256: readLogCopy.sha256,
        logStatus: readLogCopy.status,
        ...parseReadMetrics(readLogText),
      },
    },
    commands,
    dryRun: args.dryRun,
  };

  const evidenceJson = path.join(outDir, 'evidence.json');
  const evidenceMd = path.join(outDir, 'evidence.md');
  await writeText(evidenceJson, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeText(evidenceMd, renderMarkdown(evidence));
  console.log(`Evidence bundle: ${relative(outDir)}`);
}

function renderMarkdown(e) {
  return `# Blockchain Evidence — ${e.runId}\n\n` +
    `- Mode: \`${e.mode}\`\n` +
    `- Channel: \`${e.channel.name}\`\n` +
    `- Profile: \`${e.channel.profile}\`\n` +
    `- Commit: \`${e.repo.commit}\`\n` +
    `- Read provenance: \`${e.cloud.readModelProvenance}\` / \`${e.cloud.fabricChannel}\`\n` +
    `- Write TPS: \`${e.benchmarks.write.throughputTps ?? 'unknown'}\` / Succ-only \`${e.benchmarks.write.succOnlyTps ?? 'unknown'}\`\n` +
    `- Read TPS: \`${e.benchmarks.read.throughputTps ?? 'unknown'}\`\n` +
    `- Peer height: \`${e.ledger.height ?? 'unknown'}\`\n` +
    `- Mongo lastBlock: \`${e.mongoSync.lastBlock ?? 'unknown'}\`\n\n` +
    `## Artifacts\n` +
    `- Write log: \`${e.benchmarks.write.logPath}\` (${e.benchmarks.write.logStatus}, sha256: \`${e.benchmarks.write.logSha256 || 'n/a'}\`)\n` +
    `- Read log: \`${e.benchmarks.read.logPath}\` (${e.benchmarks.read.logStatus}, sha256: \`${e.benchmarks.read.logSha256 || 'n/a'}\`)\n` +
    `- Query committed: \`${e.chaincode.queryCommittedRawPath}\`\n` +
    `- Peer height: \`${e.ledger.peerHeightRawPath}\`\n` +
    `- Mongo sync: \`${e.mongoSync.rawPath}\`\n` +
    `- Cloud health: \`${e.cloud.healthRawPath}\`\n` +
    `- Config block: \`${e.channel.configBlockPath}\`\n` +
    `- Decoded config: \`${e.channel.decodedConfigJsonPath}\`\n`;
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
