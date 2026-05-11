#!/usr/bin/env bash
# Install local Git hooks that run the repository sensitive marker scanner.
# Hooks live under .git/hooks and are not versioned, so this script makes the
# local setup reproducible for future clones.

set -euo pipefail

force=false
if [[ "${1:-}" == "--force" ]]; then
  force=true
elif [[ "${1:-}" != "" ]]; then
  echo "usage: $0 [--force]" >&2
  exit 2
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "${repo_root}"

scanner="scripts/check-sensitive-patterns.py"
if [[ ! -f "${scanner}" ]]; then
  echo "missing ${scanner}" >&2
  exit 1
fi

hook_dir="$(git rev-parse --git-path hooks)"
mkdir -p "${hook_dir}"

tmp_hook="$(mktemp)"
trap 'rm -f "${tmp_hook}"' EXIT
cat > "${tmp_hook}" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
python3 scripts/check-sensitive-patterns.py --include-untracked
HOOK

install_hook() {
  local name="$1"
  local target="${hook_dir}/${name}"

  if [[ -f "${target}" ]] && ! cmp -s "${tmp_hook}" "${target}"; then
    if [[ "${force}" != true ]]; then
      echo "refusing to overwrite existing ${target}; rerun with --force to back it up and replace it" >&2
      return 1
    fi
    local backup="${target}.backup.$(date +%Y%m%d%H%M%S)"
    cp "${target}" "${backup}"
    echo "backed up ${target} -> ${backup}"
  fi

  install -m 0755 "${tmp_hook}" "${target}"
  echo "installed ${target}"
}

install_hook pre-commit
install_hook pre-push
