const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const bs58 = require("bs58").default;
const nacl = require("tweetnacl");
const { Gateway, Wallets } = require("fabric-network");
const FabricCAServices = require("fabric-ca-client");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// 설정 (환경변수 우선)
const ACA_PY_URL = process.env.ACA_PY_URL || "http://localhost:8031";
const DEFAULT_BMU_DID = process.env.DEFAULT_BMU_DID || null;
const FABRIC_IDENTITY = process.env.FABRIC_IDENTITY || "admin";
// [A2-01] CA 패스워드 환경변수 분리
const FABRIC_ADMIN_SECRET = process.env.FABRIC_ADMIN_SECRET || "REMOVED_SECRET_ROTATED_2026_04_18";
const CCP_PATH = process.env.FABRIC_CCP_PATH || path.resolve(
  process.env.HOME,
  "bms-blockchain/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json"
);
const WALLET_PATH = process.env.FABRIC_WALLET_PATH || path.join(__dirname, "wallet");
const CHANNEL = process.env.FABRIC_CHANNEL || "bmschannel";
const CONTRACT = process.env.FABRIC_CONTRACT || "bms-contract";
const MSP = process.env.FABRIC_MSP || "Org1MSP";
const CA_HOSTNAME = process.env.FABRIC_CA_HOSTNAME || "ca.org1.example.com";

let gateway = null;
let contract = null;

// Fabric 연결
async function connectFabric() {
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, "utf8"));
  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

  const adminIdentity = await wallet.get(FABRIC_IDENTITY);
  if (!adminIdentity) {
    console.log(`Enrolling ${FABRIC_IDENTITY}...`);
    const caInfo = ccp.certificateAuthorities
      ? ccp.certificateAuthorities[CA_HOSTNAME]
      : null;

    if (caInfo) {
      // [B-01] TLS 검증: 기본 활성화, 개발 시에만 FABRIC_TLS_VERIFY=false로 비활성화
      const caTLSCACerts = caInfo.tlsCACerts?.pem;
      const tlsOptions = caTLSCACerts
        ? { trustedRoots: caTLSCACerts, verify: process.env.FABRIC_TLS_VERIFY !== "false" }
        : undefined;
      const ca = new FabricCAServices(caInfo.url, tlsOptions, caInfo.caName);
      const enrollment = await ca.enroll({
        enrollmentID: FABRIC_IDENTITY,
        enrollmentSecret: FABRIC_ADMIN_SECRET,
      });
      const identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: MSP,
        type: "X.509",
      };
      await wallet.put(FABRIC_IDENTITY, identity);
      console.log(`${FABRIC_IDENTITY} enrolled via CA`);
    } else {
      // [A2-03] cryptogen 모드: keystore에서 첫 번째 키 파일 자동 선택
      const orgPath = path.dirname(path.dirname(CCP_PATH));
      const certPath = path.join(
        orgPath,
        "users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem"
      );
      const keyDir = path.join(
        orgPath,
        "users/Admin@org1.example.com/msp/keystore"
      );
      const keyFiles = fs.readdirSync(keyDir);
      const keyPath = path.join(keyDir, keyFiles[0]);

      const certificate = fs.readFileSync(certPath, "utf8");
      const privateKey = fs.readFileSync(keyPath, "utf8");

      const identity = {
        credentials: { certificate, privateKey },
        mspId: MSP,
        type: "X.509",
      };
      await wallet.put(FABRIC_IDENTITY, identity);
      console.log("Admin identity loaded from cryptogen certs");
    }
  }

  gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: FABRIC_IDENTITY,
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gateway.getNetwork(CHANNEL);
  contract = network.getContract(CONTRACT);
  console.log(`Connected to Fabric: ${CHANNEL}/${CONTRACT}`);
}

function isHex(str) {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0;
}

function decodeSignature(signature) {
  if (isHex(signature)) {
    return Buffer.from(signature, "hex");
  }
  return Buffer.from(signature, "base64");
}

async function verifySignature(did, verifyTarget, signature) {
  const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
    params: { did },
  });
  const publicKey = bs58.decode(verkeyRes.data.verkey);
  const msgBytes = Buffer.isBuffer(verifyTarget) ? verifyTarget : Buffer.from(verifyTarget);
  const sigBytes = decodeSignature(signature);
  return nacl.sign.detached.verify(msgBytes, sigBytes, publicKey);
}

// POST /data — BMU 배터리 데이터 기록
app.post("/data", async (req, res) => {
  const { fc, soc, temperature, dataHash, signature, rawPayload } = req.body;
  const did = req.body.did || DEFAULT_BMU_DID;

  if (fc === undefined || fc === null || !dataHash) {
    return res.status(400).json({ error: "fc, dataHash required" });
  }

  if (!did) {
    return res.status(400).json({
      error: "did required (set DEFAULT_BMU_DID env or send did in request)"
    });
  }

  try {
    if (signature && signature !== "none") {
      const verifyTarget = rawPayload
        ? Buffer.from(rawPayload, "hex")
        : dataHash;
      const isValid = await verifySignature(did, verifyTarget, signature);
      if (!isValid) {
        return res.status(401).json({ error: "signature verification failed" });
      }
    }

    const finalHash = rawPayload
      ? crypto.createHash("sha256").update(Buffer.from(rawPayload, "hex")).digest("hex")
      : dataHash;

    const id = `bms-${Date.now()}-${fc}`;
    const sig = signature || "none";
    const socVal = (soc !== undefined && soc !== null) ? soc : 0;
    const timestamp = new Date().toISOString();

    // [B-02] Fabric 연결 끊김 시 1회 재연결 시도
    try {
      await contract.submitTransaction(
        "RecordBMSData", id, finalHash, did, sig,
        String(fc), String(socVal), timestamp
      );
    } catch (txErr) {
      console.warn("Fabric TX failed, attempting reconnect:", txErr.message);
      await connectFabric();
      await contract.submitTransaction(
        "RecordBMSData", id, finalHash, did, sig,
        String(fc), String(socVal), timestamp
      );
    }

    console.log(`Recorded: ${id} FC=${fc} SOC=${socVal}`);
    res.json({ success: true, id, onChain: true });
  } catch (err) {
    console.error("Record failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/query/:id", async (req, res) => {
  try {
    const result = await contract.evaluateTransaction("QueryBMSData", req.params.id);
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get("/query-all", async (req, res) => {
  try {
    const result = await contract.evaluateTransaction("QueryAllBMSData");
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/status", (req, res) => {
  res.json({
    fabric: contract ? "connected" : "disconnected",
    channel: CHANNEL,
    contract: CONTRACT,
  });
});

// [A2-05] 프로세스 종료 시 Gateway 정리
async function shutdown() {
  if (gateway) {
    await gateway.disconnect();
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// 서버 시작
const PORT = process.env.PORT || 3001;
connectFabric()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`BMS Agent running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect:", err);
    process.exit(1);
  });
