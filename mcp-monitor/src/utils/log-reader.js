// Read structured JSON logs from agent log file
const fs = require('fs');
const path = require('path');

const LOG_PATH = process.env.LOG_FILE_PATH
  ? path.resolve(__dirname, '..', '..', process.env.LOG_FILE_PATH)
  : path.resolve(__dirname, '..', '..', '..', 'logs', 'agent.log');

// Read last N lines from file without loading entire file into memory.
// Reads from end in chunks until enough newlines are found.
const CHUNK_SIZE = 16 * 1024; // 16KB per read

function readTailLines(filePath, maxLines) {
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const fileSize = stat.size;
    if (fileSize === 0) return [];

    let position = fileSize;
    let remaining = '';
    const lines = [];

    while (position > 0 && lines.length < maxLines) {
      const readSize = Math.min(CHUNK_SIZE, position);
      position -= readSize;
      const buf = Buffer.alloc(readSize);
      fs.readSync(fd, buf, 0, readSize, position);
      remaining = buf.toString('utf8') + remaining;

      const parts = remaining.split('\n');
      // First element is incomplete (unless position === 0)
      remaining = parts.shift();

      for (let i = parts.length - 1; i >= 0 && lines.length < maxLines; i--) {
        if (parts[i]) lines.unshift(parts[i]);
      }
    }

    // Handle leftover at file start
    if (position === 0 && remaining && lines.length < maxLines) {
      lines.unshift(remaining);
    }

    return lines;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function readRecentLogs(count = 100, filter) {
  if (!fs.existsSync(LOG_PATH)) {
    return { error: `Log file not found: ${LOG_PATH}`, logs: [] };
  }

  // When filtering, read more lines to have enough after filtering
  const readCount = filter ? count * 5 : count;
  const lines = readTailLines(LOG_PATH, readCount);

  let logs = [];
  for (const line of lines) {
    try {
      logs.push(JSON.parse(line));
    } catch {
      logs.push({ level: 'raw', message: line, timestamp: null });
    }
  }

  // Apply filter
  if (filter) {
    if (filter.level) logs = logs.filter((l) => l.level === filter.level);
    if (filter.category) logs = logs.filter((l) => l.category === filter.category);
    if (filter.since) {
      const since = new Date(filter.since).getTime();
      logs = logs.filter((l) => l.timestamp && new Date(l.timestamp).getTime() >= since);
    }
  }

  return { total: logs.length, logs: logs.slice(-count) };
}

module.exports = { readRecentLogs, LOG_PATH };
