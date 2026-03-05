#!/usr/bin/env bash
set -euo pipefail

echo "Starting deploy..."

git stash
git pull
git stash pop

docker compose -f docker-compose-prod.yml pull interface
docker compose -f docker-compose-prod.yml up -d --build

echo "Deploy complete."