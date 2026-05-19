#!/usr/bin/env node
'use strict';

const assert = require('assert');

const workloadPath = require.resolve('../caliper-workspace/workloads/recordBMUData');

function withEnv(overrides, fn) {
    const previous = {};
    for (const key of Object.keys(overrides)) {
        previous[key] = process.env[key];
        process.env[key] = overrides[key];
    }
    try {
        return fn();
    } finally {
        for (const key of Object.keys(overrides)) {
            if (previous[key] === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = previous[key];
            }
        }
    }
}

async function collectRequests({ autoId, fcStart = '0', txNumber = '5' }) {
    delete require.cache[workloadPath];
    return withEnv({
        NUM_PASSPORTS: '4',
        BMU_RECORD_KEYS: '4',
        BMU_RECORD_KEY_OFFSET: '0',
        BMU_FC_START: fcStart,
        CALIPER_WRITE_TX_NUMBER: txNumber,
        CALIPER_RUN_ID: 'selftest',
        CALIPER_RECORD_EPOCH: 'epoch',
        CALIPER_RECORD_AUTO_ID: autoId ? 'true' : 'false',
        CALIPER_WRITER_MSPS: 'ManufacturerMSP,EVManufacturerMSP',
    }, async () => {
        const workload = require(workloadPath).createWorkloadModule();
        const requests = [];
        const refs = [];
        const sutAdapter = {
            sendRequests: async (args) => {
                refs.push(args);
                requests.push(JSON.parse(JSON.stringify(args)));
            },
        };
        await workload.initializeWorkloadModule(0, 2, 0, {}, sutAdapter, {});
        for (let i = 0; i < 5; i++) {
            await workload.submitTransaction();
        }
        return {
            requests,
            refs,
            fcStringCacheStart: workload.fcStringCacheStart,
            fcStringCacheLength: workload.fcStrings.length,
        };
    });
}

function assertRoundRobinSuffixes(requests, passportArgIndex) {
    assert.deepStrictEqual(
        requests.map((request) => request.contractArguments[passportArgIndex].endsWith('0000') ? '0' : '2'),
        ['0', '2', '0', '2', '0'],
    );
}

function assertRequestTemplateReuse(refs) {
    assert.strictEqual(refs.length, 5);
    assert.strictEqual(refs[0], refs[2]);
    assert.strictEqual(refs[0], refs[4]);
    assert.strictEqual(refs[1], refs[3]);
    assert.notStrictEqual(refs[0], refs[1]);
}

function assertInvalidEnv(overrides, expectedMessage) {
    delete require.cache[workloadPath];
    assert.throws(
        () => withEnv(overrides, () => require(workloadPath)),
        (err) => err instanceof Error && err.message.includes(expectedMessage),
    );
    delete require.cache[workloadPath];
}

async function collectConcurrentSingleSlotRequests() {
    delete require.cache[workloadPath];
    return withEnv({
        NUM_PASSPORTS: '1',
        BMU_RECORD_KEYS: '1',
        BMU_RECORD_KEY_OFFSET: '0',
        BMU_FC_START: '0',
        CALIPER_WRITE_TX_NUMBER: '2',
        CALIPER_RUN_ID: 'selftest',
        CALIPER_RECORD_EPOCH: 'epoch',
        CALIPER_RECORD_AUTO_ID: 'true',
    }, async () => {
        const workload = require(workloadPath).createWorkloadModule();
        const requests = [];
        const pending = [];
        const sutAdapter = {
            sendRequests: async (args) => new Promise((resolve) => {
                pending.push(() => {
                    requests.push(JSON.parse(JSON.stringify(args)));
                    resolve();
                });
            }),
        };
        await workload.initializeWorkloadModule(0, 1, 0, {}, sutAdapter, {});

        const first = workload.submitTransaction();
        const second = workload.submitTransaction();
        assert.strictEqual(pending.length, 2);
        pending[0]();
        pending[1]();
        await Promise.all([first, second]);
        return requests;
    });
}

(async () => {
    assertInvalidEnv({ BMU_RECORD_KEYS: '0' }, 'BMU_RECORD_KEYS must be >= 1');
    assertInvalidEnv({ BMU_FC_START: 'not-a-number' }, 'BMU_FC_START must be an integer');
    assertInvalidEnv({ CALIPER_WRITE_TX_NUMBER: '1.5' }, 'CALIPER_WRITE_TX_NUMBER must be an integer');

    const autoCollected = await collectRequests({ autoId: true });
    const auto = autoCollected.requests;
    assert.strictEqual(auto.length, 5);
    assert(auto.every((request) => request.contractFunction === 'RecordBMUDataAutoID'));
    assert(auto.every((request) => request.contractArguments.length === 13));
    assert.deepStrictEqual(auto.map((request) => request.contractArguments[4]), ['1', '1', '2', '2', '3']);
    assert.strictEqual(autoCollected.fcStringCacheStart, 0);
    assert.strictEqual(autoCollected.fcStringCacheLength, 6);
    assertRoundRobinSuffixes(auto, 0);
    assertRequestTemplateReuse(autoCollected.refs);

    const legacyCollected = await collectRequests({ autoId: false });
    const legacy = legacyCollected.requests;
    assert.strictEqual(legacy.length, 5);
    assert(legacy.every((request) => request.contractFunction === 'RecordBMUData'));
    assert(legacy.every((request) => request.contractArguments.length === 14));
    assert.deepStrictEqual(legacy.map((request) => request.contractArguments[5]), ['1', '1', '2', '2', '3']);
    assertRoundRobinSuffixes(legacy, 1);
    assert(legacy[0].contractArguments[0].startsWith('B-CAL-'));
    assertRequestTemplateReuse(legacyCollected.refs);

    const highFcCollected = await collectRequests({ autoId: true, fcStart: '500000', txNumber: '5' });
    assert.deepStrictEqual(highFcCollected.requests.map((request) => request.contractArguments[4]), ['500001', '500001', '500002', '500002', '500003']);
    assert.strictEqual(highFcCollected.fcStringCacheStart, 500000);
    assert.strictEqual(highFcCollected.fcStringCacheLength, 6);

    const shortCacheCollected = await collectRequests({ autoId: true, fcStart: '10', txNumber: '1' });
    assert.deepStrictEqual(shortCacheCollected.requests.map((request) => request.contractArguments[4]), ['11', '11', '12', '12', '13']);
    assert.strictEqual(shortCacheCollected.fcStringCacheStart, 10);
    assert.strictEqual(shortCacheCollected.fcStringCacheLength, 2);

    const concurrent = await collectConcurrentSingleSlotRequests();
    assert.deepStrictEqual(concurrent.map((request) => request.contractArguments[4]), ['1', '2']);
    assert.notStrictEqual(concurrent[0].contractArguments, concurrent[1].contractArguments);

    console.log('caliper BMU workload sequence selftest passed');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
