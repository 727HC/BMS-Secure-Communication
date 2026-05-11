#!/usr/bin/env bash
# Verify GitHub remote cleanup after sensitive-history rewrites.
# Exits 0 only when all reachable GitHub refs are clean for the targeted markers.
# Exits 2 when the only remaining tainted refs are GitHub hidden PR refs that need Support purge.

set -euo pipefail

REMOTE_URL="${REMOTE_URL:-$(git remote get-url origin)}"
MASTER_REF="${MASTER_REF:-refs/heads/master}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

known_regex="$(printf '%s|%s|%s' 'admin''pw' 'bench''pass''123' 'change-me-in-''production')"
local_regex="$(printf '%s|%s|%s' 'hee''chan' '/home/''hee''chan' 'C:\\Users\\''hee''chan')"
email_regex="$(printf '%s' '727''khc@g''mail.com')"

echo "[verify-github-sensitive-clean] cloning mirror from ${REMOTE_URL}"
git clone --mirror --quiet "${REMOTE_URL}" "${TMP_DIR}/repo.git"
cd "${TMP_DIR}/repo.git"

if ! git show-ref --verify --quiet "${MASTER_REF}"; then
  echo "FAIL: ${MASTER_REF} does not exist" >&2
  exit 1
fi

count_diff_markers() {
  local ref="$1"
  local regex="$2"
  git log --format='%H' --regexp-ignore-case -G "${regex}" "${ref}" -- . | sort -u | wc -l | tr -d ' '
}

count_email_markers() {
  local ref="$1"
  git log "${ref}" --format='%ae%n%ce' | grep -Eci "${email_regex}" || true
}

mapfile -t all_refs < <(git for-each-ref --format='%(refname)' refs/heads refs/tags refs/pull | sort)
mapfile -t pull_refs < <(git for-each-ref --format='%(refname)' refs/pull | sort)

master_known_count="$(count_diff_markers "${MASTER_REF}" "${known_regex}")"
master_local_count="$(count_diff_markers "${MASTER_REF}" "${local_regex}")"
master_email_count="$(count_email_markers "${MASTER_REF}")"

printf 'master=%s\n' "$(git rev-parse "${MASTER_REF}")"
printf 'master_known_marker_commits=%s\n' "${master_known_count}"
printf 'master_local_marker_commits=%s\n' "${master_local_count}"
printf 'master_personal_email_metadata=%s\n' "${master_email_count}"
printf 'hidden_pull_ref_count=%s\n' "${#pull_refs[@]}"

if (( master_known_count != 0 || master_local_count != 0 || master_email_count != 0 )); then
  echo "FAIL: ${MASTER_REF} still has sensitive marker evidence" >&2
  exit 1
fi

tainted_refs=()
for ref in "${all_refs[@]}"; do
  known_count="$(count_diff_markers "${ref}" "${known_regex}")"
  local_count="$(count_diff_markers "${ref}" "${local_regex}")"
  email_count="$(count_email_markers "${ref}")"
  if (( known_count != 0 || local_count != 0 || email_count != 0 )); then
    tainted_refs+=("${ref} known=${known_count} local=${local_count} email=${email_count}")
  fi
done

printf 'tainted_ref_count=%s\n' "${#tainted_refs[@]}"

if (( ${#tainted_refs[@]} != 0 )); then
  only_hidden_pull_refs=true
  for entry in "${tainted_refs[@]}"; do
    ref="${entry%% *}"
    if [[ ! "${ref}" =~ ^refs/pull/[0-9]+/head$ ]]; then
      only_hidden_pull_refs=false
    fi
  done

  if [[ "${only_hidden_pull_refs}" == true ]]; then
    echo "BLOCKED: sensitive marker evidence remains only in GitHub hidden PR refs:" >&2
    printf '  %s\n' "${tainted_refs[@]}" >&2
    echo "Submit GitHub Support purge request for the listed refs, then rerun this verifier." >&2
    exit 2
  fi

  echo "FAIL: sensitive marker evidence remains in non-hidden or unexpected refs:" >&2
  printf '  %s\n' "${tainted_refs[@]}" >&2
  exit 1
fi

echo "PASS: GitHub remote refs reachable by mirror clone are clean for targeted sensitive markers"
