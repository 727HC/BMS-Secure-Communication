#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/verify-official-write200-evidence.sh --evidence-dir <dir> [--output <json>] [--env-output <env>]

Verifies the official 4-org write200 evidence bundle produced by
scripts/blockchain-tps-reproducibility.sh.

Exit codes:
  0  official write gate passes
  1  evidence is readable but the official write gate fails
  2  required evidence is missing or malformed
USAGE
}

EVIDENCE_DIR=""
OUTPUT_JSON=""
OUTPUT_ENV=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --evidence-dir)
      EVIDENCE_DIR="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_JSON="${2:-}"
      shift 2
      ;;
    --env-output)
      OUTPUT_ENV="${2:-}"
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

if [[ -z "${EVIDENCE_DIR}" ]]; then
  echo "--evidence-dir is required" >&2
  usage >&2
  exit 2
fi

python3 - "$EVIDENCE_DIR" "$OUTPUT_JSON" "$OUTPUT_ENV" <<'PY'
import csv
import json
import os
import shlex
import sys
from pathlib import Path

evidence = Path(sys.argv[1]).resolve()
out_json = Path(sys.argv[2]).resolve() if sys.argv[2] else None
out_env = Path(sys.argv[3]).resolve() if sys.argv[3] else None

failures = []
input_errors = []

def parse_env(path):
    data = {}
    if not path.exists():
        input_errors.append(f"missing env file: {path}")
        return data
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

def as_float(env, key):
    try:
        return float(env.get(key, ""))
    except Exception:
        input_errors.append(f"{key} is not numeric: {env.get(key)!r}")
        return None

def as_int(env, key):
    try:
        return int(env.get(key, ""))
    except Exception:
        input_errors.append(f"{key} is not integer: {env.get(key)!r}")
        return None

summary_env_path = evidence / "summary.env"
summary_json_path = evidence / "summary.json"
csv_path = evidence / "repeat-results.csv"
reconcile_path = evidence / "ledger-reconciliation.json"
final_status_path = evidence / "final-status.env"
launch_env_path = evidence / "launch.env"
effective_config_path = evidence / "effective-config.env"
host_readiness_path = evidence / "host-readiness.json"

summary = parse_env(summary_env_path)
final_status = parse_env(final_status_path) if final_status_path.exists() else {}
launch = parse_env(launch_env_path) if launch_env_path.exists() else {}
effective = parse_env(effective_config_path) if effective_config_path.exists() else {}

if not launch_env_path.exists():
    failures.append(f"launch.env missing: {launch_env_path}")
if not effective_config_path.exists():
    failures.append(f"effective-config.env missing: {effective_config_path}")
allow_underpowered = str(launch.get("ALLOW_UNDERPOWERED", "")).lower()
if allow_underpowered != "false":
    failures.append(f"ALLOW_UNDERPOWERED must be false for official PASS, got {launch.get('ALLOW_UNDERPOWERED')!r}")
record_auto_id = str(launch.get("CALIPER_RECORD_AUTO_ID", "")).lower()
if record_auto_id != "true":
    failures.append(f"CALIPER_RECORD_AUTO_ID must be true for chaincode hot-path official PASS, got {launch.get('CALIPER_RECORD_AUTO_ID')!r}")

expected_workload = {
    "CALIPER_WRITE_ROUND_LABEL": "write-bmu-data",
    "CALIPER_WRITE_WORKLOAD_MODULE": "workloads/recordBMUData.js",
    "CALIPER_WRITE_CONTRACT_FUNCTION": "RecordBMUDataAutoID",
}
for key, expected in expected_workload.items():
    for source_name, source, path in [
        ("launch.env", launch, launch_env_path),
        ("effective-config.env", effective, effective_config_path),
        ("summary.env", summary, summary_env_path),
    ]:
        if source.get(key) != expected:
            failures.append(f"{source_name} {key} must be {expected} for BMU AutoID write200 evidence, got {source.get(key)!r} ({path})")

host_readiness_summary = {"present": False}
if host_readiness_path.exists():
    try:
        host_readiness = json.loads(host_readiness_path.read_text())
        host_readiness_summary = {
            "present": True,
            "path": str(host_readiness_path),
            "status": host_readiness.get("status"),
            "ready": host_readiness.get("ready"),
            "allowUnderpowered": host_readiness.get("allowUnderpowered"),
            "dockerCpus": host_readiness.get("dockerCpus"),
            "dockerMemoryGiB": host_readiness.get("dockerMemoryGiB"),
            "minDockerCpus": host_readiness.get("minDockerCpus"),
            "minDockerMemoryGiB": host_readiness.get("minDockerMemoryGiB"),
        }
        if host_readiness.get("status") != "ready" or host_readiness.get("ready") is not True:
            failures.append(f"host readiness must be ready for official PASS, got status={host_readiness.get('status')!r} ready={host_readiness.get('ready')!r}")
        if host_readiness.get("allowUnderpowered") is not False:
            failures.append(f"host readiness allowUnderpowered must be false for official PASS, got {host_readiness.get('allowUnderpowered')!r}")
    except Exception as exc:
        input_errors.append(f"cannot read host readiness JSON {host_readiness_path}: {exc}")
else:
    failures.append(f"host-readiness.json missing: {host_readiness_path}")

if summary.get("WRITE_KPI_BASIS") != "successful_commit":
    failures.append("WRITE_KPI_BASIS must be successful_commit")
if summary.get("BENCHMARK_PROFILE") != "PassportBenchmarkChannel":
    failures.append("BENCHMARK_PROFILE must be PassportBenchmarkChannel")
if summary.get("BENCHMARK_CHANNEL_ORGS", "").replace(" ", "") != "1,2,3,4":
    failures.append("BENCHMARK_CHANNEL_ORGS must be 1,2,3,4")
if summary.get("BENCHMARK_CC_INSTALL_ORGS", "").replace(" ", "") != "1,2,3,4":
    failures.append("BENCHMARK_CC_INSTALL_ORGS must be 1,2,3,4")

repeat_count = as_int(summary, "REPEAT_RUN_COUNT")
if repeat_count is not None and repeat_count < 10:
    failures.append(f"REPEAT_RUN_COUNT {repeat_count} < 10")

write_tx_number = as_int(summary, "CALIPER_WRITE_TX_NUMBER")
if write_tx_number is not None and write_tx_number < 10000:
    failures.append(f"CALIPER_WRITE_TX_NUMBER {write_tx_number} < 10000")

thresholds = {
    "WRITE200_P50_TPS": 200.0,
    "WRITE200_P10_TPS": 150.0,
    "WRITE200_MIN_TPS": 150.0,
}
for key, threshold in thresholds.items():
    value = as_float(summary, key)
    if value is not None and value < threshold:
        failures.append(f"{key} {value} < {threshold:g}")

for key in ["ALL_RUNS_SUCC_EXPECTED", "ALL_RUNS_FAIL_ZERO", "ALL_RUNS_REJECT_ZERO"]:
    if summary.get(key) != "true":
        failures.append(f"{key} must be true")

rows = []
csv_total_expected = None
if not csv_path.exists():
    input_errors.append(f"missing repeat-results.csv: {csv_path}")
else:
    try:
        with csv_path.open(newline="") as f:
            rows = list(csv.DictReader(f))
    except Exception as exc:
        input_errors.append(f"cannot read CSV {csv_path}: {exc}")
    if len(rows) < 10:
        failures.append(f"repeat-results rows {len(rows)} < 10")
    for idx, row in enumerate(rows, 1):
        try:
            expected = int(row.get("expected", ""))
            succ = int(row.get("succ", ""))
            fail = int(row.get("fail", ""))
            reject = int(row.get("reject", ""))
        except Exception:
            input_errors.append(f"CSV row {idx} has non-integer expected/succ/fail/reject")
            continue
        if succ != expected:
            failures.append(f"CSV row {idx} succ {succ} != expected {expected}")
        if fail != 0:
            failures.append(f"CSV row {idx} fail {fail} != 0")
        if reject != 0:
            failures.append(f"CSV row {idx} reject {reject} != 0")
        if write_tx_number is not None and expected != write_tx_number:
            failures.append(f"CSV row {idx} expected {expected} != CALIPER_WRITE_TX_NUMBER {write_tx_number}")
    if rows:
        try:
            csv_total_expected = sum(int(row.get("expected", "")) for row in rows)
        except Exception:
            csv_total_expected = None

ledger = None
ledger_summary = {"present": False}
txmap_callback_summary = {"present": False}
if reconcile_path.exists():
    try:
        ledger = json.loads(reconcile_path.read_text())
        expected = int(ledger.get("expected", 0) or 0)
        txmap = ledger.get("txmap") or {}
        couch = ledger.get("couchdb") or []
        heights = ledger.get("peerHeights") or []
        couch_counts = [c.get("count") for c in couch]
        ledger_summary = {
            "present": True,
            "classification": ledger.get("classification"),
            "expected": expected,
            "csvTotalExpected": csv_total_expected,
            "txmapLines": txmap.get("lines"),
            "txmapSuccessVerified": txmap.get("successVerifiedCount"),
            "txmapErrors": txmap.get("errorCount"),
            "couchCounts": couch_counts,
            "peerHeights": [h.get("height") for h in heights],
            "ledgerWorldStateMatchesExpected": bool(
                expected
                and txmap.get("successVerifiedCount") == expected
                and txmap.get("errorCount") == 0
                and couch
                and all(count == expected for count in couch_counts)
            ),
        }
        if csv_total_expected is not None and expected != csv_total_expected:
            failures.append(f"ledger expected must equal CSV total expected, got ledger expected={expected}, csv total expected={csv_total_expected}")
        if not ledger_summary["ledgerWorldStateMatchesExpected"]:
            failures.append(
                "ledger world-state reconciliation must match expected successful commits "
                f"(expected={expected}, txmapSuccessVerified={txmap.get('successVerifiedCount')}, "
                f"txmapErrors={txmap.get('errorCount')}, couchCounts={couch_counts})"
            )
        txmap_repeat = ledger.get("txmapRepeatSummary")
        txmap_repeat_path = ledger.get("txmapRepeatSummaryPath")
        if not txmap_repeat and txmap_repeat_path:
            try:
                candidate = Path(txmap_repeat_path)
                if not candidate.is_absolute():
                    candidate = (evidence / candidate).resolve()
                if candidate.exists():
                    txmap_repeat = json.loads(candidate.read_text())
            except Exception as exc:
                input_errors.append(f"cannot read txmap repeat summary {txmap_repeat_path}: {exc}")
        if not txmap_repeat:
            candidates = sorted(evidence.glob("txmap-repeat-summary*.json")) + sorted(evidence.glob("*-txmap-repeat-summary.json"))
            if candidates:
                try:
                    txmap_repeat_path = str(candidates[0])
                    txmap_repeat = json.loads(candidates[0].read_text())
                except Exception as exc:
                    input_errors.append(f"cannot read txmap repeat summary {candidates[0]}: {exc}")
        if txmap_repeat:
            runs = txmap_repeat.get("runs") or []
            txmap_callback_summary = {
                "present": True,
                "basis": txmap_repeat.get("basis"),
                "path": txmap_repeat_path,
                "repeatCount": len(runs),
                "totalLines": sum(int(run.get("lines") or 0) for run in runs),
                "totalSucc": sum(int(run.get("succ") or 0) for run in runs),
                "totalFail": sum(int(run.get("fail") or 0) for run in runs),
                "totalVerifiedTrue": sum(int(run.get("verifiedTrue") or 0) for run in runs),
                "parseErrors": txmap_repeat.get("parseErrors"),
                "allRunsSuccessVerified": txmap_repeat.get("allRunsSuccessVerified"),
                "policy": "diagnostic_only_not_pass_substitute",
            }
        if not txmap_callback_summary.get("present"):
            failures.append("txmap repeat callback summary must be present for successful_commit evidence")
        elif txmap_callback_summary.get("basis") != "caliper_sendRequests_txmap_callback":
            failures.append(f"txmap repeat callback basis must be caliper_sendRequests_txmap_callback, got {txmap_callback_summary.get('basis')!r}")
        elif txmap_callback_summary.get("allRunsSuccessVerified") is not True:
            failures.append(f"txmap repeat callback allRunsSuccessVerified must be true, got {txmap_callback_summary.get('allRunsSuccessVerified')!r}")
        elif txmap_callback_summary.get("repeatCount", 0) < 10:
            failures.append(f"txmap repeat callback repeatCount {txmap_callback_summary.get('repeatCount')} < 10")
        elif txmap_callback_summary.get("totalLines") != expected:
            failures.append(f"txmap repeat callback totalLines {txmap_callback_summary.get('totalLines')} != ledger expected {expected}")
        elif txmap_callback_summary.get("totalSucc") != expected:
            failures.append(f"txmap repeat callback totalSucc {txmap_callback_summary.get('totalSucc')} != ledger expected {expected}")
        elif txmap_callback_summary.get("totalVerifiedTrue") != expected:
            failures.append(f"txmap repeat callback totalVerifiedTrue {txmap_callback_summary.get('totalVerifiedTrue')} != ledger expected {expected}")
        elif txmap_callback_summary.get("totalFail") != 0:
            failures.append(f"txmap repeat callback totalFail must be 0, got {txmap_callback_summary.get('totalFail')}")
        elif txmap_callback_summary.get("parseErrors") not in (0, None):
            failures.append(f"txmap repeat callback parseErrors must be 0, got {txmap_callback_summary.get('parseErrors')}")
    except Exception as exc:
        input_errors.append(f"cannot read reconciliation JSON {reconcile_path}: {exc}")
else:
    failures.append("ledger-reconciliation.json missing")

cleanup_summary = {"present": False}
clean_dir = final_status.get("CLEAN_DIR")
if clean_dir:
    clean_path = Path(clean_dir)
    if not clean_path.is_absolute():
        clean_path = (Path.cwd() / clean_path).resolve()
    after = clean_path / "orderer-channels.after.json"
    cleanup_summary["present"] = after.exists()
    cleanup_summary["ordererChannelsAfter"] = str(after)
    if after.exists():
        try:
            data = json.loads(after.read_text())
            names = [c.get("name") for c in data.get("channels", [])]
            cleanup_summary["channels"] = names
            if names != ["passportchannel"]:
                failures.append(f"cleanup orderer channels after must be ['passportchannel'], got {names}")
        except Exception as exc:
            input_errors.append(f"cannot parse cleanup orderer channels {after}: {exc}")
    else:
        failures.append(f"cleanup orderer-channels.after.json missing: {after}")
else:
    failures.append("CLEAN_DIR missing from final-status.env")

status = "error" if input_errors else ("pass" if not failures else "fail")

result = {
    "status": status,
    "evidenceDir": str(evidence),
    "summaryEnv": str(summary_env_path),
    "repeatResultsCsv": str(csv_path),
    "summary": {
        "basis": summary.get("WRITE_KPI_BASIS"),
        "profile": summary.get("BENCHMARK_PROFILE"),
        "channelOrgs": summary.get("BENCHMARK_CHANNEL_ORGS"),
        "installOrgs": summary.get("BENCHMARK_CC_INSTALL_ORGS"),
        "repeatRunCount": repeat_count,
        "writeTxNumber": write_tx_number,
        "minTps": as_float(summary, "WRITE200_MIN_TPS") if "WRITE200_MIN_TPS" in summary else None,
        "p10Tps": as_float(summary, "WRITE200_P10_TPS") if "WRITE200_P10_TPS" in summary else None,
        "p50Tps": as_float(summary, "WRITE200_P50_TPS") if "WRITE200_P50_TPS" in summary else None,
        "allRunsSuccExpected": summary.get("ALL_RUNS_SUCC_EXPECTED"),
        "allRunsFailZero": summary.get("ALL_RUNS_FAIL_ZERO"),
        "allRunsRejectZero": summary.get("ALL_RUNS_REJECT_ZERO"),
    },
    "launch": {
        "path": str(launch_env_path),
        "allowUnderpowered": launch.get("ALLOW_UNDERPOWERED"),
        "caliperExecMode": launch.get("CALIPER_EXEC_MODE"),
        "caliperEndpointMode": launch.get("CALIPER_ENDPOINT_MODE"),
        "caliperDockerNetwork": launch.get("CALIPER_DOCKER_NETWORK"),
        "caliperRecordAutoId": launch.get("CALIPER_RECORD_AUTO_ID"),
        "collectHostResourceStats": launch.get("COLLECT_HOST_RESOURCE_STATS"),
    },
    "workload": {
        "expectedRoundLabel": expected_workload["CALIPER_WRITE_ROUND_LABEL"],
        "expectedModule": expected_workload["CALIPER_WRITE_WORKLOAD_MODULE"],
        "expectedContractFunction": expected_workload["CALIPER_WRITE_CONTRACT_FUNCTION"],
        "launchRoundLabel": launch.get("CALIPER_WRITE_ROUND_LABEL"),
        "launchModule": launch.get("CALIPER_WRITE_WORKLOAD_MODULE"),
        "launchContractFunction": launch.get("CALIPER_WRITE_CONTRACT_FUNCTION"),
        "effectiveRoundLabel": effective.get("CALIPER_WRITE_ROUND_LABEL"),
        "effectiveModule": effective.get("CALIPER_WRITE_WORKLOAD_MODULE"),
        "effectiveContractFunction": effective.get("CALIPER_WRITE_CONTRACT_FUNCTION"),
        "summaryRoundLabel": summary.get("CALIPER_WRITE_ROUND_LABEL"),
        "summaryModule": summary.get("CALIPER_WRITE_WORKLOAD_MODULE"),
        "summaryContractFunction": summary.get("CALIPER_WRITE_CONTRACT_FUNCTION"),
    },
    "hostReadiness": host_readiness_summary,
    "ledger": ledger_summary,
    "txmapCallback": txmap_callback_summary,
    "cleanup": cleanup_summary,
    "failures": failures,
    "inputErrors": input_errors,
}

payload = json.dumps(result, indent=2, ensure_ascii=False)
if out_json:
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(payload + "\n")
print(payload)

if out_env:
    out_env.parent.mkdir(parents=True, exist_ok=True)
    env_lines = [
        f"OFFICIAL_WRITE_VERIFY_STATUS={status}",
        f"OFFICIAL_WRITE_VERIFY_EVIDENCE_DIR={shlex.quote(str(evidence))}",
        f"OFFICIAL_WRITE_VERIFY_JSON={shlex.quote(str(out_json)) if out_json else ''}",
        f"OFFICIAL_WRITE_VERIFY_FAILURE_COUNT={len(failures)}",
        f"OFFICIAL_WRITE_VERIFY_INPUT_ERROR_COUNT={len(input_errors)}",
        f"OFFICIAL_WRITE_TXMAP_CALLBACK_PRESENT={str(txmap_callback_summary.get('present', False)).lower()}",
        f"OFFICIAL_WRITE_TXMAP_CALLBACK_BASIS={shlex.quote(str(txmap_callback_summary.get('basis') or ''))}",
        f"OFFICIAL_WRITE_TXMAP_CALLBACK_REPEAT_COUNT={shlex.quote(str(txmap_callback_summary.get('repeatCount') or ''))}",
        f"OFFICIAL_WRITE_TXMAP_CALLBACK_ALL_SUCCESS_VERIFIED={str(txmap_callback_summary.get('allRunsSuccessVerified', False)).lower()}",
        f"OFFICIAL_WRITE_LEDGER_RECONCILIATION_MATCH={str(ledger_summary.get('ledgerWorldStateMatchesExpected', False)).lower()}",
        f"OFFICIAL_WRITE_LEDGER_EXPECTED={shlex.quote(str(ledger_summary.get('expected') or ''))}",
        f"OFFICIAL_WRITE_LEDGER_CSV_TOTAL_EXPECTED={shlex.quote(str(ledger_summary.get('csvTotalExpected') or ''))}",
        f"OFFICIAL_WRITE_LEDGER_TXMAP_SUCCESS_VERIFIED={shlex.quote(str(ledger_summary.get('txmapSuccessVerified') or ''))}",
        f"OFFICIAL_WRITE_LEDGER_TXMAP_ERRORS={shlex.quote(str(ledger_summary.get('txmapErrors') if ledger_summary.get('txmapErrors') is not None else ''))}",
        f"OFFICIAL_WRITE_HOST_READINESS_STATUS={shlex.quote(str(host_readiness_summary.get('status') or ''))}",
        f"OFFICIAL_WRITE_ALLOW_UNDERPOWERED={shlex.quote(str(launch.get('ALLOW_UNDERPOWERED') or ''))}",
        f"OFFICIAL_WRITE_RECORD_AUTO_ID={shlex.quote(str(launch.get('CALIPER_RECORD_AUTO_ID') or ''))}",
        f"OFFICIAL_WRITE_ROUND_LABEL={shlex.quote(str(summary.get('CALIPER_WRITE_ROUND_LABEL') or effective.get('CALIPER_WRITE_ROUND_LABEL') or launch.get('CALIPER_WRITE_ROUND_LABEL') or ''))}",
        f"OFFICIAL_WRITE_WORKLOAD_MODULE={shlex.quote(str(summary.get('CALIPER_WRITE_WORKLOAD_MODULE') or effective.get('CALIPER_WRITE_WORKLOAD_MODULE') or launch.get('CALIPER_WRITE_WORKLOAD_MODULE') or ''))}",
        f"OFFICIAL_WRITE_CONTRACT_FUNCTION={shlex.quote(str(summary.get('CALIPER_WRITE_CONTRACT_FUNCTION') or effective.get('CALIPER_WRITE_CONTRACT_FUNCTION') or launch.get('CALIPER_WRITE_CONTRACT_FUNCTION') or ''))}",
        f"OFFICIAL_WRITE_TX_NUMBER={shlex.quote(str(summary.get('CALIPER_WRITE_TX_NUMBER') or ''))}",
        f"OFFICIAL_WRITE_CC_INSTALL_ORGS={shlex.quote(str(summary.get('BENCHMARK_CC_INSTALL_ORGS') or ''))}",
    ]
    out_env.write_text("\n".join(env_lines) + "\n")

if input_errors:
    sys.exit(2)
if failures:
    sys.exit(1)
PY
