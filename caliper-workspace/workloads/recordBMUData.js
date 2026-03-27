'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

const NUM_PASSPORTS = 50;

class RecordBMUDataWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.passportIds = [];
        this.dids = [];
        this.fcCounters = {};
        this.txIndex = 0;
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Build passport/DID lists (must match what queryPassport workload created)
        for (let i = 0; i < NUM_PASSPORTS; i++) {
            const id = `PASSPORT-CALIPER-${String(i).padStart(3, '0')}`;
            const did = `did-caliper-${String(i).padStart(3, '0')}`;
            this.passportIds.push(id);
            this.dids.push(did);
            // FC counter per DID, offset by worker to avoid collision
            this.fcCounters[did] = workerIndex * 1000000;
        }

        // Worker 0 creates passports if they don't exist yet (idempotent)
        if (workerIndex === 0) {
            for (let i = 0; i < NUM_PASSPORTS; i++) {
                const args = {
                    contractId: 'passport-contract',
                    contractFunction: 'CreateBatteryPassport',
                    contractArguments: [
                        this.passportIds[i], `BATTERY-${this.passportIds[i]}`, this.dids[i],
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
                    // Already exists, OK
                }
            }
        }
    }

    async submitTransaction() {
        const idx = Math.floor(Math.random() * NUM_PASSPORTS);
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

        await this.sutAdapter.sendRequests(args);
    }
}

function createWorkloadModule() {
    return new RecordBMUDataWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
