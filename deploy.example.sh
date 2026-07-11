#!/usr/bin/env bash
#
# Deploy script for the VPS. Copy to deploy.sh (which is gitignored):
#   cp deploy.example.sh deploy.sh && chmod +x deploy.sh
#
# The VPS builds nothing. All images (interface + backend) are built in CI and
# published to GHCR. This script just syncs config from git and pulls the latest
# images, then restarts only the containers whose image actually changed.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

COMPOSE=(bash "$ROOT_DIR/scripts/compose.sh" --production)
BRANCH="${DEPLOY_BRANCH:-master}"
# Only our own GHCR images are pulled each run (avoids hammering Docker Hub's
# anonymous rate limit for postgres/redis/traefik on every poll). db-schema
# shares the worker image, so it is not listed separately.
APP_SERVICES=(interface bot-api bot-discord worker)

echo "Starting deploy..."

# Sync config only (compose file, settings) — no application code is built here.
git pull --ff-only origin "$BRANCH"

# Pull the latest app images and reconcile the stack.
"${COMPOSE[@]}" pull "${APP_SERVICES[@]}"
"${COMPOSE[@]}" up -d --remove-orphans

echo "Deploy complete."
