#!/usr/bin/env bash
# Verify GitHub remote cleanup after sensitive-history rewrites.
# Exits 0 only when origin/master is clean and GitHub hidden PR refs are gone.

set -euo pipefail

REMOTE_URL="${REMOTE_URL:-$(git remote get-url origin)}"
MASTER_REF="${MASTER_REF:-refs/heads/master}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

known_regex="$(printf '%s|%s|%s' 'admin''pw' 'bench''pass''123' 'change-me-in-''production')"
local_regex="$(printf '%s|%s|%s' 'hee''chan' '/home/''hee''chan' 'C:\\\\Users\\\\''hee''chan')"
email_regex="$(printf '%s' '727''khc@g''mail.com')"

echo "[verify-github-sensitive-clean] cloning mirror from ${REMOTE_URL}"
git clone --mirror --quiet "${REMOTE_URL}" "${TMP_DIR}/repo.git"
cd "${TMP_DIR}/repo.git"

if ! git show-ref --verify --quiet "${MASTER_REF}"; then
  echo "FAIL: ${MASTER_REF} does not exist" >&2
  exit 1
fi

mapfile -t pull_refs < <(git for-each-ref --format='%(refname)' refs/pull | sort)
known_count="$(git log --format='%H' --regexp-ignore-case -G "${known_regex}" "${MASTER_REF}" -- . | wc -l | tr -d ' ')"
local_count="$(git log --format='%H' --regexp-ignore-case -G "${local_regex}" "${MASTER_REF}" -- . | wc -l | tr -d ' ')"
email_count="$(git log "${MASTER_REF}" --format='%ae%n%ce' | grep -Eci "${email_regex}" || true)"

printf 'master=%s\n' "$(git rev-parse "${MASTER_REF}")"
printf 'master_known_marker_commits=%s\n' "${known_count}"
printf 'master_local_marker_commits=%s\n' "${local_count}"
printf 'master_personal_email_metadata=%s\n' "${email_count}"
printf 'hidden_pull_ref_count=%s\n' "${#pull_refs[@]}"

if (( known_count != 0 || local_count != 0 || email_count != 0 )); then
  echo "FAIL: ${MASTER_REF} still has sensitive marker evidence" >&2
  exit 1
fi

if (( ${#pull_refs[@]} != 0 )); then
  echo "BLOCKED: GitHub hidden PR refs remain:" >&2
  printf '  %s\n' "${pull_refs[@]}" >&2
  echo "Submit GitHub Support purge request, then rerun this verifier." >&2
  exit 2
fi

echo "PASS: GitHub remote has clean ${MASTER_REF} and no hidden PR refs"
