# Hermes PR remediation proof

- Source PR: https://github.com/727HC/BMS-Secure-Communication/pull/26
- Source title: chore(deps): bump @protobufjs/utf8 from 1.1.0 to 1.1.1 in /bmu-agent
- Strategy: dependency_scope_refresh
- Idempotency key: 727HC/BMS-Secure-Communication#26:1c7ef123c6d3
- Target status: FIXED_AWAITING_EXACT_MERGE_APPROVAL
- Write mode: companion_pr
- Local verification: {"ok": false, "skipped": false, "checks": {"checkout": true, "install": true, "audit": false, "tests": false, "build": true}, "failed": ["audit", "tests"], "evidenceRef": "/tmp/727hc-github-pr-autoloop-full-automation-evidence/auto-loop/local-verification/727HC__BMS-Secure-Communication__pr-26.json", "reason": "changed-file scoped local verification"}
- Diff policy: {"ok": true, "dependencyLike": true, "files": [{"path": "bmu-agent/package-lock.json", "additions": 3, "deletions": 3, "status": "modified"}], "riskyFiles": [], "workflowFiles": [], "sourceOrConfigTouched": false}
- Safety: this companion PR is evidence-only and does not merge the source PR.
- Merge boundary: final merge still requires exact approval: `merge 727HC/BMS-Secure-Communication#26 승인`
