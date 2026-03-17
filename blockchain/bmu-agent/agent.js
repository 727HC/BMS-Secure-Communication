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

const FABRIC_CCP_PATH = process.env.FABRIC_CCP_PATH || path.resolve(
  process.env.HOME,
  'bms-blockchain/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
)
const FABRIC_WALLET_PATH = process.env.FABRIC_WALLET_PATH || path.join(__dirname, 'wallet')
const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'bmschannel'
const FABRIC_CONTRACT = process.env.FABRIC_CONTRACT || 'bms-contract'

const app = express()
app.use(express.json())

// MongoDB 연결
mongoose.connect(MONGO_URL)
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

// Uint8Array → Base58 문자열
function toBase58(buffer) {
  return bs58.encode(buffer)
}

// Base58 문자열 → Uint8Array
function fromBase58(str) {
  return bs58.decode(str)
}

// hex 문자열 판별
function isHex(str) {
  return /^[0-9A-Fa-f]+$/.test(str) && str.length % 2 === 0
}

// 서명 바이트 디코딩 (hex 우선, fallback base64)
function decodeSignature(signature) {
  if (isHex(signature)) {
    return Buffer.from(signature, 'hex')
  }
  return Buffer.from(signature, 'base64')
}

//DID 원장 등록 API
app.post('/did/register', async (req, res) => {
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

// 공개키 조회 (#5 수정: Base58 문자열로 반환)
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

//메시지 서명 검증
app.post('/verify-signature', async (req, res) => {
  const { did, msg, signature } = req.body

  if (!did || !msg || !signature) {
    return res.status(400).json({ error: 'did, msg, signature 모두 필요함' })
  }

  try {
    const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
      params: { did }
    })
    const verkey = verkeyRes.data.verkey
    const publicKey = bs58.decode(verkey)
    const msgBytes = Buffer.from(msg)
    const signatureBytes = decodeSignature(signature)
    const valid = nacl.sign.detached.verify(msgBytes, signatureBytes, publicKey)

    res.json({ valid })
  } catch (err) {
    console.error('검증 실패:', err.message)
    res.status(500).json({ error: '검증 실패', detail: err.message })
  }
})

// Fabric 저장 함수 (#1 수정: 체인코드 시그니처와 인자 일치)
async function recordToFabric(id, dataHash, did, signature, fc, soc, timestamp) {
  const ccp = JSON.parse(fs.readFileSync(FABRIC_CCP_PATH, 'utf8'))

  const wallet = await Wallets.newFileSystemWallet(FABRIC_WALLET_PATH)
  const gateway = new Gateway()
  await gateway.connect(ccp, {
    wallet,
    identity: 'admin',
    discovery: { enabled: true, asLocalhost: true }
  })

  const network = await gateway.getNetwork(FABRIC_CHANNEL)
  const contract = network.getContract(FABRIC_CONTRACT)

  await contract.submitTransaction(
    'RecordBMSData', id, dataHash, did, signature,
    String(fc), String(soc), timestamp
  )
  console.log('Fabric 저장 완료:', id)
  await gateway.disconnect()
}

// POST /data
app.post('/data', async (req, res) => {
  const { did, cid, msg, signature, timestamp, fc, soc } = req.body

  if (!did || !cid || !msg || !signature || !timestamp) {
    return res.status(400).json({ error: 'did, cid, msg, signature, timestamp 모두 필요함' })
  }

  try {
    // 1. verkey 조회
    const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
      params: { did }
    })
    const verkey = verkeyRes.data.verkey

    // 2. 서명 검증
    const publicKey = bs58.decode(verkey)
    const signatureBytes = decodeSignature(signature)
    const msgBytes = Buffer.from(msg)

    const isValid = nacl.sign.detached.verify(msgBytes, signatureBytes, publicKey)
    if (!isValid) {
      return res.status(401).json({ valid: false, error: '서명 검증 실패' })
    }

    // 3. MongoDB 저장
    await Verifiedmsg.create({
      did,
      cid,
      msg,
      signature,
      timestamp: new Date(timestamp)
    })

    // 4. Fabric 저장 (체인코드 인자 7개 일치)
    const dataHash = crypto.createHash('sha256').update(msg).digest('hex')
    const id = `bms-${Date.now()}-${cid}`
    await recordToFabric(id, dataHash, did, signature, fc || 0, soc || 0, timestamp)

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

// 서버 시작
app.listen(PORT, () => {
  console.log(`Agent Proxy Server running at http://localhost:${PORT}`)
})
