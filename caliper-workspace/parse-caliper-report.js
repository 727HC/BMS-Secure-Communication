'use strict';

const fs = require('fs');

const reportPath = process.argv[2] || 'report.html';
const html = fs.readFileSync(reportPath, 'utf8');
const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

function findRow(name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rowPattern = new RegExp(`${escaped}\\s+(\\d+)\\s+(\\d+)\\s+([0-9.]+)\\s+([0-9.-]+)\\s+([0-9.-]+)\\s+([0-9.-]+)\\s+([0-9.]+)`);
    const match = text.match(rowPattern);
    if (!match) {
        return null;
    }
    return {
        name,
        succ: Number(match[1]),
        fail: Number(match[2]),
        sendRate: Number(match[3]),
        maxLatency: Number(match[4]),
        minLatency: Number(match[5]),
        avgLatency: Number(match[6]),
        throughput: Number(match[7]),
    };
}

const rows = ['write-bmu-data', 'read-passport']
    .map(findRow)
    .filter(Boolean);

if (rows.length === 0) {
    console.error(`[parse-caliper-report] no benchmark rows found in ${reportPath}`);
    process.exit(1);
}

console.log('=== Caliper Summary ===');
for (const row of rows) {
    const succOnlyTps = row.succ + row.fail > 0 ? (row.throughput * row.succ / (row.succ + row.fail)) : 0;
    console.log(`${row.name}: Succ ${row.succ} / Fail ${row.fail} / Send Rate ${row.sendRate} TPS / Avg Latency ${row.avgLatency}s / Throughput ${row.throughput} TPS / Succ-only ${succOnlyTps.toFixed(1)} TPS`);
}
