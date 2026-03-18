const nacl = require('tweetnacl')
const bs58 = require('bs58').default
const axios = require('axios')

// [T-01] 환경변수 우선, 기본값 fallback
const ACA_PY_URL = process.env.ACA_PY_URL || 'http://localhost:8031'
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:3000'
const VON_URL = process.env.VON_URL || 'http://localhost:9000'

async function main() {
  console.log('=== DID 기반 서명 검증 E2E 테스트 ===\n')

  // 1. 32바이트 seed 생성 → Ed25519 키페어 파생
  // [B-04] 환경변수 미설정 시 경고
  if (!process.env.TEST_SEED) {
    console.warn('[WARN] TEST_SEED not set — using default seed (not secure for production)')
  }
  const seedStr = process.env.TEST_SEED || 'TestBMUDevice01VerifySign0000001' // 32 chars
  const seed = Buffer.from(seedStr)
  const keyPair = nacl.sign.keyPair.fromSeed(seed)
  const verkey = bs58.encode(keyPair.publicKey)
  console.log('[1] Ed25519 키페어 생성 (seed 기반)')
  console.log('    Seed:', seedStr)
  console.log('    Verkey (Base58):', verkey)

  // 2. VON 네트워크에 같은 seed로 DID 등록
  console.log('\n[2] VON 네트워크에 DID 등록...')
  let did
  try {
    const regRes = await axios.post(`${VON_URL}/register`, {
      seed: seedStr,
      role: 'ENDORSER',
      alias: 'test-bmu-device'
    })
    did = regRes.data.did
    console.log('    DID:', did)
    console.log('    VON Verkey:', regRes.data.verkey)
    console.log('    Verkey 일치:', regRes.data.verkey === verkey)
  } catch (err) {
    console.error('    VON 등록 실패:', err.response?.data || err.message)
    return
  }

  // 3. Ledger에서 verkey 확인
  console.log('\n[3] ACA-Py를 통해 Ledger verkey 조회...')
  try {
    const verkeyRes = await axios.get(`${ACA_PY_URL}/ledger/did-verkey`, {
      params: { did }
    })
    console.log('    Ledger Verkey:', verkeyRes.data.verkey)
    console.log('    일치 확인:', verkeyRes.data.verkey === verkey)
  } catch (err) {
    console.error('    조회 실패:', err.response?.data || err.message)
    return
  }

  // 4. BMS 메시지 서명
  const message = JSON.stringify({
    deviceId: 'BMU-001',
    soc: 85.5,
    voltage: 3.72,
    temperature: 25.3,
    timestamp: new Date().toISOString()
  })
  const msgBytes = Buffer.from(message)
  const signature = nacl.sign.detached(msgBytes, keyPair.secretKey)
  const signatureB64 = Buffer.from(signature).toString('base64')

  console.log('\n[4] BMS 데이터 서명')
  console.log('    메시지:', message)
  console.log('    서명:', signatureB64.substring(0, 50) + '...')

  // 5. bmu-agent /verify-signature 호출
  console.log('\n[5] bmu-agent 서명 검증 (POST /verify-signature)')
  try {
    const res = await axios.post(`${AGENT_URL}/verify-signature`, {
      did,
      msg: message,
      signature: signatureB64
    })
    console.log('    결과:', JSON.stringify(res.data))
    if (res.data.valid) {
      console.log('    ✅ 정상 서명 검증 성공!')
    } else {
      console.log('    ❌ 서명 검증 실패')
    }
  } catch (err) {
    console.error('    오류:', err.response?.data || err.message)
  }

  // 6. 변조된 메시지로 검증 실패 테스트
  console.log('\n[6] 변조 메시지 검증 (실패해야 정상)')
  try {
    const tampered = message.replace('85.5', '99.9')
    const res = await axios.post(`${AGENT_URL}/verify-signature`, {
      did,
      msg: tampered,
      signature: signatureB64
    })
    console.log('    결과:', JSON.stringify(res.data))
    if (!res.data.valid) {
      console.log('    ✅ 변조 감지 성공! (서명 불일치)')
    } else {
      console.log('    ❌ 변조 감지 실패 (위험!)')
    }
  } catch (err) {
    console.error('    오류:', err.response?.data || err.message)
  }

  // 7. 잘못된 DID로 검증 실패 테스트
  console.log('\n[7] 잘못된 DID로 검증 (실패해야 정상)')
  try {
    const res = await axios.post(`${AGENT_URL}/verify-signature`, {
      did: process.env.WRONG_DID || 'MPGsQGEaPz9qcySnxfFt4B',  // ACA-Py DID (다른 키)
      msg: message,
      signature: signatureB64
    })
    console.log('    결과:', JSON.stringify(res.data))
    if (!res.data.valid) {
      console.log('    ✅ DID 불일치 감지 성공!')
    } else {
      console.log('    ❌ 다른 DID로 검증 통과 (위험!)')
    }
  } catch (err) {
    console.error('    오류:', err.response?.data || err.message)
  }

  console.log('\n=== 테스트 완료 ===')
}

main().catch(err => {
  console.error('테스트 오류:', err.message)
  process.exit(1)
})
