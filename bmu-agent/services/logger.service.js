// Structured JSON logger — outputs NDJSON to stdout and optionally to a log file
// Categories: fabric, bmu, vc, maintenance, analysis, recycling, auth, did, system
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'agent.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB rotation
let logStream = null;
let currentLogSize = 0;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

try {
  if (fs.existsSync(LOG_FILE)) {
    currentLogSize = fs.statSync(LOG_FILE).size;
  }
} catch { /* ignore startup stat errors */ }

function ensureLogStream() {
  if (!logStream) {
    logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  }
  return logStream;
}

function rotateIfNeeded() {
  try {
    if (currentLogSize > MAX_LOG_SIZE) {
      if (logStream) {
        logStream.end();
        logStream = null;
      }
      const rotated = `${LOG_FILE}.${Date.now()}.bak`;
      fs.renameSync(LOG_FILE, rotated);
      currentLogSize = 0;
    }
  } catch { /* ignore rotation errors */ }
}

function writeLog(entry) {
  const line = JSON.stringify(entry);

  // Console output (original behavior preserved)
  if (entry.level === 'error') {
    console.error(line);
  } else if (entry.level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  // File output
  try {
    const payload = line + '\n';
    rotateIfNeeded();
    ensureLogStream().write(payload);
    currentLogSize += Buffer.byteLength(payload);
  } catch { /* ignore file write errors */ }
}

function createLogger(category) {
  function log(level, message, data) {
    writeLog({
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...data,
    });
  }

  return {
    info: (message, data) => log('info', message, data),
    warn: (message, data) => log('warn', message, data),
    error: (message, data) => log('error', message, data),
  };
}

module.exports = { createLogger };
