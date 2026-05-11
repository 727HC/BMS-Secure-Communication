#!/usr/bin/env bash
# Compatibility wrapper for the benchmark-safe reproducibility runner.

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec "${ROOT_DIR}/scripts/blockchain-benchmark-safe.sh" "$@"
