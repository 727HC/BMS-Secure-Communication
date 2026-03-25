// Structured JSON logger — outputs NDJSON to stdout and optionally to a log file
// Categories: fabric, bmu, vc, maintenance, analysis, recycling, auth, did, system
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '..', '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'agent.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB rotation

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function rotateIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size > MAX_LOG_SIZE) {
        const rotated = `${LOG_FILE}.${Date.now()}.bak`;
        fs.renameSync(LOG_FILE, rotated);
      }
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
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, line + '\n');
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
