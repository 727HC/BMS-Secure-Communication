# BMU Write Hot Path Map

## Context

Goal: `chaincode-hotpath-write200` — production-safe chaincode hot-path optimization to pass official 4-org BMU write200.

This note records the current chaincode operation budget so future work does not re-open already-closed hot-path questions.

## Official AutoID path

Entry path:

- `chaincode/passport-contract/bmu_tx.go:29-42` — `RecordBMUDataAutoID`
- `chaincode/passport-contract/bmu_tx.go:57-132` — `recordBMUDataAutoID`
- `chaincode/passport-contract/bmu_tx.go:264-305` — `commitBMURecordAutoID`

Current operation budget on the official AutoID write path:

| Operation | Count | Evidence |
| --- | ---: | --- |
| `GetState(recordId)` duplicate check | 0 | `RecordBMUDataAutoID` derives `recordId` from `stub.GetTxID()` and does not call duplicate record lookup. |
| `GetState(lastFcKey)` monotonic/strict binding check | 1 | `requireNextBMUFCForKey` reads `lastFcKey` once. |
| `PutState(recordId)` | 1 | Stores BMU record JSON. |
| `PutState(lastFcKey)` | 1 | Updates canonical DID→passport + FC high-water binding. |
| CouchDB rich query | 0 | Not used in AutoID write path. |

Regression lock:

- `chaincode/passport-contract/helpers_test.go::TestRecordBMUDataAutoIDUsesGenericMarshalWithoutDuplicateRecordRead` now asserts exactly one `GetState` on `lastFcKey` and exactly two `PutState` calls `[recordId,lastFcKey]` without benchmark-only marshal shortcuts.
- Evidence: `.omx/evidence/blockchain/chaincode-hotpath-write200/autoid-hotpath-operation-budget-20260519T081906KST/go-test.log` — `go test -count=1 ./...` PASS.

## Legacy/manual `RecordBMUData` path

Entry path:

- `chaincode/passport-contract/bmu_tx.go:15-23` — `RecordBMUData`
- `chaincode/passport-contract/bmu_tx.go:134-223` — `recordBMUData`
- `chaincode/passport-contract/bmu_tx.go:307-363` — `commitBMURecord`

Current operation budget:

| Operation | Count | Evidence |
| --- | ---: | --- |
| `GetState(recordId)` duplicate check | 1 | Kept for caller-supplied record IDs/API compatibility. |
| `GetState(lastFcKey)` monotonic/strict binding check | 1 | `requireNextBMUFCForKey`. |
| `PutState(recordId)` | 1 | Stores BMU record JSON. |
| `PutState(lastFcKey)` | 1 | Updates canonical binding/high-water. |

This path intentionally remains compatible; official write200 should use `RecordBMUDataAutoID` to avoid the duplicate-key read without breaking the old API.

## Payload/non-hot path

`RecordBMUDataWithPayload` adds passport loading for BMS raw payload validation:

- `chaincode/passport-contract/bmu_tx.go:161-179`
- `chaincode/passport-contract/helpers.go:1566-1574`

This is not the official write200 hot path.

## Non-hot maintenance paths

- `InvalidateBMURecord` may use `GetQueryResult` to locate the previous valid BMU record; it is not part of the write200 hot path.
- `ResetFCForDID` performs maintenance/audit writes; it is not part of the write200 hot path.
- Both are covered by safety gates requiring canonical `lastFc` preservation.

## Current conclusion

The official AutoID chaincode hot path is already at the expected production-safe minimum for the current semantics: one ledger read for FC replay protection and two ledger writes for BMU record + `lastFc` high-water. Remaining goal completion depends on importing official stronger-host 4-org write200 PASS evidence, not on removing another obvious chaincode ledger read from the official AutoID path.

## Caliper workload input guard

`caliper-workspace/workloads/recordBMUData.js` validates the benchmark-control integers at module load time:

- `NUM_PASSPORTS >= 1`
- `BMU_RECORD_KEYS >= 1`
- `BMU_RECORD_KEY_OFFSET >= 0`
- `BMU_FC_START >= 0`
- `CALIPER_WRITE_TX_NUMBER >= 0`
- all values must be safe base-10 integers

This keeps official write200 failures explicit when the operator passes malformed env, instead of letting `NaN`/fractional values propagate into FC sequencing or key assignment. It is not a benchmark shortcut; it rejects invalid configuration before submits.

Regression lock:

- `scripts/test-caliper-bmu-workload-sequence.js` asserts invalid env rejection for zero `BMU_RECORD_KEYS`, non-numeric `BMU_FC_START`, and fractional `CALIPER_WRITE_TX_NUMBER`.
- Evidence: `.omx/evidence/blockchain/chaincode-hotpath-write200/caliper-workload-env-validation-20260519T082450KST/` — `node -c`, workload selftest, and `git diff --check` PASS.

## Caliper request-template in-flight safety

The workload keeps reusable request templates for the normal official path, but now guards each slot with `inFlightSlots`.

- Normal path: if the selected slot is not in flight, mutate only the FC argument and reuse the request template.
- Overlap fallback: if the same slot is reused while a previous `sendRequests` promise is still pending, clone only that slot's argument array and send a one-off request object.

This preserves the low-allocation official path while avoiding FC corruption if a future Caliper rate controller overlaps `submitTransaction()` calls or a tiny diagnostic run has fewer slots than pending sends.

Regression lock:

- `scripts/test-caliper-bmu-workload-sequence.js` starts two concurrent AutoID submits against one slot with delayed adapter capture and asserts FCs remain `1,2` instead of both observing the later mutation.
- Evidence: `.omx/evidence/blockchain/chaincode-hotpath-write200/caliper-workload-inflight-safety-20260519T083111KST/` — `node -c`, workload selftest, and `git diff --check` PASS.
