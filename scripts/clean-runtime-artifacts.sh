#!/usr/bin/env bash
set -euo pipefail

MODE="apply"
if [[ "${1:-}" == "--dry-run" ]]; then
  MODE="dry-run"
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TARGET_DIRS=(
  ".omc"
  ".playwright-mcp"
  "e2e-tests/screenshots"
  "e2e-tests/test-results"
  "webapp/frontend-react/dist"
)
TARGET_FILES=(
  "passport-network/log.txt"
)

printf '== runtime artifact cleanup (%s) ==\n' "$MODE"

while IFS= read -r dir; do
  TARGET_DIRS+=("${dir#./}")
done < <(find . -type d -name '.omc' -prune | sort)

while IFS= read -r file; do
  TARGET_FILES+=("${file#./}")
done < <(find . -maxdepth 1 -type f -name 'batp-*.png' | sort)

while IFS= read -r file; do
  TARGET_FILES+=("${file#./}")
done < <(find webapp/frontend-react -maxdepth 1 -type f -name '*.tsbuildinfo' | sort 2>/dev/null || true)

while IFS= read -r file; do
  TARGET_FILES+=("${file#./}")
done < <(find passport-network -maxdepth 1 -type f -name '*.tar.gz' | sort 2>/dev/null || true)

while IFS= read -r file; do
  TARGET_FILES+=("${file#./}")
done < <(find caliper-workspace -maxdepth 1 -type f -name 'report.html' | sort 2>/dev/null || true)

unique_dirs=()
for item in "${TARGET_DIRS[@]}"; do
  [[ -n "$item" ]] || continue
  skip=0
  for seen in "${unique_dirs[@]}"; do
    [[ "$seen" == "$item" ]] && skip=1 && break
  done
  (( skip == 0 )) && unique_dirs+=("$item")
done

unique_files=()
for item in "${TARGET_FILES[@]}"; do
  [[ -n "$item" ]] || continue
  skip=0
  for seen in "${unique_files[@]}"; do
    [[ "$seen" == "$item" ]] && skip=1 && break
  done
  (( skip == 0 )) && unique_files+=("$item")
done

printf '\n-- directories --\n'
for path in "${unique_dirs[@]}"; do
  if [[ -e "$path" ]]; then
    printf '%s\n' "$path"
    if [[ "$MODE" == "apply" ]]; then
      rm -rf -- "$path"
    fi
  fi
done

printf '\n-- files --\n'
for path in "${unique_files[@]}"; do
  if [[ -e "$path" ]]; then
    printf '%s\n' "$path"
    if [[ "$MODE" == "apply" ]]; then
      rm -f -- "$path"
    fi
  fi
done

printf '\nDone.\n'
