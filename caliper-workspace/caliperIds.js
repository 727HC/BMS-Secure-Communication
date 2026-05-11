'use strict';

const crypto = require('crypto');

function keyPrefix(runId = process.env.CALIPER_RUN_ID || 'default') {
    return process.env.CALIPER_KEY_PREFIX || crypto.createHash('sha1').update(runId).digest('hex').slice(0, 8);
}

function keySuffix(index) {
    return String(index).padStart(4, '0');
}

function passportIdForIndex(index, runId = process.env.CALIPER_RUN_ID || 'default') {
    return `P-CAL-${keyPrefix(runId)}-${keySuffix(index)}`;
}

function didForIndex(index, runId = process.env.CALIPER_RUN_ID || 'default') {
    return `did:cal:${keyPrefix(runId)}:${keySuffix(index)}`;
}

module.exports = {
    keyPrefix,
    keySuffix,
    passportIdForIndex,
    didForIndex,
};
