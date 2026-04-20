#!/usr/bin/env bash
set -euo pipefail

MODE="apply"
if [[ "${1:-}" == "--dry-run" ]]; then
  MODE="dry-run"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

python3 scripts/runtime_artifact_policy.py audit-gitignore >/dev/null
mapfile -t TARGETS < <(python3 scripts/runtime_artifact_policy.py list-existing)

printf '== runtime artifact cleanup (%s) ==\n' "$MODE"
printf '\n-- targets --\n'
for path in "${TARGETS[@]}"; do
  [[ -n "$path" ]] || continue
  printf '%s\n' "$path"
  if [[ "$MODE" == "apply" ]]; then
    rm -rf -- "$path"
  fi
done
printf '\nDone.\n'
