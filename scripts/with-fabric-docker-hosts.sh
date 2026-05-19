#!/usr/bin/env bash
# Run a command with Fabric hostnames resolvable from the host without mutating
# the real /etc/hosts. This creates a private user+mount namespace, bind-mounts
# a temporary hosts file, then execs the requested command.
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  echo "  FABRIC_HOSTS_RESOLVE_MODE=docker-ip|loopback (default: docker-ip)" >&2
  exit 2
fi
if ! command -v unshare >/dev/null 2>&1; then
  echo "ERROR: unshare is required for private /etc/hosts binding" >&2
  exit 2
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required to inspect Fabric container IPs" >&2
  exit 2
fi

containers=(
  orderer.battery.com
  peer0.manufacturer.battery.com
  peer0.evmanufacturer.battery.com
  peer0.service.battery.com
  peer0.regulator.battery.com
)
resolve_mode="${FABRIC_HOSTS_RESOLVE_MODE:-docker-ip}"
case "${resolve_mode}" in
  docker-ip|loopback) ;;
  *)
    echo "ERROR: unknown FABRIC_HOSTS_RESOLVE_MODE='${resolve_mode}'. Use docker-ip or loopback." >&2
    exit 2
    ;;
esac

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT
hosts_file="${tmpdir}/hosts"
cp /etc/hosts "${hosts_file}"
{
  echo ""
  echo "# Fabric hostnames for private Fabric namespace (${resolve_mode})"
  for container in "${containers[@]}"; do
    if [[ "${resolve_mode}" == "loopback" ]]; then
      ip="127.0.0.1"
    else
      ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${container}" 2>/dev/null || true)"
      if [[ -z "${ip}" ]]; then
        echo "ERROR: cannot resolve Docker IP for ${container}" >&2
        exit 3
      fi
    fi
    printf '%s %s\n' "${ip}" "${container}"
  done
} >> "${hosts_file}"

export FABRIC_DOCKER_HOSTS_FILE="${hosts_file}"
unshare -Ur -m bash -c '
  set -euo pipefail
  mount --bind "${FABRIC_DOCKER_HOSTS_FILE}" /etc/hosts
  exec "$@"
' bash "$@"
