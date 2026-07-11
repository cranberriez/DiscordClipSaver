"""Explicit, restartable migration of local thumbnails to private GCS objects.

Dry-run is the default. Pass --apply to upload objects and update each database
row only after its destination object is known to exist. Source files are never
modified or deleted, and the command never lists bucket prefixes.
"""

import argparse
import asyncio
import logging
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from shared.db.models import Thumbnail
from shared.db.utils import close_db, init_db
from shared.storage.gcs import GCSStorageBackend
from shared.storage.thumbnail_keys import thumbnail_object_key

logger = logging.getLogger(__name__)


@dataclass
class MigrationStats:
    examined: int = 0
    uploaded: int = 0
    already_present: int = 0
    rows_updated: int = 0
    missing_source: int = 0
    failed: int = 0


def _source_path(source_root: Path, storage_path: str) -> Path:
    if not storage_path or Path(storage_path).is_absolute():
        raise ValueError("thumbnail storage_path must be relative")
    resolved = (source_root / storage_path).resolve()
    if not resolved.is_relative_to(source_root):
        raise ValueError("thumbnail storage_path escapes source root")
    return resolved


async def migrate(
    *, source_root: Path, apply: bool, limit: int | None, batch_size: int
) -> MigrationStats:
    bucket = os.getenv("GCS_BUCKET_NAME")
    if not bucket:
        raise ValueError("GCS_BUCKET_NAME is required")

    source_root = source_root.resolve()
    if not source_root.is_dir():
        raise ValueError(f"Local source root does not exist: {source_root}")

    destination = GCSStorageBackend(bucket, os.getenv("GCS_PROJECT_ID"))
    stats = MigrationStats()
    remaining = limit
    last_id: str | None = None

    while remaining is None or remaining > 0:
        page_size = batch_size if remaining is None else min(batch_size, remaining)
        query = Thumbnail.filter(deleted_at__isnull=True)
        if last_id is not None:
            query = query.filter(id__gt=last_id)
        thumbnails = await (
            query.order_by("id").limit(page_size).prefetch_related("clip")
        )
        if not thumbnails:
            break

        for thumbnail in thumbnails:
            stats.examined += 1
            try:
                clip = thumbnail.clip
                target = thumbnail_object_key(
                    str(clip.guild_id),
                    str(clip.channel_id),
                    str(clip.id),
                    thumbnail.size_type,
                )

                if thumbnail.storage_path == target:
                    if await destination.exists(target):
                        stats.already_present += 1
                    else:
                        logger.error(
                            "Database points to a missing destination object: %s", target
                        )
                        stats.failed += 1
                    continue

                destination_exists = await destination.exists(target)
                if not destination_exists:
                    source = _source_path(source_root, thumbnail.storage_path)
                    if not source.is_file():
                        logger.warning(
                            "Missing local source for thumbnail %s: %s",
                            thumbnail.id,
                            source,
                        )
                        stats.missing_source += 1
                        continue
                    if not apply:
                        logger.info(
                            "Would upload %s -> gs://%s/%s", source, bucket, target
                        )
                        continue

                    data = await asyncio.to_thread(source.read_bytes)
                    created = await destination.save_if_absent(data, target)
                    if created:
                        stats.uploaded += 1
                    else:
                        stats.already_present += 1
                else:
                    stats.already_present += 1

                if apply:
                    thumbnail.storage_path = target
                    await thumbnail.save(update_fields=["storage_path", "updated_at"])
                    stats.rows_updated += 1
            except Exception:
                stats.failed += 1
                logger.exception("Failed to migrate thumbnail %s", thumbnail.id)

        last_id = str(thumbnails[-1].id)
        if remaining is not None:
            remaining -= len(thumbnails)

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-root",
        type=Path,
        default=Path(os.getenv("STORAGE_PATH", "./storage")),
        help="Root containing legacy local thumbnail files",
    )
    parser.add_argument("--limit", type=int, help="Process at most this many rows")
    parser.add_argument("--batch-size", type=int, default=200, help="Database page size")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Plan only (the default)")
    mode.add_argument("--apply", action="store_true", help="Upload and update database rows")
    return parser.parse_args()


async def _main() -> int:
    load_dotenv()
    args = parse_args()
    if args.limit is not None and args.limit < 1:
        raise ValueError("--limit must be positive")
    if args.batch_size < 1 or args.batch_size > 5000:
        raise ValueError("--batch-size must be from 1 to 5000")
    await init_db()
    try:
        stats = await migrate(
            source_root=args.source_root,
            apply=args.apply,
            limit=args.limit,
            batch_size=args.batch_size,
        )
    finally:
        await close_db()

    mode = "APPLY" if args.apply else "DRY RUN"
    print(
        f"{mode}: examined={stats.examined} uploaded={stats.uploaded} "
        f"already_present={stats.already_present} rows_updated={stats.rows_updated} "
        f"missing_source={stats.missing_source} failed={stats.failed}"
    )
    return 1 if stats.failed or stats.missing_source else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
