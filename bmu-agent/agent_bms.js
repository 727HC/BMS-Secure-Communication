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

// Fabric 연결 (#3 수정: CA enroll 경로 추가)
async function connectFabric() {
  const ccp = JSON.parse(fs.readFileSync(CCP_PATH, "utf8"));
  const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

  const adminIdentity = await wallet.get("admin");
  if (!adminIdentity) {
    console.log("Enrolling admin...");
    const caInfo = ccp.certificateAuthorities
      ? ccp.certificateAuthorities[CA_HOSTNAME]
      : null;

    if (caInfo) {
      // CA 모드: fabric-ca-client로 admin enroll
      const caTLSCACerts = caInfo.tlsCACerts?.pem;
      const ca = new FabricCAServices(
        caInfo.url,
        caTLSCACerts ? { trustedRoots: caTLSCACerts, verify: false } : undefined,
        caInfo.caName
      );
      const enrollment = await ca.enroll({
        enrollmentID: "admin",
        enrollmentSecret: "adminpw",
      });
      const identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: MSP,
        type: "X.509",
      };
      await wallet.put("admin", identity);
      console.log("Admin enrolled via CA");
    } else {
      // cryptogen 모드: 직접 인증서 로드
      const orgPath = path.dirname(path.dirname(CCP_PATH));
      const certPath = path.join(
        orgPath,
        "users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem"
      );
      const keyDir = path.join(
        orgPath,
        "users/Admin@org1.example.com/msp/keystore"
      );
      const keyPath = path.join(keyDir, "priv_sk");

      const certificate = fs.readFileSync(certPath, "utf8");
      const privateKey = fs.readFileSync(keyPath, "utf8");

      const identity = {
        credentials: { certificate, privateKey },
        mspId: MSP,
        type: "X.509",
      };
      await wallet.put("admin", identity);
      console.log("Admin identity loaded from cryptogen certs");
    }
  }

  gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: "admin",
    discovery: { enabled: true, asLocalhost: true },
  });

  const network = await gateway.getNetwork(CHANNEL);
  contract = network.getContract(CONTRACT);
  console.log(`Connected to Fabric: ${CHANNEL}/${CONTRACT}`);
}

// 서명 검증 헬퍼 (#2 수정: 서명 검증 후 저장)
async function verifySignature(did, dataHash, signature) {
  const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
    params: { did },
  });
  const publicKey = bs58.decode(verkeyRes.data.verkey);
  const msgBytes = Buffer.from(dataHash);
  const sigBytes = Buffer.from(signature, "base64");
  return nacl.sign.detached.verify(msgBytes, sigBytes, publicKey);
}

// POST /data — BMU 배터리 데이터 기록
app.post("/data", async (req, res) => {
  const { did, fc, soc, temperature, dataHash, signature } = req.body;

  // #4 수정: fc=0 허용, undefined/null만 거부
  if (fc === undefined || fc === null || !dataHash) {
    return res.status(400).json({ error: "fc, dataHash required" });
  }

  if (!did) {
    return res.status(400).json({ error: "did required" });
  }

  try {
    // 서명 검증 (signature가 있으면 반드시 검증)
    if (signature && signature !== "none") {
      const isValid = await verifySignature(did, dataHash, signature);
      if (!isValid) {
        return res.status(401).json({ error: "signature verification failed" });
      }
    }

    const id = `bms-${Date.now()}-${fc}`;
    const sig = signature || "none";
    const socVal = soc || 0;
    const timestamp = new Date().toISOString();

    await contract.submitTransaction(
      "RecordBMSData",
      id,
      dataHash,
      did,
      sig,
      String(fc),
      String(socVal),
      timestamp
    );

    console.log(`Recorded: ${id} FC=${fc} SOC=${socVal}`);
    res.json({ success: true, id, onChain: true });
  } catch (err) {
    console.error("Record failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /query/:id — 데이터 조회
app.get("/query/:id", async (req, res) => {
  try {
    const result = await contract.evaluateTransaction(
      "QueryBMSData",
      req.params.id
    );
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /query-all — 전체 조회
app.get("/query-all", async (req, res) => {
  try {
    const result = await contract.evaluateTransaction("QueryAllBMSData");
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /status
app.get("/status", (req, res) => {
  res.json({
    fabric: contract ? "connected" : "disconnected",
    channel: CHANNEL,
    contract: CONTRACT,
  });
});

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
