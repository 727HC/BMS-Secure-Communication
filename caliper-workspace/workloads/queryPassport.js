'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

const NUM_PASSPORTS = parseInt(process.env.NUM_PASSPORTS || '50', 10);

class QueryPassportWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.passportIds = [];
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Build passport ID list (passports already created by write round)
        for (let i = 0; i < NUM_PASSPORTS; i++) {
            this.passportIds.push(`PASSPORT-CALIPER-${String(i).padStart(4, '0')}`);
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

        await this.sutAdapter.sendRequests(args);
    }
}

function createWorkloadModule() {
    return new QueryPassportWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
