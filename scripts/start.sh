#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(bash "$ROOT_DIR/scripts/compose.sh" --local)
mode="local"

case "${1:-}" in
    --local)
        shift
        ;;
    --production)
        mode="production"
        COMPOSE=(bash "$ROOT_DIR/scripts/compose.sh" --production)
        shift
        ;;
esac

if [[ $# -ne 0 ]]; then
    echo "Usage: $0 [--local|--production]" >&2
    exit 2
fi

echo "Starting ${mode} stack..."
"${COMPOSE[@]}" up -d
echo "Stack is running."
