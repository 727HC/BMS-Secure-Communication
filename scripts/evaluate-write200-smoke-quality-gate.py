#!/usr/bin/env python3
"""Evaluate the off-host write200 3-repeat smoke quality gate.

This is diagnostic gating for disposable smoke evidence. It does not replace the
10-repeat official Caliper write200 PASS policy.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(errors="replace"))


def evaluate(smoke_root: Path, output: Path, min_successful_tps: float) -> dict[str, Any]:
    failures: list[str] = []
    rows: list[dict[str, str]] = []

    csv_path = smoke_root / "repeat-results.csv"
    if not csv_path.exists():
        failures.append(f"missing repeat-results.csv: {csv_path}")
    else:
        with csv_path.open(newline="") as f:
            rows = list(csv.DictReader(f))
        if len(rows) < 3:
            failures.append(f"smoke repeat rows {len(rows)} < 3")
        for idx, row in enumerate(rows, 1):
            try:
                expected = int(row.get("expected", ""))
                succ = int(row.get("succ", ""))
                fail = int(row.get("fail", ""))
                reject = int(row.get("reject", ""))
                tps = float(row.get("successful_tps", ""))
            except Exception:
                failures.append(f"row {idx} has malformed expected/succ/fail/reject/successful_tps")
                continue
            if expected != 10000:
                failures.append(f"row {idx} expected {expected} != 10000")
            if succ != expected:
                failures.append(f"row {idx} succ {succ} != expected {expected}")
            if fail != 0:
                failures.append(f"row {idx} fail {fail} != 0")
            if reject != 0:
                failures.append(f"row {idx} reject {reject} != 0")
            if tps < min_successful_tps:
                failures.append(f"row {idx} successful_tps {tps} < {min_successful_tps:g}")

    expected_total = sum(int(row.get("expected") or 0) for row in rows)

    reconcile_path = smoke_root / "ledger-reconciliation.json"
    reconcile: dict[str, Any] = {}
    if not reconcile_path.exists():
        failures.append(f"missing ledger-reconciliation.json: {reconcile_path}")
    else:
        try:
            reconcile = _load_json(reconcile_path)
        except Exception as exc:
            failures.append(f"malformed ledger-reconciliation.json: {exc}")
            reconcile = {}
        txmap = reconcile.get("txmap") or {}
        couch = reconcile.get("couchdb") or []
        heights = reconcile.get("peerHeights") or []
        if reconcile.get("expected") != expected_total:
            failures.append(f"reconciliation expected {reconcile.get('expected')} != csv expected total {expected_total}")
        if txmap.get("successVerifiedCount") != expected_total:
            failures.append(f"txmap successVerifiedCount {txmap.get('successVerifiedCount')} != {expected_total}")
        if txmap.get("errorCount") != 0:
            failures.append(f"txmap errorCount {txmap.get('errorCount')} != 0")
        couch_counts = [item.get("count") for item in couch]
        if not couch_counts or any(count != expected_total for count in couch_counts):
            failures.append(f"CouchDB counts {couch_counts} != {expected_total}")
        peer_heights = [item.get("height") for item in heights if item.get("height") is not None]
        if len(peer_heights) < 4 or len(set(peer_heights)) != 1:
            failures.append(f"peer heights not equal across 4 peers: {peer_heights}")

    txmap_summary = reconcile.get("txmapRepeatSummary")
    if not txmap_summary:
        candidates = sorted(smoke_root.glob("txmap-repeat-summary*.json")) + sorted(
            smoke_root.glob("*-txmap-repeat-summary.json")
        )
        if candidates:
            try:
                txmap_summary = _load_json(candidates[0])
            except Exception as exc:
                failures.append(f"malformed txmap repeat callback summary {candidates[0]}: {exc}")
    if not txmap_summary:
        failures.append("missing txmap repeat callback summary")
    else:
        if txmap_summary.get("basis") != "caliper_sendRequests_txmap_callback":
            failures.append(
                f"txmap callback basis {txmap_summary.get('basis')} != caliper_sendRequests_txmap_callback"
            )
        if txmap_summary.get("allRunsSuccessVerified") is not True:
            failures.append("txmap callback allRunsSuccessVerified is not true")
        callback_total = sum(int(run.get("succ") or 0) for run in txmap_summary.get("runs") or [])
        if callback_total != expected_total:
            failures.append(f"txmap callback succ total {callback_total} != {expected_total}")

    result = {
        "status": "pass" if not failures else "fail",
        "smokeRoot": str(smoke_root),
        "minSuccessfulTps": min_successful_tps,
        "repeatRows": len(rows),
        "expectedTotal": expected_total,
        "basis": "disposable_smoke_quality_gate_not_official_pass_substitute",
        "failures": failures,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--smoke-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--min-successful-tps", default=205.0, type=float)
    args = parser.parse_args()

    result = evaluate(args.smoke_root, args.output, args.min_successful_tps)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
