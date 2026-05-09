'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

const NUM_PASSPORTS = parseInt(process.env.NUM_PASSPORTS || '50', 10);
const BMU_RECORD_KEYS = parseInt(process.env.BMU_RECORD_KEYS || String(NUM_PASSPORTS), 10);
const RUN_ID = process.env.CALIPER_RUN_ID || 'default';
const READER_MSP = process.env.CALIPER_READER_MSP || process.env.CALIPER_ORG_MSP || '';
const INVOKER_IDENTITY = process.env.CALIPER_INVOKER_IDENTITY || 'admin';

class QueryPassportWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.passportIds = [];
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Build passport ID list prepared before the benchmark round.
        const queryKeys = Math.max(NUM_PASSPORTS, BMU_RECORD_KEYS);
        for (let i = 0; i < queryKeys; i++) {
            this.passportIds.push(`PASSPORT-CALIPER-${RUN_ID}-${String(i).padStart(4, '0')}`);
        }
    }

    async submitTransaction() {
        const idx = Math.floor(Math.random() * this.passportIds.length);
        const passportId = this.passportIds[idx];

        const args = {
            contractId: 'passport-contract',
            contractFunction: 'QueryPassport',
            contractArguments: [passportId],
            readOnly: true
        };
        if (READER_MSP) {
            args.invokerMspId = READER_MSP;
            args.invokerIdentity = INVOKER_IDENTITY;
        }

        await this.sutAdapter.sendRequests(args);
    }
}

function createWorkloadModule() {
    return new QueryPassportWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
