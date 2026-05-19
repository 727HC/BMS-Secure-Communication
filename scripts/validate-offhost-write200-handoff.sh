#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
GOAL_DIR=".omx/goals/performance/${SLUG}"
OUT="${1:-}"
if [[ -z "${OUT}" ]]; then
  OUT=".omx/evidence/blockchain/${SLUG}/offhost-handoff-readiness-$(date +%Y%m%dT%H%M%S%Z).json"
fi
case "${OUT}" in
  *.tar.gz|*.tgz)
    echo "refusing to write readiness JSON over archive path: ${OUT}" >&2
    echo "pass an output .json path, or omit the argument for the default path" >&2
    exit 2
    ;;
esac
mkdir -p "$(dirname "${OUT}")"

python3 - "$OUT" "$GOAL_DIR" <<'PY'
import json
import os
import shutil
import stat
import subprocess
import sys
from pathlib import Path

out = Path(sys.argv[1])
goal_dir = Path(sys.argv[2])
root = Path.cwd()

required_files = [
    "scripts/apply-offhost-write200-overlay.sh",
    "scripts/audit-performance-goal-completion.sh",
    "scripts/check-benchmark-host-readiness.sh",
    "scripts/run-official-write200-audit.sh",
    "scripts/run-offhost-write200-operator.sh",
    "scripts/verify-official-write200-evidence.sh",
    "scripts/test-caliper-bmu-workload-sequence.js",
    "scripts/test-official-write200-verifier-gates.sh",
    "scripts/test-offhost-return-bundle-required-context.sh",
    "scripts/test-portable-fallback-import-route.sh",
    "scripts/watch-offhost-write200-bundle.sh",
    "scripts/create-offhost-write200-handoff-bundle.sh",
    "scripts/create-offhost-write200-return-bundle.sh",
    "scripts/ingest-offhost-write200-evidence.sh",
    "scripts/evaluate-write200-smoke-quality-gate.py",
    "scripts/import-offhost-write200-bundle.sh",
        "scripts/import-latest-offhost-write200-bundle.sh",
        "scripts/check-benchmark-host-readiness.sh",
        "scripts/import-offhost-write200-diagnostic-bundle.sh",
    "scripts/import-offhost-write200-return-bundle.sh",
    "scripts/identify-benchmark-ledger-validity.sh",
    "scripts/publish-offhost-write200-handoff-to-desktop.sh",
    "scripts/recommend-write200-sweep-candidate.py",
    "scripts/safe-tar-extract.py",
    "scripts/verify-offhost-write200-desktop-handoff.sh",
    "scripts/wait-peer-heights-equal.sh",
    "scripts/blockchain-tps-reproducibility.sh",
    "scripts/reconcile-benchmark-state.js",
    "scripts/cleanup-benchmark-fabric-artifacts.sh",
    "caliper-workspace/caliperIds.js",
    "caliper-workspace/workloads/recordBMUData.js",
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json",
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDidFC.json",
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportFC.json",
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json",
    "chaincode/passport-contract/bmu_tx.go",
    "chaincode/passport-contract/go.mod",
    "chaincode/passport-contract/go.sum",
    "chaincode/passport-contract/helpers.go",
    "chaincode/passport-contract/helpers_test.go",
    "chaincode/passport-contract/query.go",
    "chaincode/passport-contract/types.go",
    "passport-network/network.sh",
    "passport-network/compose/compose-benchmark-concurrency.yaml",
    "passport-network/configtx/configtx.yaml",
    "wiki/blockchain/bmu-hot-path-map.md",
    "wiki/blockchain/official-write200-offhost-runbook.md",
    "wiki/decisions/007-blockchain-benchmark-host-readiness.md",
    ".omx/plans/evaluate-chaincode-hotpath-write200.sh",
    ".omx/plans/prd-chaincode-hotpath-write200.md",
    ".omx/plans/test-spec-chaincode-hotpath-write200.md",
    f"{goal_dir}/evaluate.sh",
    f"{goal_dir}/evaluator.md",
    f"{goal_dir}/latest-results.env",
    f"{goal_dir}/state.json",
]
required_executable = [
    "scripts/apply-offhost-write200-overlay.sh",
    "scripts/audit-performance-goal-completion.sh",
    "scripts/check-benchmark-host-readiness.sh",
    "scripts/run-official-write200-audit.sh",
    "scripts/run-offhost-write200-operator.sh",
    "scripts/verify-official-write200-evidence.sh",
    "scripts/test-caliper-bmu-workload-sequence.js",
    "scripts/test-official-write200-verifier-gates.sh",
    "scripts/test-offhost-return-bundle-required-context.sh",
    "scripts/test-portable-fallback-import-route.sh",
    "scripts/watch-offhost-write200-bundle.sh",
    "scripts/create-offhost-write200-handoff-bundle.sh",
    "scripts/create-offhost-write200-return-bundle.sh",
    "scripts/ingest-offhost-write200-evidence.sh",
    "scripts/evaluate-write200-smoke-quality-gate.py",
    "scripts/import-offhost-write200-bundle.sh",
    "scripts/import-latest-offhost-write200-bundle.sh",
    "scripts/import-offhost-write200-diagnostic-bundle.sh",
    "scripts/import-offhost-write200-return-bundle.sh",
    "scripts/identify-benchmark-ledger-validity.sh",
    "scripts/publish-offhost-write200-handoff-to-desktop.sh",
    "scripts/recommend-write200-sweep-candidate.py",
    "scripts/safe-tar-extract.py",
    "scripts/verify-offhost-write200-desktop-handoff.sh",
    "scripts/wait-peer-heights-equal.sh",
    "scripts/blockchain-tps-reproducibility.sh",
    "scripts/cleanup-benchmark-fabric-artifacts.sh",
]

checks = []
failures = []

def add(name, ok, detail=""):
    checks.append({"name": name, "ok": bool(ok), "detail": detail})
    if not ok:
        failures.append(f"{name}: {detail}")

for rel in required_files:
    p = root / rel
    add(f"file:{rel}", p.exists(), "exists" if p.exists() else "missing")

for rel in required_executable:
    p = root / rel
    ok = p.exists() and os.access(p, os.X_OK)
    mode = oct(p.stat().st_mode & 0o777) if p.exists() else "missing"
    add(f"executable:{rel}", ok, mode)

expected_bmu_indexes = {
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDIDStatus.json": {
        "fields": ["docType", "did", "status"],
        "ddoc": "indexBMUByDIDStatusDoc",
        "name": "indexBMUByDIDStatus",
        "type": "json",
    },
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByDidFC.json": {
        "fields": ["docType", "did", "status", "fc"],
        "ddoc": "indexBMUByDidFCDoc",
        "name": "indexBMUByDidFC",
        "type": "json",
    },
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportFC.json": {
        "fields": ["docType", "passportId", "status", "fc"],
        "ddoc": "indexBMUByPassportFCDoc",
        "name": "indexBMUByPassportFC",
        "type": "json",
    },
    "chaincode/passport-contract/META-INF/statedb/couchdb/indexes/indexBMUByPassportTimestamp.json": {
        "fields": ["docType", "passportId", "timestamp"],
        "ddoc": "indexBMUByPassportTimestampDoc",
        "name": "indexBMUByPassportTimestamp",
        "type": "json",
    },
}
for rel, expected in expected_bmu_indexes.items():
    p = root / rel
    add(f"bmu-index-present:{rel}", p.exists(), "exists" if p.exists() else "missing")
    if not p.exists():
        continue
    try:
        data = json.loads(p.read_text(errors="replace"))
    except Exception as exc:
        add(f"bmu-index-json-valid:{rel}", False, str(exc))
        continue
    fields = data.get("index", {}).get("fields")
    add(
        f"bmu-index-fields:{rel}",
        fields == expected["fields"],
        f"{fields}" if fields != expected["fields"] else "expected",
    )
    for key in ["ddoc", "name", "type"]:
        add(
            f"bmu-index-{key}:{rel}",
            data.get(key) == expected[key],
            str(data.get(key)) if data.get(key) != expected[key] else "expected",
        )

allowed_index_keys = {"index", "ddoc", "name", "type"}
index_dir = root / "chaincode/passport-contract/META-INF/statedb/couchdb/indexes"
for p in sorted(index_dir.glob("*.json")) if index_dir.exists() else []:
    rel = str(p.relative_to(root))
    try:
        data = json.loads(p.read_text(errors="replace"))
    except Exception as exc:
        add(f"couchdb-index-json-valid:{rel}", False, str(exc))
        continue
    unknown_keys = sorted(set(data) - allowed_index_keys)
    add(
        f"couchdb-index-fabric-metadata-keys:{rel}",
        not unknown_keys,
        "allowed" if not unknown_keys else f"unknown top-level keys: {unknown_keys}",
    )
    text = p.read_text(errors="replace")
    add(
        f"couchdb-index-no-partial-filter-selector:{rel}",
        "partial_filter_selector" not in text,
        "absent" if "partial_filter_selector" not in text else "present",
    )

commands = [
    ["bash", "-n", "scripts/apply-offhost-write200-overlay.sh"],
    ["bash", "-n", "scripts/audit-performance-goal-completion.sh"],
    ["bash", "-n", "scripts/check-benchmark-host-readiness.sh"],
    ["bash", "-n", "scripts/run-official-write200-audit.sh"],
    ["bash", "-n", "scripts/run-offhost-write200-operator.sh"],
    ["bash", "-n", "scripts/verify-official-write200-evidence.sh"],
    ["node", "-c", "scripts/test-caliper-bmu-workload-sequence.js"],
    ["bash", "-n", "scripts/test-official-write200-verifier-gates.sh"],
    ["bash", "-n", "scripts/test-offhost-return-bundle-required-context.sh"],
    ["bash", "-n", "scripts/test-portable-fallback-import-route.sh"],
    ["bash", "-n", "scripts/watch-offhost-write200-bundle.sh"],
    ["bash", "-n", "scripts/create-offhost-write200-handoff-bundle.sh"],
    ["bash", "-n", "scripts/create-offhost-write200-return-bundle.sh"],
    ["bash", "-n", "scripts/ingest-offhost-write200-evidence.sh"],
    ["python3", "-m", "py_compile", "scripts/evaluate-write200-smoke-quality-gate.py"],
    ["bash", "-n", "scripts/import-offhost-write200-bundle.sh"],
    ["bash", "-n", "scripts/import-latest-offhost-write200-bundle.sh"],
    ["bash", "-n", "scripts/import-offhost-write200-diagnostic-bundle.sh"],
    ["bash", "-n", "scripts/import-offhost-write200-return-bundle.sh"],
    ["bash", "-n", "scripts/identify-benchmark-ledger-validity.sh"],
    ["bash", "-n", "scripts/publish-offhost-write200-handoff-to-desktop.sh"],
    ["python3", "-m", "py_compile", "scripts/recommend-write200-sweep-candidate.py"],
    ["bash", "-n", "scripts/verify-offhost-write200-desktop-handoff.sh"],
    ["bash", "-n", "scripts/wait-peer-heights-equal.sh"],
    ["bash", "-n", "scripts/blockchain-tps-reproducibility.sh"],
    ["bash", "-n", "scripts/cleanup-benchmark-fabric-artifacts.sh"],
    ["bash", "-n", "passport-network/network.sh"],
    ["node", "-c", "scripts/reconcile-benchmark-state.js"],
    ["node", "-c", "caliper-workspace/caliperIds.js"],
    ["node", "-c", "caliper-workspace/workloads/recordBMUData.js"],
    ["bash", "-n", ".omx/plans/evaluate-chaincode-hotpath-write200.sh"],
]
for cmd in commands:
    try:
        cp = subprocess.run(cmd, cwd=root, text=True, capture_output=True, timeout=120)
        add("cmd:" + " ".join(cmd), cp.returncode == 0, (cp.stdout + cp.stderr).strip()[-500:])
    except Exception as exc:
        add("cmd:" + " ".join(cmd), False, repr(exc))

repo_configtxgen = root / "fabric-samples/bin/configtxgen"
path_configtxgen = shutil.which("configtxgen")
configtxgen = repo_configtxgen if repo_configtxgen.exists() else Path(path_configtxgen) if path_configtxgen else None
if configtxgen is not None:
    env = os.environ.copy()
    env["PATH"] = f"{configtxgen.parent}:{env.get('PATH','')}"
    env["FABRIC_CFG_PATH"] = str(root / "passport-network/configtx")
    cp = subprocess.run(
        [str(configtxgen), "-profile", "PassportBenchmarkChannel", "-outputBlock", "/tmp/passport-handoff-readiness.block", "-channelID", "passporthandoffcheck"],
        cwd=root / "passport-network",
        text=True,
        capture_output=True,
        env=env,
        timeout=120,
    )
    configtxgen_output = (cp.stdout + cp.stderr).strip()
    missing_bootstrap_crypto = (
        cp.returncode != 0
        and "cannot load client cert for consenter" in configtxgen_output
        and "passport-network/organizations" in configtxgen_output
        and "no such file or directory" in configtxgen_output
    )
    ok = cp.returncode == 0 or missing_bootstrap_crypto
    prefix = "deferred_crypto_material_missing; " if missing_bootstrap_crypto else ""
    detail = f"binary={configtxgen}; {prefix}" + configtxgen_output[-500:]
    add("cmd:configtxgen PassportBenchmarkChannel", ok, detail)
else:
    add("cmd:configtxgen PassportBenchmarkChannel", False, "configtxgen missing from fabric-samples/bin and PATH")

runbook = root / "wiki/blockchain/official-write200-offhost-runbook.md"
if runbook.exists():
    text = runbook.read_text(errors="replace")
    for phrase in [
        "scripts/run-official-write200-audit.sh",
        "scripts/run-offhost-write200-operator.sh",
        "scripts/publish-offhost-write200-handoff-to-desktop.sh",
        "scripts/recommend-write200-sweep-candidate.py",
        "scripts/verify-offhost-write200-desktop-handoff.sh --desktop-dir",
        "--create",
        "offhost-write200-handoff-LATEST.txt",
        "offhost-write200-RUN-ME-latest.txt",
        "offhost-write200-RETURN-NEEDED-latest.txt",
        "RETURN-NEEDED",
        "existing checkout",
        "--force-official-after-smoke",
        "--sweep-on-smoke-fail",
        "--sweep-only",
        "sweep-results.csv",
        "smoke-quality-gate",
        "SMOKE_MIN_SUCCESSFUL_TPS",
        "smoke_quality_gate_failed_sweep_requested_official_skipped",
        "DIAGNOSTIC_BUNDLE=",
        "DIAGNOSTIC_BUNDLE_SHA256=",
        "smoke_cleanup_failed_official_skipped",
        "handoff_readiness_failed",
        "blocked_underpowered_host",
        "scripts/ingest-offhost-write200-evidence.sh",
        "scripts/import-offhost-write200-bundle.sh",
        "scripts/import-latest-offhost-write200-bundle.sh",
        "${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE",
        "${WINDOWS_HOME}/Downloads",
        "${WINDOWS_HOME}/Documents",
        "--max-depth 6",
        "scripts/import-offhost-write200-diagnostic-bundle.sh",
        "scripts/identify-benchmark-ledger-validity.sh",
        "scripts/wait-peer-heights-equal.sh",
        "scripts/apply-offhost-write200-overlay.sh",
    "scripts/audit-performance-goal-completion.sh",
        "ledger-validity/summary.json",
        "txmap-repeat-summary",
        "caliper_sendRequests_txmap_callback",
        "COLLECT_DOCKER_STATS",
        "docker-stats-repeat-",
        "COLLECT_HOST_RESOURCE_STATS",
        "iostat-repeat-",
        "pidstat-repeat-",
        "sweep-recommendation.env",
        "disposable_sweep_candidate_not_official_pass_substitute",
        "IDENTIFY_LEDGER_VALIDITY_AFTER_RUNS=true",
        "IDENTIFY_LEDGER_VALIDITY_REQUIRED=false",
        "WAIT_FOR_PEER_HEIGHTS_EQUAL=true",
        "WAIT_FOR_PEER_HEIGHTS_REQUIRED=true",
        "peer-heights.log",
        "peer-heights-*.json",
        "peer-height-evidence-check.json",
        "scripts/create-offhost-write200-return-bundle.sh",
        "scripts/import-offhost-write200-return-bundle.sh",
        "prefers official",
        "Use `--bundle` for an explicit diagnostic import",
        "--auto-audit",
        "--completion-audit <audit-dir>/completion-audit.md",
        "BatchTimeout=1s",
        "CALIPER_RECORD_AUTO_ID=true",
        "CALIPER_WRITE_TX_NUMBER=10000",
        "CALIPER_WRITE_TARGET_TPS=400",
        "CALIPER_WORKERS=4",
        "CALIPER_WRITE_TARGET_TPS=400",
        "CALIPER_WORKERS=4",
        "CALIPER_VERIFY_PREPARED_EACH_REPEAT",
        "CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY",
        "CALIPER_OBSERVER_INTERNAL_INTERVAL",
        "CALIPER_EXEC_MODE=docker",
        "CALIPER_ENDPOINT_MODE=docker",
        "CALIPER_DOCKER_NETWORK=passport_net",
        "Docker-network runner default",
        "BENCHMARK_PEER_CONCURRENCY=true",
        "CORE_PEER_LIMITS_CONCURRENCY_GATEWAYSERVICE=2000",
        "Do not reset/redeploy/sequence live `passportchannel`",
        "Do not substitute ledger/world-state counts for Caliper `Succ==expected`",
    ]:
        add(f"runbook-phrase:{phrase}", phrase in text, "present" if phrase in text else "missing")

compose_override = root / "passport-network/compose/compose-benchmark-concurrency.yaml"
if compose_override.exists():
    text = compose_override.read_text(errors="replace")
    for phrase in [
        "CORE_PEER_LIMITS_CONCURRENCY_ENDORSERSERVICE",
        "CORE_PEER_LIMITS_CONCURRENCY_DELIVERSERVICE",
        "CORE_PEER_LIMITS_CONCURRENCY_GATEWAYSERVICE",
    ]:
        add(f"compose-phrase:{phrase}", phrase in text, "present" if phrase in text else "missing")

script_phrase_checks = {
    "scripts/publish-offhost-write200-handoff-to-desktop.sh": [
        "offhost-write200-RETURN-NEEDED-latest.txt",
        "STRONGER_HOST_NEXT_ACTION.txt",
        "RUN_THIS_ON_STRONGER_HOST_ONE_LINE.txt",
        "RETURN_NEEDED_CARD=",
        "NEXT_ACTION_CARD=${next_action_card}",
        "ONE_LINE_CARD=${one_line_card}",
        "cp \"${return_card}\" \"${next_action_card}\"",
        "DESKTOP_DIR=\"${DESKTOP_DIR:-${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE}\"",
        "resolve_windows_home()",
        "WINDOWS_HOME=\"$(resolve_windows_home \"",
        "RETURN_BUNDLE tar.gz",
        "DIAGNOSTIC_BUNDLE tar.gz",
        "configtxgen must be available at fabric-samples/bin/configtxgen or on PATH",
        "scripts/import-latest-offhost-write200-bundle.sh --search-root",
        "configtxgen must exist before operator write paths can run",
        "COLLECT_HOST_RESOURCE_STATS=true",
        "SWEEP_RECOMMENDATION_ENV",
        "sweep-recommendation.env",
        "CALIPER_EXEC_MODE=docker",
        "CALIPER_ENDPOINT_MODE=docker",
        "CALIPER_DOCKER_NETWORK=passport_net",
        "CALIPER_RECORD_AUTO_ID=true",
        "CALIPER_WRITE_TX_NUMBER=10000",
        "CALIPER_WORKERS=4",
        "CALIPER_WRITE_TARGET_TPS=400",
        "ALLOW_UNDERPOWERED=false",
        "BENCHMARK_CHANNEL_ORGS=1,2,3,4",
        "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4",
        "scripts/watch-offhost-write200-bundle.sh",
        "CURRENT_WRITE200_STATUS_AND_NEXT_STEP.txt",
        "canonical bundle filename",
        "Only use OFFHOST_BUNDLE_CONTENT_SCAN=true as a one-shot fallback",
    ],
    "scripts/verify-offhost-write200-desktop-handoff.sh": [
        "RETURN_CARD=",
        "NEXT_ACTION_CARD=",
        "ONE_LINE_CARD=",
        "return-needed card",
        "next-action card",
        "one-line card",
        "offhost-write200-RETURN-NEEDED-latest.txt",
        "STRONGER_HOST_NEXT_ACTION.txt",
        "RUN_THIS_ON_STRONGER_HOST_ONE_LINE.txt",
        "DESKTOP_DIR=\"${DESKTOP_DIR:-${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE}\"",
        "scripts/evaluate-write200-smoke-quality-gate.py",
        "scripts/recommend-write200-sweep-candidate.py",
        "bundle missing required member",
        "RETURN_BUNDLE",
        "DIAGNOSTIC_BUNDLE",
        "scripts/import-latest-offhost-write200-bundle.sh",
        "scripts/recommend-write200-sweep-candidate.py",
        "sha256sum -c -",
        "scripts/run-stronger-host-direct-official.sh",
        "scripts/test-official-write200-verifier-gates.sh",
        "OFFICIAL_WRITE200_VERIFIER_GATES_SELFTEST_STATUS=pass",
        "CALIPER_RECORD_AUTO_ID=true",
        "CALIPER_WRITE_TX_NUMBER=10000",
        "CALIPER_WORKERS=4",
        "CALIPER_WRITE_TARGET_TPS=400",
        "ALLOW_UNDERPOWERED=false",
        "BENCHMARK_CHANNEL_ORGS=1,2,3,4",
        "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4",
    ],
    "scripts/import-latest-offhost-write200-bundle.sh": [
        "${WINDOWS_HOME}/Desktop/OMX_WRITE200_WORKSPACE",
        "${WINDOWS_HOME}/Downloads",
        "${WINDOWS_HOME}/Documents",
        "Corrupt tar.gz files",
        "tarballs whose contents do not match their filename",
        "README-return-bundle.md",
        "detect_tar_kind",
        "invalid_offhost_bundle",
        "validatedKind",
        "OFFHOST_BUNDLE_CONTENT_SCAN=true",
        "portable_fallback_diagnostic",
        "STATUS=direct_official_wrapper_fallback",
        "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4",
        "EXHAUSTIVE_SCAN=$(scan_flag",
        "CONTENT_SCAN=$(scan_flag",
    ],
    "scripts/audit-performance-goal-completion.sh": [
        "Official evidence host is ready and not underpowered-overridden",
        "host-readiness.json; {official_evidence_dir}/launch.env",
        "ALLOW_UNDERPOWERED=false",
        "local underpowered/proxy evidence is not sufficient",
        "Official BMU write workload identity is RecordBMUDataAutoID",
        "workloads/recordBMUData.js",
        "Official successful_commit basis is proven by ledger reconciliation and txmap callback",
        "ledgerWorldStateMatchesExpected",
        "OFFICIAL_WRITE_LEDGER_CSV_TOTAL_EXPECTED",
    ],
    "scripts/import-offhost-write200-bundle.sh": [
        "README-return-bundle.md",
        "BUNDLE_KIND=official_return",
        "BUNDLE_KIND=diagnostic",
    ],
    "scripts/create-offhost-write200-return-bundle.sh": [
        "launch.env",
        "host-readiness.json",
        "host-readiness.log",
        "workload-sequence-selftest.log",
        "operator-context",
        "README-return-bundle.md",
        "required-file-check.json",
        "manifest.sha256",
    ],
    "scripts/watch-offhost-write200-bundle.sh": [
        "OFFHOST_BUNDLE_SEARCH_ROOTS",
        "OFFHOST_BUNDLE_SEARCH_ROOT",
        "--detach",
        "setsid",
        "OFFHOST_BUNDLE_WATCH_DIR_OVERRIDE",
        "diagnostic_imported_waiting_for_official",
        "IMPORTED_DIAGNOSTIC_SIGNATURES",
        "keeps waiting for an official RETURN_BUNDLE",
        "import_failed_waiting_for_change",
        "SELECTED_SIGNATURE",
        "${windows_home}/Desktop/OMX_WRITE200_WORKSPACE",
        "${windows_home}/Downloads",
        "${windows_home}/Documents",
        "SEARCH_ROOTS=${SEARCH_ROOTS[*]}",
        "OFFHOST_BUNDLE_EXHAUSTIVE_SCAN=true",
        "OFFHOST_BUNDLE_CONTENT_SCAN=true",
        "EXHAUSTIVE_SCAN=$([[",
        "CONTENT_SCAN=$([[",
        "Keep watch-status.env current immediately after every unsuccessful scan",
        "IMPORT_SCAN_RC=${rc}",
    ],
    "scripts/create-offhost-write200-handoff-bundle.sh": [
        "canonical bundle filename",
        "Only use `OFFHOST_BUNDLE_CONTENT_SCAN=true` as a one-shot fallback",
        "export CALIPER_RECORD_AUTO_ID=true",
        "export CALIPER_WRITE_TX_NUMBER=10000",
        "export CALIPER_WORKERS=4",
        "export CALIPER_WRITE_TARGET_TPS=400",
        "export OFFICIAL_WORKERS=4",
        "export OFFICIAL_TARGET_TPS=400",
    ],
    "scripts/evaluate-write200-smoke-quality-gate.py": [
        "disposable_smoke_quality_gate_not_official_pass_substitute",
        "caliper_sendRequests_txmap_callback",
        "successVerifiedCount",
    ],
    "scripts/recommend-write200-sweep-candidate.py": [
        "disposable_sweep_candidate_not_official_pass_substitute",
        "SWEEP_RECOMMENDATION_OFFICIAL_PASS_SUBSTITUTE=false",
        "CALIPER_WORKERS",
        "CALIPER_WRITE_TARGET_TPS",
        "OFFICIAL_WORKERS",
        "export CALIPER_WORKERS CALIPER_WRITE_TARGET_TPS",
    ],
    "scripts/validate-offhost-write200-handoff.sh": [
        "refusing to write readiness JSON over archive path",
        "*.tar.gz|*.tgz",
        "lean-bmu-index-present",
        "lean-bmu-index-fields",
        "couchdb-index-no-partial-filter-selector",
        "couchdb-index-fabric-metadata-keys",
    ],
    "scripts/blockchain-tps-reproducibility.sh": [
        "VERIFY_PREPARED_EACH_REPEAT=\"${CALIPER_VERIFY_PREPARED_EACH_REPEAT:-false}\"",
        "COLLECT_DOCKER_STATS=\"${COLLECT_DOCKER_STATS:-true}\"",
        "docker-stats-repeat-",
        "COLLECT_HOST_RESOURCE_STATS=\"${COLLECT_HOST_RESOURCE_STATS:-true}\"",
        "iostat-repeat-",
        "pidstat-repeat-",
        "CALIPER_WRITE_ROUND_LABEL=\"write-bmu-data\"",
        "CALIPER_WRITE_WORKLOAD_MODULE=\"workloads/recordBMUData.js\"",
        "CALIPER_WRITE_CONTRACT_FUNCTION=${CALIPER_WRITE_CONTRACT_FUNCTION}",
    ],
    "scripts/reconcile-benchmark-state.js": [
        "caliper_sendRequests_txmap_callback",
        "txmapRepeatSummary",
        "txmap-repeat-summary",
    ],
    "scripts/verify-official-write200-evidence.sh": [
        "txmapCallback",
        "OFFICIAL_WRITE_TXMAP_CALLBACK_PRESENT",
        "OFFICIAL_WRITE_HOST_READINESS_STATUS",
        "OFFICIAL_WRITE_RECORD_AUTO_ID",
        "OFFICIAL_WRITE_WORKLOAD_MODULE",
        "OFFICIAL_WRITE_CONTRACT_FUNCTION",
        "OFFICIAL_WRITE_LEDGER_RECONCILIATION_MATCH",
        "OFFICIAL_WRITE_LEDGER_CSV_TOTAL_EXPECTED",
        "OFFICIAL_WRITE_TXMAP_CALLBACK_REPEAT_COUNT",
        "OFFICIAL_WRITE_TX_NUMBER",
        "OFFICIAL_WRITE_CC_INSTALL_ORGS",
        "CALIPER_RECORD_AUTO_ID must be true",
        "BMU AutoID write200 evidence",
        "ledger world-state reconciliation must match expected successful commits",
        "ledger expected must equal CSV total expected",
        "txmap repeat callback allRunsSuccessVerified must be true",
        "CALIPER_WRITE_TX_NUMBER",
        "BENCHMARK_CC_INSTALL_ORGS must be 1,2,3,4",
        "ALLOW_UNDERPOWERED must be false for official PASS",
        "host readiness must be ready for official PASS",
        "diagnostic_only_not_pass_substitute",
    ],
    "scripts/ingest-offhost-write200-evidence.sh": [
        "skipped_verify_rc_",
        "APPEND_RC",
        "missing_goal_write_env",
    ],
    "caliper-workspace/workloads/recordBMUData.js": [
        "const recordEpoch = process.env.CALIPER_RECORD_EPOCH",
        "this.fcArgumentIndex = AUTO_ID_MODE ? 4 : 5",
        "this.requests.push(request)",
        "this.fcOffsets.push(0)",
        "this.requestArgumentRefs.push(contractArguments)",
        "slot-aligned with reusable request templates",
        "buildFCStringCache",
        "BMU_FC_START-relative window",
        "this.fcStringCacheStart = fcStringCache.start",
        "this.fcStringCacheUsable = this.fcStart === this.fcStringCacheStart",
        "this.requestCount = this.requests.length",
        "next slot, not a total counter",
        "this.txIndex = nextIndex === this.requestCount ? 0 : nextIndex",
        "const fcOffset = this.fcOffsets[idx] + 1",
        "this.requestArgumentRefs[idx][this.fcArgumentIndex] = fcString",
        "this.contractFunction = AUTO_ID_MODE ? 'RecordBMUDataAutoID' : 'RecordBMUData'",
        "Official write200 uses the txID-derived record ID path",
        "contractFunction: this.contractFunction",
    ],
    "caliper-workspace/caliperIds.js": [
        "function keyPrefix",
        "function passportIdForIndex",
        "function didForIndex",
        "module.exports",
    ],
    "chaincode/passport-contract/helpers.go": [
        "func parseUint64Fast",
        "func parseFiniteFloatCommonFast",
        "func parseBMUAutoIDConstantFields",
        "func parseSimpleDecimalFloatFast",
        "func parseFixed3DecimalFloatFast",
        "fewer than 20 digits fits uint64",
        "len(value) < 20",
        "func parseUint16Fast",
        "func parseUint16CommonFast",
        "func parseUint8Fast",
        "func parseUint8CommonFast",
        "len(value) > 5",
        "len(value) > 3",
        "func parseUint10FastMax",
        "func parseUint10BytesFastMax",
        "value[19] != '.' || value[23] != 'Z'",
        "func validateBMURecordAutoIDInput",
        "compatibilityFallback",
        "common case without touching the compatibility table",
        "func decodeLastFCBindingForPassport",
        "passportMatches = true",
        "i == len(expectedPassportID)",
        "func lastFCKey(did string)",
        "func appendLastFCBinding",
        "func marshalBMURecordState",
        "func marshalBMURecordValidState",
        "func marshalBMURecordAutoIDValidState",
        "func marshalBMURecordAutoIDValidFields",
        "func marshalBMURecordAutoIDValidFieldsCreatedAtTime",
        "func marshalBMURecordAutoIDValidFieldsPrefix",
        "func appendJSONLowerHex64String",
        "func appendJSONBMUFloat",
        "appendJSONFloatField",
    ],
    "chaincode/passport-contract/bmu_tx.go": [
        "func (c *PassportContract) commitBMURecordAutoID",
        "marshalBMURecordAutoIDValidFieldsCreatedAtTime(",
        "latestValidLoaded",
        "getLatestValid := func()",
        "func (c *PassportContract) recordBMUDataAutoID",
        "recordBMUDataAutoID(ctx, stub",
        "avoids duplicate-record and",
        "raw-payload branches",
        "return c.recordBMUData(ctx, recordId",
        "rawPayloadHex, true)",
        "stub := ctx.GetStub()",
        "txTimeFromStub(stub)",
        "encodeLastFCBinding(passportId, fcVal, true)",
        "requireNextBMUFC(stub",
        "parseUint64Fast(fc)",
        "parseUint16Fast(soc)",
        "parseUint8Fast(cellCount)",
        "marshalBMURecordState(&record)",
        "validateBMURecordAutoIDInput",
        "decodeLastFCBindingForPassport",
    ],
    "chaincode/passport-contract/helpers_test.go": [
        "TestDedicatedParseUintFastHelpersMatchStrconvParseUint",
        "TestParseUintCommonFastHelpersPreserveFallbackSemantics",
        "uint64 short no-overflow path",
        "uint16 long fallback",
        "uint8 long fallback",
        "TestValidateSHA256HexLowercaseFastPathAndCompatibilityFallback",
        "TestValidateBMURecordAutoIDInputPreservesSharedFieldValidation",
        "TestDecodeLastFCBindingForPassportAvoidsMatchAllocationPath",
        "TestMarshalBMURecordStateMatchesEncodingJSONForHotPath",
        "TestMarshalBMURecordValidStateMatchesEncodingJSONForHotPath",
        "TestMarshalBMURecordAutoIDValidStateMatchesEncodingJSONForHotPath",
        "TestAppendJSONBMUFloatCommonValuesMatchEncodingJSON",
        "TestMarshalBMURecordStateMatchesEncodingJSONWithOptionalAndEscaping",
        "TestRecordBMUDataAutoIDReusesStubAcrossHotPath",
        "TestRecordBMUDataAutoIDUsesGenericMarshalWithoutDuplicateRecordRead",
        "TestParseSimpleDecimalFloatFastMatchesStrconvParseFloat",
        "TestParseFixed3DecimalFloatFastMatchesStrconvParseFloat",
        "TestParseFiniteFloatCommonFastPreservesFallbackSemantics",
        "TestParseBMUAutoIDConstantFieldsMatchesDefaultBMUValues",
        "TestParseSimpleDecimalFloatFastFallsBackForComplexOrRiskyValues",
    ],
    "scripts/run-official-write200-audit.sh": [
        "scripts/check-benchmark-host-readiness.sh --output",
        "OFFICIAL_WRITE_HOST_READINESS_STATUS",
        "OFFICIAL_WRITE_ALLOW_UNDERPOWERED",
        "CALIPER_RECORD_AUTO_ID=${CALIPER_RECORD_AUTO_ID:-true}",
        "CALIPER_WRITE_ROUND_LABEL=write-bmu-data",
        "CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js",
        "CALIPER_WRITE_CONTRACT_FUNCTION=${OFFICIAL_WRITE_CONTRACT_FUNCTION}",
        "CALIPER_VERIFY_PREPARED_EACH_REPEAT=\"${CALIPER_VERIFY_PREPARED_EACH_REPEAT:-false}\"",
        "CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=\"${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-180}\"",
        "CALIPER_OBSERVER_INTERNAL_INTERVAL=\"${CALIPER_OBSERVER_INTERNAL_INTERVAL:-10000}\"",
        "COLLECT_HOST_RESOURCE_STATS=\"${COLLECT_HOST_RESOURCE_STATS:-true}\"",
        "CALIPER_EXEC_MODE=${CALIPER_EXEC_MODE:-host}",
        "CALIPER_ENDPOINT_MODE=${CALIPER_ENDPOINT_MODE:-host}",
        "CALIPER_DOCKER_NETWORK=${CALIPER_DOCKER_NETWORK:-passport_net}",
    ],
    "scripts/run-offhost-write200-operator.sh": [
        "arg=\"${1%$'\\r'}\"",
        "BASE=\"${BASE%$'\\r'}\"",
        "scripts/check-benchmark-host-readiness.sh --output",
        "SWEEP_MATRIX=\"${SWEEP_MATRIX:-4:400 4:380 4:420 3:400 5:400}\"",
        "SMOKE_MIN_SUCCESSFUL_TPS=\"${SMOKE_MIN_SUCCESSFUL_TPS:-205}\"",
        "SWEEP_RECOMMENDATION_ENV",
        "SWEEP_RECOMMENDATION_JSON",
        "SWEEP_RECOMMENDATION_STATUS",
        "scripts/recommend-write200-sweep-candidate.py",
        "DEFAULT_WORKERS=\"${CALIPER_WORKERS:-4}\"",
        "DEFAULT_TARGET_TPS=\"${CALIPER_WRITE_TARGET_TPS:-400}\"",
        "SMOKE_WORKERS=\"${SMOKE_WORKERS:-${DEFAULT_WORKERS}}\"",
        "SMOKE_TARGET_TPS=\"${SMOKE_TARGET_TPS:-${DEFAULT_TARGET_TPS}}\"",
        "OFFICIAL_WORKERS=\"${OFFICIAL_WORKERS:-${CALIPER_WORKERS:-${SMOKE_WORKERS}}}\"",
        "OFFICIAL_TARGET_TPS=\"${OFFICIAL_TARGET_TPS:-${CALIPER_WRITE_TARGET_TPS:-${SMOKE_TARGET_TPS}}}\"",
        "smoke-quality-gate",
        "smoke_quality_gate_failed_sweep_requested_official_skipped",
        "handoff_readiness_failed",
        "HANDOFF_READINESS_RC",
        "CALIPER_VERIFY_PREPARED_EACH_REPEAT=false",
        "COLLECT_HOST_RESOURCE_STATS=\"${COLLECT_HOST_RESOURCE_STATS:-true}\"",
        "CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=\"${CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY:-180}\"",
        "CALIPER_OBSERVER_INTERNAL_INTERVAL=\"${CALIPER_OBSERVER_INTERNAL_INTERVAL:-10000}\"",
        "CALIPER_EXEC_MODE=\"${CALIPER_EXEC_MODE:-docker}\"",
        "CALIPER_ENDPOINT_MODE=\"${CALIPER_ENDPOINT_MODE:-docker}\"",
        "CALIPER_DOCKER_NETWORK=\"${CALIPER_DOCKER_NETWORK:-passport_net}\"",
        "CALIPER_RECORD_AUTO_ID=\"${CALIPER_RECORD_AUTO_ID:-true}\"",
        "CALIPER_WRITE_ROUND_LABEL=write-bmu-data",
        "CALIPER_WRITE_WORKLOAD_MODULE=workloads/recordBMUData.js",
        "CALIPER_WRITE_CONTRACT_FUNCTION=RecordBMUDataAutoID",
        "BENCHMARK_CC_INSTALL_ORGS=1,2,3,4",
        "blocked_invalid_official_shape",
        "CALIPER_RECORD_AUTO_ID must be true for chaincode hot-path official evidence",
        "CALIPER_RECORD_AUTO_ID=\"${CALIPER_RECORD_AUTO_ID}\"",
        "WORKLOAD_SELFTEST_RC",
        "node scripts/test-caliper-bmu-workload-sequence.js",
        "workload_selftest_failed",
    ],
    "scripts/test-caliper-bmu-workload-sequence.js": [
        "RecordBMUDataAutoID",
        "RecordBMUData",
        "caliper BMU workload sequence selftest passed",
        "assertRoundRobinSuffixes",
        "assertRequestTemplateReuse",
        "assertInvalidEnv",
        "collectConcurrentSingleSlotRequests",
        "fcStringCacheLength",
        "fcStart: '500000'",
    ],
    "scripts/test-official-write200-verifier-gates.sh": [
        "OFFICIAL_WRITE200_VERIFIER_GATES_SELFTEST_STATUS=pass",
        "bad-workload",
        "bad-ledger",
        "bad-host",
        "ledger world-state reconciliation must match expected successful commits",
        "TOTAL_EXPECTED",
        "CALIPER_WRITE_CONTRACT_FUNCTION must be RecordBMUDataAutoID",
    ],
    "scripts/test-offhost-return-bundle-required-context.sh": [
        "RETURN_BUNDLE_REQUIRED_CONTEXT_SELFTEST_STATUS",
        "operator-context/workload-sequence-selftest.log",
        "GOOD_TAR_HAS_WORKLOAD_SELFTEST_LOG",
    ],
    "scripts/test-portable-fallback-import-route.sh": [
        "OMX_WRITE200_OUT_selftest.tar.gz",
        "SELECTED_KIND=${selected_kind}",
        "selected_kind}\" != \"diagnostic\"",
        "scripts/import-latest-offhost-write200-bundle.sh",
        "--dry-run",
    ],
    "scripts/run-stronger-host-direct-official.sh": [
        "CALIPER_WORKERS=\"${CALIPER_WORKERS:-4}\"",
        "CALIPER_WRITE_TARGET_TPS=\"${CALIPER_WRITE_TARGET_TPS:-400}\"",
        "CALIPER_WRITE_TX_NUMBER=\"${CALIPER_WRITE_TX_NUMBER:-10000}\"",
        "CALIPER_RECORD_AUTO_ID=\"${CALIPER_RECORD_AUTO_ID:-true}\"",
        "CALIPER_RECORD_AUTO_ID must be true for official chaincode hot-path evidence",
        "CALIPER_WRITE_TX_NUMBER must be >=10000 for official write200 evidence",
        "write_finished_wrapper_status()",
        "write_portable_operator_status()",
        "STATUS=direct_official_wrapper_fallback",
        "synthetic operator-status.env",
        "external_status_file_after_archive_creation",
        "OMX_WRITE200_OUT_BUNDLE_SHA256",
        "apply-overlay.log",
        "VERIFIER_SELFTEST_RC",
        "WORKLOAD_SELFTEST_RC",
        "node scripts/test-caliper-bmu-workload-sequence.js",
        "Caliper BMU workload selftest failed",
        "scripts/test-official-write200-verifier-gates.sh",
        "verifier gate selftest failed",
        "trap on_exit EXIT",
    ],
    ".omx/plans/evaluate-chaincode-hotpath-write200.sh": [
        "OFFICIAL_WRITE_HOST_READINESS_STATUS",
        "OFFICIAL_WRITE_ALLOW_UNDERPOWERED",
        "OFFICIAL_WRITE_RECORD_AUTO_ID",
        "OFFICIAL_WRITE_WORKLOAD_MODULE",
        "OFFICIAL_WRITE_CONTRACT_FUNCTION",
        "OFFICIAL_WRITE_LEDGER_RECONCILIATION_MATCH",
        "OFFICIAL_WRITE_LEDGER_CSV_TOTAL_EXPECTED",
        "OFFICIAL_WRITE_TXMAP_CALLBACK_REPEAT_COUNT",
        "CALIPER_WRITE_TX_NUMBER",
        "OFFICIAL_WRITE_TX_NUMBER",
        "BENCHMARK_CC_INSTALL_ORGS",
    ],
    f"{goal_dir}/evaluate.sh": [
        "exec bash .omx/plans/evaluate-chaincode-hotpath-write200.sh",
    ],
}
for rel, phrases in script_phrase_checks.items():
    path = root / rel
    if not path.exists():
        continue
    text = path.read_text(errors="replace")
    for phrase in phrases:
        add(f"script-phrase:{rel}:{phrase}", phrase in text, "present" if phrase in text else "missing")

for rel, phrases in {
    "caliper-workspace/workloads/recordBMUData.js": [
        "this.passportIds",
        "this.dids",
        "this.recordIds",
        "this.dataHashes",
        "this.passportIds.length",
    ],
    "scripts/create-offhost-write200-handoff-bundle.sh": [
        "export CALIPER_WORKERS=60",
        "export CALIPER_WRITE_TARGET_TPS=240",
        "export SMOKE_WORKERS=60",
        "export SMOKE_TARGET_TPS=240",
        "export OFFICIAL_WORKERS=60",
        "export OFFICIAL_TARGET_TPS=240",
    ],
}.items():
    path = root / rel
    if not path.exists():
        continue
    text = path.read_text(errors="replace")
    for phrase in phrases:
        add(f"script-negative-phrase:{rel}:{phrase}", phrase not in text, "absent" if phrase not in text else "present")

result = {
    "ok": not failures,
    "status": "ready" if not failures else "not_ready",
    "root": str(root),
    "goalDir": str(root / goal_dir),
    "checks": checks,
    "failures": failures,
    "nextCommand": "PERFORMANCE_GOAL_SLUG=chaincode-hotpath-write200 EVIDENCE_BASE=.omx/evidence/blockchain/chaincode-hotpath-write200/offhost-$(date +%Y%m%dT%H%M%S%Z) UPDATE_PERFORMANCE_GOAL_RESULTS=true scripts/run-official-write200-audit.sh",
    "ingestCommand": "scripts/ingest-offhost-write200-evidence.sh --evidence-dir <evidence-dir>",
}
out.write_text(json.dumps(result, indent=2, ensure_ascii=False))
print(json.dumps(result, indent=2, ensure_ascii=False))
sys.exit(0 if result["ok"] else 1)
PY
