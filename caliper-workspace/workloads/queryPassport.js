'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

const NUM_PASSPORTS = 50;

class QueryPassportWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.passportIds = [];
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Worker 0 creates passports, others wait
        if (workerIndex === 0) {
            for (let i = 0; i < NUM_PASSPORTS; i++) {
                const id = `PASSPORT-CALIPER-${String(i).padStart(3, '0')}`;
                const did = `did-caliper-${String(i).padStart(3, '0')}`;
                this.passportIds.push(id);

                const args = {
                    contractId: 'passport-contract',
                    contractFunction: 'CreateBatteryPassport',
                    contractArguments: [
                        id, `BATTERY-${id}`, did,
                        'BenchModel', `SN-${i}`,
                        'BenchMfg', 'KR',
                        'BenchCell', 'KR',
                        '2026-01-01', 'Prismatic', 'NMC',
                        '96', '450', '77',
                        '172', '200', '3000',
                        '280', '20',
                        '1'
                    ],
                    readOnly: false
                };

                try {
                    await this.sutAdapter.sendRequests(args);
                } catch (e) {
                    // Passport may already exist
                }
            }
        }

        // All workers build passport ID list
        this.passportIds = [];
        for (let i = 0; i < NUM_PASSPORTS; i++) {
            this.passportIds.push(`PASSPORT-CALIPER-${String(i).padStart(3, '0')}`);
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
