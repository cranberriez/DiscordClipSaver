#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE=(bash "$ROOT_DIR/scripts/compose.sh" --local --gcs)
mode="--dry-run"
extra_args=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --local)
            COMPOSE=(bash "$ROOT_DIR/scripts/compose.sh" --local --gcs)
            shift
            ;;
        --production)
            COMPOSE=(bash "$ROOT_DIR/scripts/compose.sh" --production --gcs)
            shift
            ;;
        --dry-run)
            mode="--dry-run"
            shift
            ;;
        --apply)
            mode="--apply"
            shift
            ;;
        --limit|--batch-size)
            if [[ $# -lt 2 ]]; then
                echo "$1 requires a value" >&2
                exit 2
            fi
            extra_args+=("$1" "$2")
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            echo "Usage: $0 [--local|--production] [--dry-run|--apply] [--limit N] [--batch-size N]" >&2
            exit 2
            ;;
    esac
done

"${COMPOSE[@]}" config --quiet

echo "Running thumbnail migration ${mode}..."
"${COMPOSE[@]}" run --rm --entrypoint sh worker -ec '
    credentials="${GOOGLE_APPLICATION_CREDENTIALS:-}"
    if [ -z "$credentials" ]; then
        echo "GOOGLE_APPLICATION_CREDENTIALS is not set inside the worker container." >&2
        exit 1
    fi
    if [ ! -r "$credentials" ]; then
        echo "GCS credential is not mounted or readable at: $credentials" >&2
        echo "Check GCS_CREDENTIALS_FILE in the root .env and its host file path." >&2
        exit 1
    fi
    exec python -m worker.migrate_thumbnails_to_gcs "$@"
' migrate-thumbnails \
    --source-root /app/storage \
    "$mode" \
    "${extra_args[@]}"
