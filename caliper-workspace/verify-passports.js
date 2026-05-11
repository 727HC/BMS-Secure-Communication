'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { passportIdForIndex, didForIndex } = require('./caliperIds');
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
const CONCURRENCY = parsePositiveInt(process.env.CALIPER_VERIFY_CONCURRENCY || '50', 'CALIPER_VERIFY_CONCURRENCY');

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
        evaluateOptions: () => ({ deadline: Date.now() + 60_000 }),
    });
    return { gateway, client };
}

function parsePassport(bytes) {
    const text = Buffer.from(bytes || '').toString('utf8');
    return JSON.parse(text);
}

function passportDid(passport) {
    return passport.did || passport.DID || passport.Did;
}

async function main() {
    const { gateway, client } = await newGateway();
    try {
        const network = gateway.getNetwork(CHANNEL_NAME);
        const contract = network.getContract(CHAINCODE_NAME);
        let next = 0;
        let verified = 0;
        const failures = [];

        async function worker() {
            while (next < PASSPORT_COUNT) {
                const index = next;
                next++;
                const passportId = passportIdForIndex(index, RUN_ID);
                const expectedDid = didForIndex(index, RUN_ID);
                try {
                    const result = await contract.evaluateTransaction('QueryPassport', passportId);
                    const passport = parsePassport(result);
                    const actualId = passport.passportId || passport.id || passport.ID || passport.PassportID;
                    const actualDid = passportDid(passport);
                    if (actualId && actualId !== passportId) {
                        throw new Error(`passportId mismatch expected=${passportId} actual=${actualId}`);
                    }
                    if (actualDid !== expectedDid) {
                        throw new Error(`did mismatch expected=${expectedDid} actual=${actualDid || '<empty>'}`);
                    }
                    verified++;
                } catch (err) {
                    failures.push({ index, passportId, error: err.message || String(err) });
                    if (failures.length >= 10) {
                        throw new Error(`too many missing/invalid benchmark passports; first failures=${JSON.stringify(failures)}`);
                    }
                }
            }
        }

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, PASSPORT_COUNT) }, () => worker()));
        if (failures.length > 0) {
            throw new Error(`benchmark passport verification failed: ${JSON.stringify(failures)}`);
        }
        console.log(`[verify-passports] runId=${RUN_ID} channel=${CHANNEL_NAME} passports=${PASSPORT_COUNT} verified=${verified}`);
    } finally {
        gateway.close();
        client.close();
    }
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(`[verify-passports] failed: ${err.stack || err.message || err}`);
        process.exit(1);
    });
