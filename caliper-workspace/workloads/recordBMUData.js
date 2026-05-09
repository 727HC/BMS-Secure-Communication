'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

const NUM_PASSPORTS = parseInt(process.env.NUM_PASSPORTS || '50', 10);
const BMU_RECORD_KEYS = parseInt(process.env.BMU_RECORD_KEYS || String(NUM_PASSPORTS), 10);
const BMU_FC_START = parseInt(process.env.BMU_FC_START || '0', 10);
const RUN_ID = process.env.CALIPER_RUN_ID || 'default';
const WRITER_MSPS = (process.env.CALIPER_WRITER_MSPS || process.env.CALIPER_ORG_MSP || '')
    .split(',')
    .map((msp) => msp.trim())
    .filter(Boolean);
const INVOKER_IDENTITY = process.env.CALIPER_INVOKER_IDENTITY || 'admin';

class RecordBMUDataWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.passportIds = [];
        this.dids = [];
        this.fcCounters = {};
        this.txIndex = 0;
        this.invokerMspId = '';
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Worker-exclusive BMU key assignment: the write KPI measures independent
        // valid BMU records, not repeated writes against the same passport high-water key.
        this.invokerMspId = WRITER_MSPS.length > 0 ? WRITER_MSPS[workerIndex % WRITER_MSPS.length] : '';
        for (let i = workerIndex; i < BMU_RECORD_KEYS; i += totalWorkers) {
            const id = `PASSPORT-CALIPER-${RUN_ID}-${String(i).padStart(4, '0')}`;
            const did = `did-caliper-${RUN_ID}-${String(i).padStart(4, '0')}`;
            this.passportIds.push(id);
            this.dids.push(did);
            this.fcCounters[did] = BMU_FC_START;
        }
    }

    async submitTransaction() {
        if (this.passportIds.length === 0) {
            return;
        }

        const idx = this.txIndex % this.passportIds.length;
        const passportId = this.passportIds[idx];
        const did = this.dids[idx];

        this.fcCounters[did]++;
        const fc = this.fcCounters[did];
        this.txIndex++;

        const recordId = `BMU-W${this.workerIndex}-${this.txIndex}-${Date.now()}`;
        const timestamp = new Date().toISOString();
        const soc = Math.floor(Math.random() * 65535);
        const voltage = (35 + Math.random() * 10).toFixed(3);
        const current = (-5 + Math.random() * 10).toFixed(3);
        const temperature = Math.floor(20000 + Math.random() * 20000);
        const dataHash = crypto.createHash('sha256').update(recordId).digest('hex');

        const args = {
            contractId: 'passport-contract',
            contractFunction: 'RecordBMUData',
            contractArguments: [
                recordId, passportId, did,
                dataHash, 'benchSig',
                String(fc), String(soc), voltage, current,
                String(temperature), '96', '0', '0',
                timestamp
            ],
            readOnly: false
        };
        if (this.invokerMspId) {
            args.invokerMspId = this.invokerMspId;
            args.invokerIdentity = INVOKER_IDENTITY;
        }

        await this.sutAdapter.sendRequests(args);
    }
}

function createWorkloadModule() {
    return new RecordBMUDataWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
