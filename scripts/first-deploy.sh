#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
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

created_env="false"
if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "Created .env from .env.example."
    created_env="true"
fi
if [[ ! -f .env.global ]]; then
    cp .env.global.example .env.global
    echo "Created .env.global from .env.global.example."
    created_env="true"
fi
if [[ "$created_env" == "true" ]]; then
    echo "Configure the new env files, then run this command again." >&2
    exit 1
fi

echo "Validating ${mode} Compose configuration..."
"${COMPOSE[@]}" config --quiet

if [[ "$mode" == "production" ]]; then
    echo "Pulling production application images..."
    "${COMPOSE[@]}" pull interface bot-api bot-discord worker
    echo "Starting production stack..."
    "${COMPOSE[@]}" up -d --remove-orphans
else
    echo "Building and starting local stack..."
    "${COMPOSE[@]}" up -d --build --remove-orphans
fi

if [[ "$mode" == "production" && ! -f deploy.sh ]]; then
    cp deploy.example.sh deploy.sh
    chmod +x deploy.sh
    echo "Installed deploy.sh for subsequent production deployments."
fi

echo "First deploy complete."
