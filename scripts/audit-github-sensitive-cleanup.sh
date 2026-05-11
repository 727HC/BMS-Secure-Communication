#!/usr/bin/env bash
# Run the complete GitHub sensitive-data cleanup audit.
# Exit codes:
#   0: all audited surfaces are clean
#   1: a local/current-tree or PR metadata sensitive finding exists
#   2: GitHub remote is clean except known Support-purge hidden PR refs

set -euo pipefail

REPO="${REPO:-727HC/BMS-Secure-Communication}"
status=0

run_section() {
  local title="$1"
  shift
  printf '\n## %s\n' "${title}"
  "$@"
}

echo "objective=GitHub sensitive-data cleanup audit"
echo "repo=${REPO}"
echo "head=$(git rev-parse HEAD)"

run_section "current tree sensitive marker scan" \
  python3 scripts/check-sensitive-patterns.py --include-untracked

run_section "GitHub PR metadata sensitive marker scan" \
  python3 scripts/scan-github-pr-metadata-sensitive.py --repo "${REPO}"

printf '\n## GitHub remote ref sensitive marker verifier\n'
set +e
scripts/verify-github-sensitive-clean.sh
remote_rc=$?
set -e

case "${remote_rc}" in
  0)
    echo "audit_result=pass"
    ;;
  2)
    echo "audit_result=blocked_on_github_support_purge"
    status=2
    ;;
  *)
    echo "audit_result=fail"
    status=1
    ;;
esac

exit "${status}"
