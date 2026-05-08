// synced from wiki/blockchain/chaincode-error-contract.md @cbd2304
//
// chaincode 에러 메시지 → HTTP status + category 매핑.
// blockchain 세션과 합의된 §5.1 sync 책임 분담에 따라, 본 파일의 정규식은
// chaincode-error-contract.md §2/§3 갱신과 함께 동기화한다.
// breaking 변경 commit에는 `BREAKING: chaincode error prefix changed` 표식이 붙는다.
//
// Sync history:
// - @311a48e: 초기 contract (138 unique templates)
// - @cbd2304: ExtractMaterials JSON prefix `failed to unmarshal recycling rates:` →
//   `invalid recycling rates JSON:` 로 통일. §3.6 예외 paragraph 삭제, 미들웨어 특이 분기 제거.
// - 2026-05-08 activity-log sync: VC holder DID binding, RFC3339 timestamp/expiry,
//   SHA-256 dataHash, BMU signature presence validation 추가 반영.
// - 2026-05-08 sequence 5 live sync: SetPassportExtendedAttributes, BindBMSIdentifier,
//   RecordBMUDataWithPayload, RecordSourceVerification validation 추가 반영.

const FABRIC_WRAP_PREFIXES = [
  'Failed to evaluate transaction: ',
  'Failed to submit transaction: ',
  'transaction returned with failure: ',
  'error in simulation: ',
];

// Fabric Gateway SDK wrap (multi-peer endorsement collation):
//   "No valid responses from any peers. Errors:\n    peer=..., status=..., message=<inner>"
// 마지막 `message=` 뒤가 chaincode 원문. (last-message 우선; 다 peer 동일하면 첫 메시지와 같음)
const FABRIC_GATEWAY_WRAP_RE = /No valid responses from any peers\. Errors:[\s\S]*?message=([\s\S]*?)$/;

function unwrapFabricError(msg) {
  if (typeof msg !== 'string') return String(msg ?? '');
  let unwrapped = msg;
  // 다중 wrap 가능성 (gateway → endorsement → chaincode) 대비 반복 strip
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of FABRIC_WRAP_PREFIXES) {
      if (unwrapped.startsWith(prefix)) {
        unwrapped = unwrapped.slice(prefix.length);
        changed = true;
      }
    }
    const gatewayMatch = unwrapped.match(FABRIC_GATEWAY_WRAP_RE);
    if (gatewayMatch) {
      unwrapped = gatewayMatch[1].trim();
      changed = true;
    }
  }
  return unwrapped;
}

function mapChaincodeError(rawMsg) {
  const msg = unwrapFabricError(rawMsg);

  // AUTHZ — §3.1
  if (
    msg.startsWith('access denied:') ||
    msg.startsWith('MSP ') ||
    /not authorized/.test(msg)
  ) {
    return { status: 403, category: 'AUTHZ' };
  }

  // NOT_FOUND — §3.3
  if (/(does not exist|no passport found)/.test(msg)) {
    return { status: 404, category: 'NOT_FOUND' };
  }

  // CONFLICT — §3.4
  if (/(already (exists|revoked|disposed|invalidated|bound)|is not pending|already linked)/.test(msg)) {
    return { status: 409, category: 'CONFLICT' };
  }

  // PRECONDITION — §3.5
  if (/passport status must be|cannot add maintenance log|extract requires|has not been activated yet/.test(msg)) {
    return { status: 409, category: 'PRECONDITION' };
  }

  // VAL — §3.2
  if (/(must not be empty|must be non-negative|must be in \[|invalid |unknown |field '.*' is not correctable|DID mismatch|holder DID mismatch|BMS .*mismatch|fc \d+ must be greater|must be 64-character hex SHA-256|missing signature|malformed (expiresAt|timestamp)|rawPayload must|dataHash mismatch|result must be a boolean)/i.test(msg)) {
    return { status: 400, category: 'VAL' };
  }

  // INTERNAL fallback — §3.6 (failed to ... + Fabric/marshalling 오류 + 미분류)
  return { status: 500, category: 'INTERNAL' };
}

const { createLogger } = require('../services/logger.service');
const internalLog = createLogger('chaincode-error');

function sendChaincodeError(res, err) {
  const rawMsg = err && err.message ? err.message : String(err);
  const unwrapped = unwrapFabricError(rawMsg);
  const { status, category } = mapChaincodeError(rawMsg);
  // INTERNAL 응답은 generic 마스킹: Fabric wallet/CCP 경로, ACA-Py 내부 식별자 등
  // 인증 클라이언트에도 노출되지 않도록 서버 로그에만 원문 기록.
  if (category === 'INTERNAL') {
    internalLog.error('chaincode INTERNAL', { raw: unwrapped, status });
    return res.status(status).json({ error: 'Internal server error', category });
  }
  res.status(status).json({ error: unwrapped, category });
}

module.exports = {
  unwrapFabricError,
  mapChaincodeError,
  sendChaincodeError,
};
