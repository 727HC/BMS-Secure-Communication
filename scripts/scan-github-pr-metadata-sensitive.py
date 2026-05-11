#!/usr/bin/env python3
"""Scan GitHub pull request metadata for the repo's sensitive marker policy.

This complements git-ref scanning. It checks PR text surfaces that are not part
of a normal git checkout: titles, bodies, branch names, file paths, issue
comments, reviews, and review comments.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SCANNER_PATH = ROOT / "scripts" / "check-sensitive-patterns.py"


def load_scanner() -> Any:
    spec = importlib.util.spec_from_file_location("sensitive_scan", SCANNER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"failed to load {SCANNER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_gh_json(args: list[str]) -> Any:
    output = subprocess.check_output(["gh", *args], text=True)
    if not output.strip():
        return None
    return json.loads(output)


def default_repo() -> str:
    try:
        value = subprocess.check_output(
            ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
        if value:
            return value
    except (OSError, subprocess.CalledProcessError):
        pass

    remote = subprocess.check_output(["git", "remote", "get-url", "origin"], text=True).strip()
    if remote.startswith("git@github.com:"):
        return remote.removeprefix("git@github.com:").removesuffix(".git")
    if "github.com/" in remote:
        return remote.split("github.com/", 1)[1].removesuffix(".git")
    raise RuntimeError("cannot infer GitHub repo; pass --repo OWNER/NAME")


def add_item(items: list[tuple[str, str]], label: str, value: Any) -> None:
    if value is None:
        return
    items.append((label, str(value)))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan GitHub PR metadata for high-signal sensitive markers."
    )
    parser.add_argument("--repo", default=None, help="GitHub repo in OWNER/NAME form")
    parser.add_argument("--limit", type=int, default=100, help="maximum PRs to request")
    args = parser.parse_args()

    scanner = load_scanner()
    repo = args.repo or default_repo()
    prs = run_gh_json(
        [
            "pr",
            "list",
            "--repo",
            repo,
            "--state",
            "all",
            "--limit",
            str(args.limit),
            "--json",
            "number,title,body,headRefName,baseRefName,author,url,state",
        ]
    ) or []

    items: list[tuple[str, str]] = []
    for pr in prs:
        number = pr["number"]
        prefix = f"pr#{number}"
        add_item(items, f"{prefix}.title", pr.get("title"))
        add_item(items, f"{prefix}.body", pr.get("body"))
        add_item(items, f"{prefix}.headRefName", pr.get("headRefName"))
        add_item(items, f"{prefix}.baseRefName", pr.get("baseRefName"))

        files = run_gh_json(["api", f"repos/{repo}/pulls/{number}/files", "--paginate"]) or []
        for idx, file_info in enumerate(files, 1):
            add_item(items, f"{prefix}.file[{idx}]", file_info.get("filename"))

        issue_comments = run_gh_json(
            ["api", f"repos/{repo}/issues/{number}/comments", "--paginate"]
        ) or []
        for idx, comment in enumerate(issue_comments, 1):
            add_item(items, f"{prefix}.issue_comment[{idx}]", comment.get("body"))

        reviews = run_gh_json(["api", f"repos/{repo}/pulls/{number}/reviews", "--paginate"]) or []
        for idx, review in enumerate(reviews, 1):
            add_item(items, f"{prefix}.review[{idx}]", review.get("body"))

        review_comments = run_gh_json(
            ["api", f"repos/{repo}/pulls/{number}/comments", "--paginate"]
        ) or []
        for idx, comment in enumerate(review_comments, 1):
            add_item(items, f"{prefix}.review_comment[{idx}]", comment.get("body"))

    findings: list[tuple[str, str, int, str]] = []
    for label, text in items:
        for line_no, line in enumerate(text.splitlines() or [""], 1):
            for name, pattern in scanner.PATTERNS:
                if pattern.search(line):
                    findings.append((label, name, line_no, line.strip()[:180]))
            if scanner.legacy_marker_hit(line):
                findings.append((label, "legacy_sensitive_marker", line_no, line.strip()[:180]))

    print(f"repo={repo}")
    print(f"pull_requests_scanned={len(prs)}")
    print(f"pr_metadata_items_scanned={len(items)}")
    print(f"pr_metadata_sensitive_findings={len(findings)}")

    if findings:
        for label, name, line_no, sample in findings:
            print(f"{name}\t{label}:{line_no}\t{sample}")
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
