const express = require('express')
const axios = require('axios')
const bs58 = require('bs58').default
const nacl = require('tweetnacl')
const mongoose = require('mongoose')
const crypto = require('crypto')
const { Gateway, Wallets } = require('fabric-network')
const path = require('path')
const fs = require('fs')

// 설정 (환경변수 우선)
const ACA_PY_URL = process.env.ACA_PY_URL || 'http://localhost:8031'
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/signatures'
const PORT = process.env.PORT || 3000
const FABRIC_IDENTITY = process.env.FABRIC_IDENTITY || 'admin'

const FABRIC_CCP_PATH = process.env.FABRIC_CCP_PATH || path.resolve(
  process.env.HOME,
  'bms-blockchain/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
)
const FABRIC_WALLET_PATH = process.env.FABRIC_WALLET_PATH || path.join(__dirname, 'wallet')
const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'bmschannel'
const FABRIC_CONTRACT = process.env.FABRIC_CONTRACT || 'bms-contract'

let fabricGateway = null
let fabricContract = null

const app = express()
app.use(express.json())

// [A1-01] MongoDB 연결 + 오류 핸들링
mongoose.connect(MONGO_URL).catch(err => {
  console.error('MongoDB 연결 실패:', err.message)
  process.exit(1)
})
const db = mongoose.connection
db.once('open', () => console.log('MongoDB connected'))

const verifiedmsgSchema = new mongoose.Schema({
  did: { type: String, required: true },
  cid: { type: String, required: true },
  msg: { type: String, required: true },
  signature: { type: String, required: true },
  timestamp: { type: Date, required: true },
  verifiedAt: { type: Date, default: Date.now }
})

const Verifiedmsg = mongoose.model('Verifiedmsg', verifiedmsgSchema)

function toBase58(buffer) {
  return bs58.encode(buffer)
}

function isHex(str) {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0
}

function decodeSignature(signature) {
  if (isHex(signature)) {
    return Buffer.from(signature, 'hex')
  }
  return Buffer.from(signature, 'base64')
}

// [BC-10] DID 등록 API — ADMIN_API_KEY 설정 시 인증 필수
app.post('/did/register', async (req, res) => {
  const adminKey = process.env.ADMIN_API_KEY
  if (adminKey && req.headers['x-api-key'] !== adminKey) {
    return res.status(403).json({ error: 'Forbidden: invalid or missing x-api-key' })
  }
  const { did, verkey: rawVerkey, role } = req.body
  const verkey = typeof rawVerkey === 'string' ? rawVerkey : toBase58(Uint8Array.from(rawVerkey))
  try {
    const response = await axios.post(`${ACA_PY_URL}/ledger/register-nym`, {
      did,
      verkey,
      role: role || null
    })
    res.json({ success: true, ledgerResult: response.data })
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message })
  }
})

// 공개키 조회
app.get('/verkey/:did', async (req, res) => {
  const { did } = req.params
  try {
    const response = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
      params: { did }
    })
    res.json({
      did,
      verkey: response.data.verkey,
      encoding: 'base58'
    })
  } catch (error) {
    console.error('오류:', error.message)
    res.status(500).json({ error: '공개키 조회 실패', detail: error.message })
  }
})

// 메시지 서명 검증
app.post('/verify-signature', async (req, res) => {
  const { did, msg, signature } = req.body

  if (!did || !msg || !signature) {
    return res.status(400).json({ error: 'did, msg, signature 모두 필요함' })
  }

  try {
    const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
      params: { did }
    })
    const publicKey = bs58.decode(verkeyRes.data.verkey)
    const msgBytes = Buffer.from(msg)
    const signatureBytes = decodeSignature(signature)
    const valid = nacl.sign.detached.verify(msgBytes, signatureBytes, publicKey)
    res.json({ valid })
  } catch (err) {
    console.error('검증 실패:', err.message)
    res.status(500).json({ error: '검증 실패', detail: err.message })
  }
})

// [B-03] Fabric Gateway 모듈 레벨 재사용 (매 요청마다 재생성 제거)
async function connectFabric() {
  const ccp = JSON.parse(fs.readFileSync(FABRIC_CCP_PATH, 'utf8'))
  const wallet = await Wallets.newFileSystemWallet(FABRIC_WALLET_PATH)
  fabricGateway = new Gateway()
  await fabricGateway.connect(ccp, {
    wallet,
    identity: FABRIC_IDENTITY,
    discovery: { enabled: true, asLocalhost: true }
  })
  const network = await fabricGateway.getNetwork(FABRIC_CHANNEL)
  fabricContract = network.getContract(FABRIC_CONTRACT)
  console.log(`Fabric connected: ${FABRIC_CHANNEL}/${FABRIC_CONTRACT}`)
}

// [BC-05] Fabric 재연결 로직 포함
async function recordToFabric(id, dataHash, did, signature, fc, soc, timestamp) {
  try {
    await fabricContract.submitTransaction(
      'RecordBMSData', id, dataHash, did, signature,
      String(fc), String(soc), timestamp
    )
  } catch (txErr) {
    console.warn('Fabric TX failed, reconnecting:', txErr.message)
    await connectFabric()
    await fabricContract.submitTransaction(
      'RecordBMSData', id, dataHash, did, signature,
      String(fc), String(soc), timestamp
    )
  }
  console.log('Fabric 저장 완료:', id)
}

// POST /data
app.post('/data', async (req, res) => {
  const { did, cid, msg, signature, timestamp, fc, soc } = req.body

  if (!did || !cid || !msg || !signature || !timestamp) {
    return res.status(400).json({ error: 'did, cid, msg, signature, timestamp 모두 필요함' })
  }

  // [BC-03] Fabric 미연결 시 요청 거부 (DB/원장 불일치 방지)
  if (!fabricContract) {
    return res.status(503).json({ error: 'Fabric not connected' })
  }

  try {
    const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
      params: { did }
    })
    const publicKey = bs58.decode(verkeyRes.data.verkey)
    const signatureBytes = decodeSignature(signature)
    const msgBytes = Buffer.from(msg)

    const isValid = nacl.sign.detached.verify(msgBytes, signatureBytes, publicKey)
    if (!isValid) {
      return res.status(401).json({ valid: false, error: '서명 검증 실패' })
    }

    // Fabric 저장 먼저 시도 (실패 시 MongoDB도 저장하지 않음)
    const fcVal = (fc !== undefined && fc !== null) ? fc : 0
    const socVal = (soc !== undefined && soc !== null) ? soc : 0
    const dataHash = crypto.createHash('sha256').update(msg).digest('hex')
    const id = `bms-${Date.now()}-${cid}`
    await recordToFabric(id, dataHash, did, signature, fcVal, socVal, timestamp)

    await Verifiedmsg.create({
      did, cid, msg, signature,
      timestamp: new Date(timestamp)
    })

    res.json({ valid: true, saved: true, onChain: true, id })
  } catch (err) {
    console.error('오류:', err.message)
    res.status(500).json({ error: '내부 오류', detail: err.message })
  }
})

// 상태 확인
app.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${ACA_PY_URL}/status`)
    res.json(response.data)
  } catch (err) {
    res.status(500).json({ error: 'ACA-Py 연결 실패' })
  }
})

// [BC-04] 프로세스 종료 시 Gateway 정리
async function shutdown() {
  if (fabricGateway) await fabricGateway.disconnect()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// 서버 시작
connectFabric()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Agent Proxy Server running at http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Fabric connection failed:', err.message)
    console.log('Starting without Fabric (DID/signature API only)')
    app.listen(PORT, () => {
      console.log(`Agent Proxy Server running at http://localhost:${PORT} (no Fabric)`)
    })
  })
