# Hermes PR remediation proof

- Source PR: https://github.com/727HC/BMS-Secure-Communication/pull/25
- Source title: chore(deps): bump @protobufjs/utf8 from 1.1.0 to 1.1.1 in /caliper-workspace
- Strategy: dependency_scope_refresh
- Idempotency key: 727HC/BMS-Secure-Communication#25:241bea111059
- Target status: FIXED_AWAITING_EXACT_MERGE_APPROVAL
- Write mode: companion_pr
- Local verification: {"ok": false, "skipped": false, "checks": {"checkout": true, "install": true, "audit": false, "tests": false, "build": true}, "failed": ["audit", "tests"], "evidenceRef": "/tmp/727hc-github-pr-autoloop-full-automation-evidence/auto-loop/local-verification/727HC__BMS-Secure-Communication__pr-25.json", "reason": "changed-file scoped local verification"}
- Diff policy: {"ok": true, "dependencyLike": true, "files": [{"path": "caliper-workspace/package-lock.json", "additions": 4, "deletions": 3, "status": "modified"}], "riskyFiles": [], "workflowFiles": [], "sourceOrConfigTouched": false}
- Safety: this companion PR is evidence-only and does not merge the source PR.
- Merge boundary: final merge still requires exact approval: `merge 727HC/BMS-Secure-Communication#25 승인`
