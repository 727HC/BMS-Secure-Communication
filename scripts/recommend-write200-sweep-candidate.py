#!/usr/bin/env python3
"""Select a safe write200 official-run candidate from offhost sweep results."""
from __future__ import annotations

import argparse
import csv
import json
import shlex
import sys
from pathlib import Path
from typing import Any


def parse_bool(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on", "pass"}


def parse_int(value: str | None) -> int | None:
    try:
        if value is None or str(value).strip() == "":
            return None
        return int(float(str(value).strip()))
    except Exception:
        return None


def parse_float(value: str | None) -> float | None:
    try:
        if value is None or str(value).strip() == "":
            return None
        return float(str(value).strip())
    except Exception:
        return None


def shell_line(key: str, value: Any) -> str:
    return f"{key}={shlex.quote(str(value))}"


def candidate_from_row(row: dict[str, str], min_successful_tps: float) -> tuple[dict[str, Any], list[str]]:
    reasons: list[str] = []
    workers = parse_int(row.get("workers"))
    target_tps = parse_int(row.get("target_tps"))
    rc = parse_int(row.get("rc"))
    cleanup_rc = parse_int(row.get("cleanup_rc"))
    min_tps = parse_float(row.get("min_tps"))
    p50_tps = parse_float(row.get("p50_tps"))
    mean_tps = parse_float(row.get("mean_tps"))
    all_succ = parse_bool(row.get("all_succ_expected"))
    all_fail_zero = parse_bool(row.get("all_fail_zero"))
    all_reject_zero = parse_bool(row.get("all_reject_zero"))

    if workers is None:
        reasons.append("workers missing")
    if target_tps is None:
        reasons.append("target_tps missing")
    if rc != 0:
        reasons.append(f"rc={rc}")
    if cleanup_rc != 0:
        reasons.append(f"cleanup_rc={cleanup_rc}")
    if not all_succ:
        reasons.append("all_succ_expected is not true")
    if not all_fail_zero:
        reasons.append("all_fail_zero is not true")
    if not all_reject_zero:
        reasons.append("all_reject_zero is not true")
    if min_tps is None:
        reasons.append("min_tps missing")
    elif min_tps < min_successful_tps:
        reasons.append(f"min_tps {min_tps} < {min_successful_tps}")
    if p50_tps is None:
        reasons.append("p50_tps missing")
    if mean_tps is None:
        reasons.append("mean_tps missing")

    item = {
        "index": parse_int(row.get("index")),
        "workers": workers,
        "targetTps": target_tps,
        "rc": rc,
        "cleanupRc": cleanup_rc,
        "evidenceRoot": row.get("evidence_root", ""),
        "summaryEnv": row.get("summary_env", ""),
        "minTps": min_tps,
        "p50Tps": p50_tps,
        "meanTps": mean_tps,
        "allSuccExpected": all_succ,
        "allFailZero": all_fail_zero,
        "allRejectZero": all_reject_zero,
        "eligible": not reasons,
        "reasons": reasons,
    }
    return item, reasons


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sweep-results", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--env-output", required=True, type=Path)
    parser.add_argument("--min-successful-tps", type=float, default=205.0)
    args = parser.parse_args()

    if not args.sweep_results.exists():
        result = {
            "status": "missing_sweep_results",
            "sweepResults": str(args.sweep_results),
            "minSuccessfulTps": args.min_successful_tps,
            "candidates": [],
            "recommended": None,
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + "\n")
        args.env_output.write_text(
            "\n".join(
                [
                    "SWEEP_RECOMMENDATION_STATUS=missing_sweep_results",
                    shell_line("SWEEP_RESULTS_CSV", args.sweep_results),
                    shell_line("SWEEP_RECOMMENDATION_JSON", args.output),
                ]
            )
            + "\n"
        )
        return 2

    rows = list(csv.DictReader(args.sweep_results.read_text(errors="replace").splitlines()))
    candidates = [candidate_from_row(row, args.min_successful_tps)[0] for row in rows]
    eligible = [item for item in candidates if item["eligible"]]
    eligible.sort(
        key=lambda item: (
            item.get("minTps") or 0.0,
            item.get("p50Tps") or 0.0,
            item.get("meanTps") or 0.0,
            item.get("targetTps") or 0,
            -(item.get("workers") or 0),
        ),
        reverse=True,
    )
    recommended = eligible[0] if eligible else None
    status = "ready" if recommended else "no_candidate"
    result = {
        "status": status,
        "basis": "disposable_sweep_candidate_not_official_pass_substitute",
        "sweepResults": str(args.sweep_results),
        "minSuccessfulTps": args.min_successful_tps,
        "recommended": recommended,
        "candidates": candidates,
        "officialPassSubstitute": False,
        "note": "Use this only to parameterize a subsequent 10-repeat official run; it is not PASS evidence.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")

    env_lines = [
        shell_line("SWEEP_RECOMMENDATION_STATUS", status),
        shell_line("SWEEP_RECOMMENDATION_JSON", args.output),
        shell_line("SWEEP_RESULTS_CSV", args.sweep_results),
        shell_line("SWEEP_MIN_SUCCESSFUL_TPS", args.min_successful_tps),
        "SWEEP_RECOMMENDATION_OFFICIAL_PASS_SUBSTITUTE=false",
    ]
    if recommended:
        env_lines += [
            shell_line("SWEEP_RECOMMENDED_WORKERS", recommended["workers"]),
            shell_line("SWEEP_RECOMMENDED_TARGET_TPS", recommended["targetTps"]),
            shell_line("SWEEP_RECOMMENDED_MIN_TPS", recommended["minTps"]),
            shell_line("SWEEP_RECOMMENDED_P50_TPS", recommended["p50Tps"]),
            shell_line("SWEEP_RECOMMENDED_MEAN_TPS", recommended["meanTps"]),
            shell_line("SWEEP_RECOMMENDED_EVIDENCE_ROOT", recommended["evidenceRoot"]),
            shell_line("CALIPER_WORKERS", recommended["workers"]),
            shell_line("CALIPER_WRITE_TARGET_TPS", recommended["targetTps"]),
            shell_line("SMOKE_WORKERS", recommended["workers"]),
            shell_line("SMOKE_TARGET_TPS", recommended["targetTps"]),
            shell_line("OFFICIAL_WORKERS", recommended["workers"]),
            shell_line("OFFICIAL_TARGET_TPS", recommended["targetTps"]),
            "CALIPER_EXEC_MODE=docker",
            "CALIPER_ENDPOINT_MODE=docker",
            "CALIPER_DOCKER_NETWORK=passport_net",
            "CALIPER_VERIFY_PREPARED_EACH_REPEAT=false",
            "CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY=180",
            "CALIPER_OBSERVER_INTERNAL_INTERVAL=10000",
            "COLLECT_HOST_RESOURCE_STATS=true",
            (
                "export CALIPER_WORKERS CALIPER_WRITE_TARGET_TPS "
                "SMOKE_WORKERS SMOKE_TARGET_TPS OFFICIAL_WORKERS OFFICIAL_TARGET_TPS "
                "CALIPER_EXEC_MODE CALIPER_ENDPOINT_MODE CALIPER_DOCKER_NETWORK "
                "CALIPER_VERIFY_PREPARED_EACH_REPEAT CALIPER_FABRIC_TIMEOUT_INVOKEORQUERY "
                "CALIPER_OBSERVER_INTERNAL_INTERVAL COLLECT_HOST_RESOURCE_STATS"
            ),
        ]
    args.env_output.write_text("\n".join(env_lines) + "\n")
    print(args.output)
    return 0 if recommended else 1


if __name__ == "__main__":
    raise SystemExit(main())
