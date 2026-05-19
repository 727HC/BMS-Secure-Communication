#!/usr/bin/env bash
# Compatibility hook for older off-host write200 bundles.
#
# This script intentionally performs no checkout mutation. Older handoff bundles
# used it to delete CouchDB BMU indexes that tar overlays cannot remove. Code
# review found that unsafe for shared checkouts, and the production-safe path now
# keeps the BMU query indexes required by non-benchmark APIs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "offhost overlay no-op: CouchDB BMU indexes are preserved in this checkout"
