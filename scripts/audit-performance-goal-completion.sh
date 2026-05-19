#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SLUG="${PERFORMANCE_GOAL_SLUG:-chaincode-hotpath-write200}"
GOAL_DIR=""
RESULTS_ENV=""
OFFICIAL_EVIDENCE_DIR=""
OUT_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/audit-performance-goal-completion.sh [--official-evidence-dir <dir>] [--out-dir <dir>] [--slug <slug>]

Builds a prompt-to-artifact completion audit for the chaincode-hotpath write200
performance goal. It runs the performance-goal evaluator, verifies the official
write200 evidence, inspects the safety/readiness result env, and writes:
  - completion-audit.md
  - completion-audit.json
  - completion-audit.env

Exit codes:
  0  every hard gate is covered and passes
  1  audit completed but at least one hard gate is missing/failing
  2  malformed inputs or missing evaluator/results files

This script never calls Codex update_goal.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --official-evidence-dir)
      OFFICIAL_EVIDENCE_DIR="${2:-}"
      shift 2
      ;;
    --out-dir)
      OUT_DIR="${2:-}"
      shift 2
      ;;
    --slug)
      SLUG="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

GOAL_DIR=".omx/goals/performance/${SLUG}"
RESULTS_ENV="${GOAL_DIR}/latest-results.env"
EVALUATOR="${GOAL_DIR}/evaluate.sh"

if [[ ! -f "${RESULTS_ENV}" ]]; then
  echo "latest-results.env missing: ${RESULTS_ENV}" >&2
  exit 2
fi
if [[ ! -x "${EVALUATOR}" && ! -f "${EVALUATOR}" ]]; then
  echo "evaluator missing: ${EVALUATOR}" >&2
  exit 2
fi

TS="$(date +%Y%m%dT%H%M%S%Z)"
if [[ -z "${OUT_DIR}" ]]; then
  OUT_DIR=".omx/evidence/blockchain/${SLUG}/completion-audit-${TS}"
fi
mkdir -p "${OUT_DIR}"
OUT_DIR="$(cd "${OUT_DIR}" && pwd)"

if [[ -z "${OFFICIAL_EVIDENCE_DIR}" ]]; then
  OFFICIAL_EVIDENCE_DIR="$(python3 - "${RESULTS_ENV}" <<'PY'
import shlex, sys
value = ""
for raw in open(sys.argv[1], errors="replace"):
    line = raw.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, val = line.split("=", 1)
    if key.strip() == "EVIDENCE_BUNDLE":
        try:
            parts = shlex.split(val.strip())
            val = parts[0] if len(parts) == 1 else val.strip()
        except Exception:
            val = val.strip().strip('"').strip("'")
        value = val
print(value)
PY
)"
fi

EVALUATOR_LOG="${OUT_DIR}/evaluator.log"
OFFICIAL_VERIFY_JSON="${OUT_DIR}/official-write-verify.json"
OFFICIAL_VERIFY_ENV="${OUT_DIR}/official-write-verify.env"
OFFICIAL_VERIFY_LOG="${OUT_DIR}/official-write-verify.log"
AUDIT_JSON="${OUT_DIR}/completion-audit.json"
AUDIT_MD="${OUT_DIR}/completion-audit.md"
AUDIT_ENV="${OUT_DIR}/completion-audit.env"

set +e
bash "${EVALUATOR}" > "${EVALUATOR_LOG}" 2>&1
EVALUATOR_RC=$?
set -e

OFFICIAL_VERIFY_RC=2
if [[ -n "${OFFICIAL_EVIDENCE_DIR}" && -d "${OFFICIAL_EVIDENCE_DIR}" ]]; then
  set +e
  scripts/verify-official-write200-evidence.sh \
    --evidence-dir "${OFFICIAL_EVIDENCE_DIR}" \
    --output "${OFFICIAL_VERIFY_JSON}" \
    --env-output "${OFFICIAL_VERIFY_ENV}" \
    > "${OFFICIAL_VERIFY_LOG}" 2>&1
  OFFICIAL_VERIFY_RC=$?
  set -e
else
  {
    echo "Official evidence dir missing: ${OFFICIAL_EVIDENCE_DIR}"
  } > "${OFFICIAL_VERIFY_LOG}"
fi

python3 - \
  "${RESULTS_ENV}" \
  "${OFFICIAL_EVIDENCE_DIR}" \
  "${EVALUATOR_RC}" \
  "${EVALUATOR_LOG}" \
  "${OFFICIAL_VERIFY_RC}" \
  "${OFFICIAL_VERIFY_JSON}" \
  "${OFFICIAL_VERIFY_LOG}" \
  "${AUDIT_JSON}" \
  "${AUDIT_MD}" \
  "${AUDIT_ENV}" <<'PY'
import json
import shlex
import sys
from pathlib import Path

(
    results_env,
    official_evidence_dir,
    evaluator_rc,
    evaluator_log,
    official_verify_rc,
    official_verify_json,
    official_verify_log,
    audit_json,
    audit_md,
    audit_env,
) = sys.argv[1:]

results_env = Path(results_env)
official_verify_json = Path(official_verify_json)
evaluator_rc = int(evaluator_rc)
official_verify_rc = int(official_verify_rc)

def parse_env(path):
    data = {}
    for raw in path.read_text(errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip()
        try:
            parts = shlex.split(val)
            if len(parts) == 1:
                val = parts[0]
        except Exception:
            val = val.strip('"').strip("'")
        data[key] = val
    return data

env = parse_env(results_env)

def fnum(key):
    try:
        return float(env.get(key, ""))
    except Exception:
        return None

def truth(key):
    return env.get(key) == "true"

official = {}
if official_verify_json.exists():
    try:
        official = json.loads(official_verify_json.read_text())
    except Exception as exc:
        official = {"status": "error", "inputErrors": [str(exc)]}
else:
    official = {"status": "error", "inputErrors": [f"missing {official_verify_json}"]}

checks = []

def add(req, evidence, passed, detail):
    checks.append({
        "requirement": req,
        "evidence": evidence,
        "passed": bool(passed),
        "detail": detail,
    })

add(
    "Official 4-org Caliper write200 10-repeat hard gate",
    f"{official_evidence_dir}; {official_verify_json}; {official_verify_log}",
    official_verify_rc == 0 and official.get("status") == "pass",
    "official verifier PASS" if official_verify_rc == 0 else "; ".join((official.get("failures") or official.get("inputErrors") or [f"verifier rc={official_verify_rc}"])[:8]),
)

add(
    "Performance-goal evaluator covers all hard gates",
    evaluator_log,
    evaluator_rc == 0,
    "evaluator PASS" if evaluator_rc == 0 else Path(evaluator_log).read_text(errors="replace")[-800:],
)

host_readiness = official.get("hostReadiness") or {}
launch = official.get("launch") or {}
add(
    "Official evidence host is ready and not underpowered-overridden",
    f"{official_evidence_dir}/host-readiness.json; {official_evidence_dir}/launch.env; {official_verify_json}",
    host_readiness.get("present") is True
    and host_readiness.get("status") == "ready"
    and host_readiness.get("ready") is True
    and host_readiness.get("allowUnderpowered") is False
    and str(launch.get("allowUnderpowered", "")).lower() == "false"
    and env.get("OFFICIAL_WRITE_HOST_READINESS_STATUS") == "ready"
    and env.get("OFFICIAL_WRITE_ALLOW_UNDERPOWERED") == "false",
    (
        f"hostPresent={host_readiness.get('present')} "
        f"hostStatus={host_readiness.get('status')} "
        f"hostReady={host_readiness.get('ready')} "
        f"hostAllowUnderpowered={host_readiness.get('allowUnderpowered')} "
        f"launchAllowUnderpowered={launch.get('allowUnderpowered')} "
        f"OFFICIAL_WRITE_HOST_READINESS_STATUS={env.get('OFFICIAL_WRITE_HOST_READINESS_STATUS')} "
        f"OFFICIAL_WRITE_ALLOW_UNDERPOWERED={env.get('OFFICIAL_WRITE_ALLOW_UNDERPOWERED')}"
    ),
)

add(
    "Chaincode tests/static baseline recorded",
    f"{env.get('CHAINCODE_TEST_COMMAND', '')}; {results_env.as_posix()}",
    truth("CHAINCODE_TESTS_PASS")
    and truth("STATIC_CHECKS_PASS")
    and truth("GO_TEST_BASELINE_RECORDED")
    and bool(env.get("CHAINCODE_TEST_COMMAND"))
    and env.get("GO_TEST_VENDOR_STATUS") in {"ok", "inconsistent_vendor", "not_applicable"},
    f"CHAINCODE_TESTS_PASS={env.get('CHAINCODE_TESTS_PASS')} STATIC_CHECKS_PASS={env.get('STATIC_CHECKS_PASS')} GO_TEST_BASELINE_RECORDED={env.get('GO_TEST_BASELINE_RECORDED')} GO_TEST_VENDOR_STATUS={env.get('GO_TEST_VENDOR_STATUS')} CHAINCODE_TEST_COMMAND={env.get('CHAINCODE_TEST_COMMAND')}",
)

def zero_count(key):
    try:
        return int(env.get(key, "")) == 0
    except Exception:
        return False

add(
    "Hot-binding readiness evidence",
    results_env.as_posix(),
    truth("HOT_BINDING_READINESS_RECORDED")
    and env.get("HOT_BINDING_READINESS_METHOD") in {"direct_ledger_inspection", "read_only_diagnostic", "prep_verify_proxy"}
    and zero_count("HOT_BINDING_MISSING_COUNT")
    and zero_count("HOT_BINDING_LEGACY_COUNT")
    and zero_count("HOT_BINDING_MISMATCH_COUNT"),
    f"HOT_BINDING_READINESS_RECORDED={env.get('HOT_BINDING_READINESS_RECORDED')} METHOD={env.get('HOT_BINDING_READINESS_METHOD')} missing={env.get('HOT_BINDING_MISSING_COUNT')} legacy={env.get('HOT_BINDING_LEGACY_COUNT')} mismatch={env.get('HOT_BINDING_MISMATCH_COUNT')}",
)

add(
    "Live-channel default-deny and no live passportchannel mutation",
    env.get("LIVE_DIAGNOSTIC_LOG", results_env.as_posix()),
    truth("DEFAULT_DENY_CHANNEL_GUARD_RECORDED")
    and truth("OFFICIAL_WRITE_CHANNEL_NOT_PASSPORTCHANNEL")
    and truth("NO_LIVE_CHANNEL_MUTATION")
    and truth("LIVE_RESET_PERFORMED_FALSE"),
    f"DEFAULT_DENY_CHANNEL_GUARD_RECORDED={env.get('DEFAULT_DENY_CHANNEL_GUARD_RECORDED')} OFFICIAL_WRITE_CHANNEL_NOT_PASSPORTCHANNEL={env.get('OFFICIAL_WRITE_CHANNEL_NOT_PASSPORTCHANNEL')} NO_LIVE_CHANNEL_MUTATION={env.get('NO_LIVE_CHANNEL_MUTATION')} LIVE_RESET_PERFORMED_FALSE={env.get('LIVE_RESET_PERFORMED_FALSE')}",
)

add(
    "Production-safe behavior gates",
    results_env.as_posix(),
    truth("NO_API_BREAK")
    and truth("NO_BENCHMARK_SHORTCUT")
    and truth("RESET_FC_FOR_DID_SAFE")
    and truth("INVALIDATE_BMU_RECORD_SAFE"),
    f"NO_API_BREAK={env.get('NO_API_BREAK')} NO_BENCHMARK_SHORTCUT={env.get('NO_BENCHMARK_SHORTCUT')} RESET_FC_FOR_DID_SAFE={env.get('RESET_FC_FOR_DID_SAFE')} INVALIDATE_BMU_RECORD_SAFE={env.get('INVALIDATE_BMU_RECORD_SAFE')}",
)

add(
    "Official benchmark shape is the required 4-org successful-commit profile",
    results_env.as_posix(),
    env.get("WRITE_KPI_BASIS") == "successful_commit"
    and env.get("BENCHMARK_PROFILE") == "PassportBenchmarkChannel"
    and env.get("BENCHMARK_CHANNEL_ORGS", "").replace(" ", "") == "1,2,3,4"
    and env.get("BENCHMARK_CC_INSTALL_ORGS", "").replace(" ", "") == "1,2,3,4"
    and int(env.get("REPEAT_RUN_COUNT", "0") or "0") >= 10
    and truth("ALL_RUNS_SUCC_EXPECTED")
    and truth("ALL_RUNS_FAIL_ZERO")
    and truth("ALL_RUNS_REJECT_ZERO"),
    f"WRITE_KPI_BASIS={env.get('WRITE_KPI_BASIS')} BENCHMARK_PROFILE={env.get('BENCHMARK_PROFILE')} CHANNEL_ORGS={env.get('BENCHMARK_CHANNEL_ORGS')} CC_INSTALL_ORGS={env.get('BENCHMARK_CC_INSTALL_ORGS')} REPEAT_RUN_COUNT={env.get('REPEAT_RUN_COUNT')} succ={env.get('ALL_RUNS_SUCC_EXPECTED')} fail0={env.get('ALL_RUNS_FAIL_ZERO')} reject0={env.get('ALL_RUNS_REJECT_ZERO')}",
)

add(
    "Official hot-path shape uses production-safe AutoID path",
    f"{results_env.as_posix()}; {official_verify_json}",
    env.get("OFFICIAL_WRITE_RECORD_AUTO_ID") == "true",
    f"OFFICIAL_WRITE_RECORD_AUTO_ID={env.get('OFFICIAL_WRITE_RECORD_AUTO_ID')} verifier_launch_autoid={(official.get('launch') or {}).get('caliperRecordAutoId')}",
)

workload = official.get("workload") or {}
add(
    "Official BMU write workload identity is RecordBMUDataAutoID",
    f"{results_env.as_posix()}; {official_verify_json}; launch.env; effective-config.env; summary.env",
    env.get("OFFICIAL_WRITE_ROUND_LABEL") == "write-bmu-data"
    and env.get("OFFICIAL_WRITE_WORKLOAD_MODULE") == "workloads/recordBMUData.js"
    and env.get("OFFICIAL_WRITE_CONTRACT_FUNCTION") == "RecordBMUDataAutoID"
    and workload.get("launchRoundLabel") == "write-bmu-data"
    and workload.get("launchModule") == "workloads/recordBMUData.js"
    and workload.get("launchContractFunction") == "RecordBMUDataAutoID"
    and workload.get("effectiveRoundLabel") == "write-bmu-data"
    and workload.get("effectiveModule") == "workloads/recordBMUData.js"
    and workload.get("effectiveContractFunction") == "RecordBMUDataAutoID"
    and workload.get("summaryRoundLabel") == "write-bmu-data"
    and workload.get("summaryModule") == "workloads/recordBMUData.js"
    and workload.get("summaryContractFunction") == "RecordBMUDataAutoID",
    (
        f"envLabel={env.get('OFFICIAL_WRITE_ROUND_LABEL')} "
        f"envModule={env.get('OFFICIAL_WRITE_WORKLOAD_MODULE')} "
        f"envFunction={env.get('OFFICIAL_WRITE_CONTRACT_FUNCTION')} "
        f"launch=({workload.get('launchRoundLabel')},{workload.get('launchModule')},{workload.get('launchContractFunction')}) "
        f"effective=({workload.get('effectiveRoundLabel')},{workload.get('effectiveModule')},{workload.get('effectiveContractFunction')}) "
        f"summary=({workload.get('summaryRoundLabel')},{workload.get('summaryModule')},{workload.get('summaryContractFunction')})"
    ),
)

txmap_callback = official.get("txmapCallback") or {}
ledger = official.get("ledger") or {}
add(
    "Official successful_commit basis is proven by ledger reconciliation and txmap callback",
    f"{results_env.as_posix()}; {official_verify_json}; ledger-reconciliation.json; txmap-repeat-summary*.json",
    env.get("OFFICIAL_WRITE_LEDGER_RECONCILIATION_MATCH") == "true"
    and env.get("OFFICIAL_WRITE_LEDGER_EXPECTED")
    and env.get("OFFICIAL_WRITE_LEDGER_EXPECTED") == env.get("OFFICIAL_WRITE_LEDGER_CSV_TOTAL_EXPECTED")
    and env.get("OFFICIAL_WRITE_LEDGER_TXMAP_SUCCESS_VERIFIED") == env.get("OFFICIAL_WRITE_LEDGER_EXPECTED")
    and env.get("OFFICIAL_WRITE_LEDGER_TXMAP_ERRORS") in {"0", "0.0"}
    and env.get("OFFICIAL_WRITE_TXMAP_CALLBACK_PRESENT") == "true"
    and env.get("OFFICIAL_WRITE_TXMAP_CALLBACK_BASIS") == "caliper_sendRequests_txmap_callback"
    and env.get("OFFICIAL_WRITE_TXMAP_CALLBACK_ALL_SUCCESS_VERIFIED") == "true"
    and int(env.get("OFFICIAL_WRITE_TXMAP_CALLBACK_REPEAT_COUNT", "0") or "0") >= 10
    and ledger.get("ledgerWorldStateMatchesExpected") is True
    and txmap_callback.get("present") is True
    and txmap_callback.get("basis") == "caliper_sendRequests_txmap_callback"
    and txmap_callback.get("allRunsSuccessVerified") is True
    and int(txmap_callback.get("repeatCount") or 0) >= 10,
    (
        f"envLedgerMatch={env.get('OFFICIAL_WRITE_LEDGER_RECONCILIATION_MATCH')} "
        f"envLedgerExpected={env.get('OFFICIAL_WRITE_LEDGER_EXPECTED')} "
        f"envCsvTotalExpected={env.get('OFFICIAL_WRITE_LEDGER_CSV_TOTAL_EXPECTED')} "
        f"envLedgerTxmapSuccess={env.get('OFFICIAL_WRITE_LEDGER_TXMAP_SUCCESS_VERIFIED')} "
        f"envLedgerTxmapErrors={env.get('OFFICIAL_WRITE_LEDGER_TXMAP_ERRORS')} "
        f"envTxmapPresent={env.get('OFFICIAL_WRITE_TXMAP_CALLBACK_PRESENT')} "
        f"envTxmapBasis={env.get('OFFICIAL_WRITE_TXMAP_CALLBACK_BASIS')} "
        f"envTxmapRepeatCount={env.get('OFFICIAL_WRITE_TXMAP_CALLBACK_REPEAT_COUNT')} "
        f"envTxmapAllSuccess={env.get('OFFICIAL_WRITE_TXMAP_CALLBACK_ALL_SUCCESS_VERIFIED')} "
        f"ledgerWorldStateMatchesExpected={ledger.get('ledgerWorldStateMatchesExpected')} "
        f"txmapCallback=({txmap_callback.get('present')},{txmap_callback.get('basis')},{txmap_callback.get('repeatCount')},{txmap_callback.get('allRunsSuccessVerified')})"
    ),
)

def int_at_least(key, threshold):
    try:
        return int(env.get(key, "")) >= threshold
    except Exception:
        return False

add(
    "Official workload size is not shortened below write200 gate shape",
    f"{results_env.as_posix()}; {official_verify_json}",
    int_at_least("CALIPER_WRITE_TX_NUMBER", 10000)
    and (not env.get("OFFICIAL_WRITE_TX_NUMBER") or int_at_least("OFFICIAL_WRITE_TX_NUMBER", 10000)),
    f"CALIPER_WRITE_TX_NUMBER={env.get('CALIPER_WRITE_TX_NUMBER')} OFFICIAL_WRITE_TX_NUMBER={env.get('OFFICIAL_WRITE_TX_NUMBER')} verifier_write_tx={(official.get('summary') or {}).get('writeTxNumber')}",
)

status = "pass" if all(c["passed"] for c in checks) else "fail"
missing = [c for c in checks if not c["passed"]]
result = {
    "status": status,
    "resultsEnv": str(results_env),
    "officialEvidenceDir": official_evidence_dir,
    "evaluatorRc": evaluator_rc,
    "officialVerifyRc": official_verify_rc,
    "checks": checks,
    "missingOrFailing": missing,
}
Path(audit_json).write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")

lines = [
    "# Completion audit — chaincode-hotpath-write200 performance goal",
    "",
    "## Objective as success criteria",
    "",
    "1. Official 4-org Caliper write200 10 repeats pass on successful commit basis: every row `Succ==expected`, `Fail=0`, `Reject=0`, `p50>=200`, `p10>=150`, `min>=150`.",
    "2. Official evidence comes from a ready benchmark host with `ALLOW_UNDERPOWERED=false`; local underpowered/proxy evidence is not sufficient.",
    "3. Chaincode tests/static checks and baseline status are recorded.",
    "4. Hot-binding readiness is evidenced with zero missing/legacy/mismatch counts.",
    "5. Live `passportchannel` remains protected by default-deny and no mutation.",
    "6. Existing API shape and production behavior are preserved; no benchmark shortcut is used.",
    "7. Official hot-path writes use the production-safe `RecordBMUDataAutoID` path (`CALIPER_RECORD_AUTO_ID=true`), not the legacy duplicate-read path.",
    "8. Official evidence proves the Caliper write round is BMU workload `write-bmu-data` using `workloads/recordBMUData.js` and `RecordBMUDataAutoID`.",
    "9. Official successful_commit evidence is backed by ledger reconciliation and Caliper txmap callback success verification, not only report table proxy values.",
    "10. Official write repeats use at least `CALIPER_WRITE_TX_NUMBER=10000` transactions per repeat.",
    "11. ResetFCForDID and InvalidateBMURecord preserve canonical `lastFc` binding safety.",
    "",
    "## Prompt-to-artifact checklist",
    "",
    "| Requirement | Evidence | Result | Detail |",
    "| --- | --- | --- | --- |",
]
for c in checks:
    mark = "PASS" if c["passed"] else "FAIL"
    detail = str(c["detail"]).replace("\n", "<br>")
    evidence = str(c["evidence"]).replace("|", "\\|")
    lines.append(f"| {c['requirement']} | `{evidence}` | {mark} | {detail} |")
lines += [
    "",
    "## Verdict",
    "",
    "PASS — goal can be considered complete after Codex get_goal reconciliation." if status == "pass" else "FAIL/BLOCKED — do not call Codex `update_goal`; continue or wait for stronger-host official PASS return bundle.",
]
Path(audit_md).write_text("\n".join(lines) + "\n")
Path(audit_env).write_text(
    "\n".join([
        f"COMPLETION_AUDIT_STATUS={status}",
        f"COMPLETION_AUDIT_JSON={audit_json}",
        f"COMPLETION_AUDIT_MD={audit_md}",
        f"EVALUATOR_RC={evaluator_rc}",
        f"OFFICIAL_WRITE_VERIFY_RC={official_verify_rc}",
        f"MISSING_OR_FAILING_COUNT={len(missing)}",
    ]) + "\n"
)
print(Path(audit_md).read_text())
sys.exit(0 if status == "pass" else 1)
PY

cat "${AUDIT_ENV}"
source "${AUDIT_ENV}"
if [[ "${COMPLETION_AUDIT_STATUS}" == "pass" ]]; then
  exit 0
fi
exit 1
