'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');
const { keyPrefix, passportIdForIndex, didForIndex } = require('../caliperIds');

function parseSafeIntegerEnv(name, fallback, { min = 0 } = {}) {
    const raw = process.env[name];
    const valueText = raw === undefined || raw === '' ? fallback : raw;
    if (!/^-?\d+$/.test(valueText)) {
        throw new Error(`${name} must be an integer, got ${valueText}`);
    }
    const value = Number(valueText);
    if (!Number.isSafeInteger(value)) {
        throw new Error(`${name} must be a safe integer, got ${valueText}`);
    }
    if (value < min) {
        throw new Error(`${name} must be >= ${min}, got ${value}`);
    }
    return value;
}

const NUM_PASSPORTS = parseSafeIntegerEnv('NUM_PASSPORTS', '50', { min: 1 });
const BMU_RECORD_KEYS = parseSafeIntegerEnv('BMU_RECORD_KEYS', String(NUM_PASSPORTS), { min: 1 });
const BMU_RECORD_KEY_OFFSET = parseSafeIntegerEnv('BMU_RECORD_KEY_OFFSET', '0');
const BMU_FC_START = parseSafeIntegerEnv('BMU_FC_START', '0');
const CALIPER_WRITE_TX_NUMBER = parseSafeIntegerEnv('CALIPER_WRITE_TX_NUMBER', '0');
const RUN_ID = process.env.CALIPER_RUN_ID || 'default';
const AUTO_ID_MODE = String(process.env.CALIPER_RECORD_AUTO_ID || 'false').toLowerCase() === 'true';
const WRITER_MSPS = (process.env.CALIPER_WRITER_MSPS || process.env.CALIPER_ORG_MSP || '')
    .split(',')
    .map((msp) => msp.trim())
    .filter(Boolean);
const INVOKER_IDENTITY = process.env.CALIPER_INVOKER_IDENTITY || 'admin';

function buildFCStringCache() {
    // Official write200 uses CALIPER_WRITE_TX_NUMBER=10000. Precomputing the
    // small decimal string window removes per-submit String(fc) allocation while
    // preserving the exact FC sequence sent to chaincode. Keep the cache as a
    // BMU_FC_START-relative window so reused high-water FC runs do not allocate
    // a sparse array from 0..BMU_FC_START.
    const requestedSpan = Number.isFinite(CALIPER_WRITE_TX_NUMBER) && CALIPER_WRITE_TX_NUMBER > 0 ? CALIPER_WRITE_TX_NUMBER : 1024;
    const cacheSpan = Math.min(requestedSpan, 20000);
    const cacheStart = Math.max(0, BMU_FC_START);
    const fcStrings = new Array(cacheSpan + 1);
    for (let offset = 0; offset <= cacheSpan; offset++) {
        fcStrings[offset] = String(cacheStart + offset);
    }
    return { start: cacheStart, values: fcStrings };
}

class RecordBMUDataWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.fcOffsets = [];
        this.txIndex = 0;
        this.invokerMspId = '';
        this.contractFunction = AUTO_ID_MODE ? 'RecordBMUDataAutoID' : 'RecordBMUData';
        this.fcArgumentIndex = AUTO_ID_MODE ? 4 : 5;
        this.requests = [];
        this.requestArgumentRefs = [];
        this.inFlightSlots = [];
        this.requestCount = 0;
        const fcStringCache = buildFCStringCache();
        this.fcStart = BMU_FC_START;
        this.fcStringCacheStart = fcStringCache.start;
        this.fcStringCacheUsable = this.fcStart === this.fcStringCacheStart;
        this.fcStrings = fcStringCache.values;
        this.initialFCString = this.fcStringCacheUsable ? this.fcStrings[0] : String(this.fcStart);
        this.timestamp = '';
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Worker-exclusive BMU key assignment: the write KPI measures independent
        // valid BMU records, not repeated writes against the same passport high-water key.
        this.invokerMspId = WRITER_MSPS.length > 0 ? WRITER_MSPS[workerIndex % WRITER_MSPS.length] : '';
        const prefix = keyPrefix(RUN_ID);
        const recordEpoch = process.env.CALIPER_RECORD_EPOCH || Date.now().toString(36);
        this.timestamp = new Date().toISOString();
        for (let i = workerIndex; i < BMU_RECORD_KEYS; i += totalWorkers) {
            const keyIndex = BMU_RECORD_KEY_OFFSET + i;
            const id = passportIdForIndex(keyIndex, RUN_ID);
            const did = didForIndex(keyIndex, RUN_ID);
            // Keep FC counters slot-aligned with reusable request templates.
            // The worker assignment already gives each slot an exclusive DID,
            // so an array preserves ledger FC semantics while avoiding
            // per-submit object lookup by a long DID string in the hot path.
            this.fcOffsets.push(0);
            const recordId = `B-CAL-${prefix}-${workerIndex}-${recordEpoch}-${this.requests.length}`;
            const dataHash = crypto.createHash('sha256').update(recordId).digest('hex');

            let contractArguments;
            if (AUTO_ID_MODE) {
                // Official write200 uses the txID-derived record ID path. Keep
                // the reusable argument array separate from the legacy path so
                // submitTransaction only mutates the FC slot.
                contractArguments = [
                    id, did,
                    dataHash, 'benchSig',
                    this.initialFCString, '32768', '40.000', '0.000',
                    '30000', '96', '0', '0',
                    this.timestamp
                ];
            } else {
                contractArguments = [
                    recordId, id, did,
                    dataHash, 'benchSig',
                    this.initialFCString, '32768', '40.000', '0.000',
                    '30000', '96', '0', '0',
                    this.timestamp
                ];
            }

            const request = {
                contractId: 'passport-contract',
                contractFunction: this.contractFunction,
                contractArguments,
                readOnly: false
            };
            if (this.invokerMspId) {
                request.invokerMspId = this.invokerMspId;
                request.invokerIdentity = INVOKER_IDENTITY;
            }
            this.requests.push(request);
            this.requestArgumentRefs.push(contractArguments);
        }
        this.requestCount = this.requests.length;
        this.inFlightSlots = new Uint8Array(this.requestCount);
    }

    async submitTransaction() {
        if (this.requestCount === 0) {
            return;
        }

        // txIndex is maintained as the next slot, not a total counter, so the
        // hot path avoids a modulo operation while keeping the same round-robin
        // passport/DID assignment.
        const idx = this.txIndex;
        const request = this.requests[idx];

        const fcOffset = this.fcOffsets[idx] + 1;
        this.fcOffsets[idx] = fcOffset;
        const nextIndex = idx + 1;
        this.txIndex = nextIndex === this.requestCount ? 0 : nextIndex;

        let fcString = this.fcStringCacheUsable ? this.fcStrings[fcOffset] : undefined;
        if (fcString === undefined) {
            fcString = String(this.fcStart + fcOffset);
        }

        if (this.inFlightSlots[idx] === 1) {
            // Caliper normally awaits each submitTransaction call for a worker,
            // and the official profile has thousands of exclusive slots per
            // worker. Still, keep the reusable template safe if a future rate
            // controller overlaps calls or a tiny selftest reuses one slot
            // while the previous send promise is pending.
            const contractArguments = this.requestArgumentRefs[idx].slice();
            contractArguments[this.fcArgumentIndex] = fcString;
            await this.sutAdapter.sendRequests({
                ...request,
                contractArguments,
            });
            return;
        }

        this.requestArgumentRefs[idx][this.fcArgumentIndex] = fcString;
        this.inFlightSlots[idx] = 1;
        try {
            await this.sutAdapter.sendRequests(request);
        } finally {
            this.inFlightSlots[idx] = 0;
        }
    }
}

function createWorkloadModule() {
    return new RecordBMUDataWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
