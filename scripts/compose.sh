#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Git Bash/MSYS rewrites Linux-looking CLI arguments (for example
# /app/storage) into Windows host paths before invoking docker.exe. Compose
# `run` arguments are container paths, so preserve them verbatim.
case "${MSYSTEM:-}" in
    MINGW*|MSYS*)
        export MSYS_NO_PATHCONV=1
        export MSYS2_ARG_CONV_EXCL="*"
        ;;
esac

mode="local"
force_gcs="false"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --local)
            mode="local"
            shift
            ;;
        --production)
            mode="production"
            shift
            ;;
        --gcs)
            force_gcs="true"
            shift
            ;;
        *)
            break
            ;;
    esac
done

if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [--local|--production] <docker compose arguments...>" >&2
    exit 2
fi

if [[ ! -f .env || ! -f .env.global ]]; then
    echo "Missing .env or .env.global. Copy the example files and configure them first." >&2
    exit 1
fi

read_env_value() {
    local name="$1"
    local file="$2"
    sed -nE \
        "s/^[[:space:]]*${name}[[:space:]]*=[[:space:]]*['\"]?([^'\"#[:space:]]+)['\"]?[[:space:]]*(#.*)?$/\1/p" \
        "$file" | tail -n 1
}

storage_type="$(read_env_value STORAGE_TYPE .env.global)"
storage_type="${storage_type:-local}"

if [[ "$mode" == "production" ]]; then
    compose_files=(-f docker-compose-prod.yml)
else
    compose_files=(-f docker-compose.yml)
fi

if [[ "${storage_type,,}" == "gcs" || "$force_gcs" == "true" ]]; then
    compose_files+=(-f docker-compose.gcs.yml)
fi

exec docker compose "${compose_files[@]}" "$@"
