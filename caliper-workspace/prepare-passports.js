'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');

const NUM_PASSPORTS = parsePositiveInt(process.env.NUM_PASSPORTS || '50', 'NUM_PASSPORTS');
const BMU_RECORD_KEYS = parsePositiveInt(process.env.BMU_RECORD_KEYS || String(NUM_PASSPORTS), 'BMU_RECORD_KEYS');
const PASSPORT_COUNT = Math.max(NUM_PASSPORTS, BMU_RECORD_KEYS);
const RUN_ID = process.env.CALIPER_RUN_ID || 'default';
const MSP_ID = process.env.CALIPER_ORG_MSP;
const CONNECTION_PROFILE = process.env.ORG_CONNPROFILE;
const KEYSTORE = process.env.ORG_KEYSTORE;
const SIGNCERT = process.env.ORG_SIGNCERT;
const CHANNEL_NAME = process.env.CHANNEL_NAME || 'passportchannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'passport-contract';
const CONCURRENCY = parsePositiveInt(process.env.CALIPER_PREPARE_CONCURRENCY || '25', 'CALIPER_PREPARE_CONCURRENCY');
const CHECK_EXISTING = String(process.env.CALIPER_PREPARE_CHECK_EXISTING || 'true').toLowerCase() !== 'false';

function parsePositiveInt(value, name) {
    const parsed = parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${name} must be a positive integer`);
    }
    return parsed;
}

function requireEnv(name, value) {
    if (!value) {
        throw new Error(`${name} is required`);
    }
}

function resolveWorkspacePath(filePath) {
    return path.resolve(process.cwd(), filePath);
}

async function newGrpcClient(profile) {
    const peerName = Object.keys(profile.peers)[0];
    const peer = profile.peers[peerName];
    const endpoint = peer.url.replace(/^grpcs?:\/\//, '');
    const tlsRootCert = Buffer.from(peer.tlsCACerts.pem);
    const override = peer.grpcOptions?.hostnameOverride || peer.grpcOptions?.['ssl-target-name-override'] || peerName;
    const credentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(endpoint, credentials, {
        'grpc.ssl_target_name_override': override,
        'grpc.default_authority': override,
    });
}

async function newGateway() {
    requireEnv('CALIPER_ORG_MSP', MSP_ID);
    requireEnv('ORG_CONNPROFILE', CONNECTION_PROFILE);
    requireEnv('ORG_KEYSTORE', KEYSTORE);
    requireEnv('ORG_SIGNCERT', SIGNCERT);

    const profile = JSON.parse(await fs.readFile(resolveWorkspacePath(CONNECTION_PROFILE), 'utf8'));
    const client = await newGrpcClient(profile);
    const credentials = await fs.readFile(resolveWorkspacePath(SIGNCERT));
    const privateKeyPem = await fs.readFile(resolveWorkspacePath(KEYSTORE));
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    const signer = signers.newPrivateKeySigner(privateKey);

    const gateway = connect({
        client,
        identity: { mspId: MSP_ID, credentials },
        signer,
        endorseOptions: () => ({ deadline: Date.now() + 60_000 }),
        submitOptions: () => ({ deadline: Date.now() + 60_000 }),
        commitStatusOptions: () => ({ deadline: Date.now() + 120_000 }),
        evaluateOptions: () => ({ deadline: Date.now() + 30_000 }),
    });
    return { gateway, client };
}

function passportArgs(index) {
    const suffix = String(index).padStart(4, '0');
    const passportId = passportIdForSuffix(suffix);
    const did = `did-caliper-${RUN_ID}-${suffix}`;
    return [
        passportId, `BATTERY-${passportId}`, did,
        'BenchModel', `SN-${index}`,
        'BenchMfg', 'KR',
        'BenchCell', 'KR',
        '2026-01-01', 'Prismatic', 'NMC',
        '96', '450', '77',
        '172', '200', '3000',
        '280', '20',
        '1',
    ];
}

function passportIdForSuffix(suffix) {
    return `PASSPORT-CALIPER-${RUN_ID}-${suffix}`;
}

function errorText(err) {
    return [
        err?.message,
        err?.details,
        err?.cause?.message,
        JSON.stringify(err?.details || ''),
    ].filter(Boolean).join('\n');
}

function isAlreadyExistsError(err) {
    return errorText(err).includes('already exists');
}

function isMissingPassportError(err) {
    const text = errorText(err);
    return text.includes('does not exist') || text.includes('not found');
}

async function main() {
    const { gateway, client } = await newGateway();
    try {
        const network = gateway.getNetwork(CHANNEL_NAME);
        const contract = network.getContract(CHAINCODE_NAME);
        let next = 0;
        let created = 0;
        let existed = 0;

        async function worker() {
            while (next < PASSPORT_COUNT) {
                const index = next;
                next++;
                const suffix = String(index).padStart(4, '0');
                const passportId = passportIdForSuffix(suffix);
                try {
                    if (CHECK_EXISTING) {
                        try {
                            await contract.evaluateTransaction('QueryPassport', passportId);
                            existed++;
                            continue;
                        } catch (err) {
                            if (!isMissingPassportError(err)) {
                                throw err;
                            }
                        }
                    }
                    await contract.submitTransaction('CreateBatteryPassport', ...passportArgs(index));
                    created++;
                } catch (err) {
                    if (isAlreadyExistsError(err)) {
                        existed++;
                        continue;
                    }
                    throw err;
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, PASSPORT_COUNT) }, () => worker()));
        console.log(`[prepare-passports] runId=${RUN_ID} passports=${PASSPORT_COUNT} queryKeys=${NUM_PASSPORTS} bmuKeys=${BMU_RECORD_KEYS} created=${created} existed=${existed}`);
    } finally {
        gateway.close();
        client.close();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(`[prepare-passports] failed: ${err.stack || err.message || err}`);
        process.exit(1);
    });
