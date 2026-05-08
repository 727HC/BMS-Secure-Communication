'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

const NUM_PASSPORTS = parseInt(process.env.NUM_PASSPORTS || '50', 10);
const RUN_ID = process.env.CALIPER_RUN_ID || 'default';

class RecordBMUDataWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.passportIds = [];
        this.dids = [];
        this.fcCounters = {};
        this.lastSubmitByDid = {};
        this.txIndex = 0;
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);

        // Worker-exclusive passport assignment: striding keeps every worker valid
        // even when NUM_PASSPORTS is not divisible by totalWorkers.
        for (let i = workerIndex; i < NUM_PASSPORTS; i += totalWorkers) {
            const id = `PASSPORT-CALIPER-${RUN_ID}-${String(i).padStart(4, '0')}`;
            const did = `did-caliper-${RUN_ID}-${String(i).padStart(4, '0')}`;
            this.passportIds.push(id);
            this.dids.push(did);
            this.fcCounters[did] = 0;
        }

        // Each worker creates only its own passports
        for (let i = 0; i < this.passportIds.length; i++) {
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

        const previous = this.lastSubmitByDid[did] || Promise.resolve();
        const submitPromise = previous.then(() => this.sutAdapter.sendRequests(args));
        this.lastSubmitByDid[did] = submitPromise.catch(() => {});
        await submitPromise;
    }
}

function createWorkloadModule() {
    return new RecordBMUDataWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
