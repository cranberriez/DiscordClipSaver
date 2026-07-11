import asyncio
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from shared.storage.local import LocalStorageBackend
from shared.storage.gcs import GCSStorageBackend
from shared.storage.thumbnail_keys import thumbnail_object_key
from worker import migrate_thumbnails_to_gcs as migration
from worker.migrate_thumbnails_to_gcs import _source_path


class ThumbnailKeyTests(unittest.TestCase):
    def test_canonical_key(self):
        self.assertEqual(
            thumbnail_object_key("123", "456", "a" * 32, "large"),
            f"thumbnails/v1/123/456/{'a' * 32}/large.webp",
        )

    def test_rejects_path_components(self):
        with self.assertRaises(ValueError):
            thumbnail_object_key("123", "../456", "a" * 32, "small")
        with self.assertRaises(ValueError):
            thumbnail_object_key("123", "456", "not-a-clip", "small")


class ThumbnailCacheControlTests(unittest.TestCase):
    def test_private_cache_is_bounded_by_signed_url(self):
        with patch.dict(
            "os.environ",
            {
                "GCS_SIGNED_URL_TTL_SECONDS": "300",
                "THUMBNAIL_BROWSER_CACHE_SECONDS": "240",
            },
        ):
            self.assertEqual(
                GCSStorageBackend._get_cache_control(),
                "private, max-age=240, no-transform",
            )

    def test_rejects_cache_longer_than_signed_url_margin(self):
        with patch.dict(
            "os.environ",
            {
                "GCS_SIGNED_URL_TTL_SECONDS": "300",
                "THUMBNAIL_BROWSER_CACHE_SECONDS": "300",
            },
        ):
            with self.assertRaises(ValueError):
                GCSStorageBackend._get_cache_control()


class LocalStorageTests(unittest.IsolatedAsyncioTestCase):
    async def test_round_trip_and_size(self):
        with tempfile.TemporaryDirectory() as root:
            storage = LocalStorageBackend(root)
            key = thumbnail_object_key("123", "456", "b" * 32, "small")
            await storage.save(b"webp", key)
            self.assertTrue(await storage.exists(key))
            self.assertEqual(await storage.read(key), b"webp")
            self.assertEqual(await storage.get_size(key), 4)

    async def test_rejects_traversal(self):
        with tempfile.TemporaryDirectory() as root:
            storage = LocalStorageBackend(root)
            with self.assertRaises(ValueError):
                await storage.read("../secret")


class MigrationPathTests(unittest.TestCase):
    def test_source_path_stays_under_root(self):
        root = Path(tempfile.mkdtemp()).resolve()
        self.assertTrue(_source_path(root, "thumbnails/file.webp").is_relative_to(root))
        with self.assertRaises(ValueError):
            _source_path(root, "../file.webp")


class MigrationBehaviorTests(unittest.IsolatedAsyncioTestCase):
    async def test_uploads_canonical_local_key_when_gcs_object_is_missing(self):
        key = thumbnail_object_key("123", "456", "c" * 32, "small")

        class Clip:
            guild_id = "123"
            channel_id = "456"
            id = "c" * 32

        class ThumbnailRow:
            id = "thumb-1"
            clip = Clip()
            size_type = "small"
            storage_path = key

            async def save(self, **_kwargs):
                raise AssertionError("Canonical paths should not need a DB update")

        class Query:
            def __init__(self, rows):
                self.rows = rows

            def filter(self, **_kwargs):
                return Query([])

            def order_by(self, *_args):
                return self

            def limit(self, _limit):
                return self

            def prefetch_related(self, *_args):
                return self

            def __await__(self):
                async def result():
                    return self.rows

                return result().__await__()

        class ThumbnailModel:
            calls = 0

            @classmethod
            def filter(cls, **_kwargs):
                cls.calls += 1
                return Query([ThumbnailRow()] if cls.calls == 1 else [])

        class Destination:
            uploaded = []

            async def exists(self, _path):
                return False

            async def save_if_absent(self, data, path):
                self.uploaded.append((data, path))
                return True

        destination = Destination()
        with tempfile.TemporaryDirectory() as root_value:
            root = Path(root_value)
            source = root / key
            source.parent.mkdir(parents=True)
            source.write_bytes(b"webp")

            with (
                patch.object(migration, "Thumbnail", ThumbnailModel),
                patch.object(
                    migration,
                    "GCSStorageBackend",
                    return_value=destination,
                ),
                patch.dict("os.environ", {"GCS_BUCKET_NAME": "bucket"}),
            ):
                stats = await migration.migrate(
                    source_root=root,
                    apply=True,
                    limit=None,
                    batch_size=200,
                )

        self.assertEqual(stats.uploaded, 1)
        self.assertEqual(stats.rows_updated, 0)
        self.assertEqual(destination.uploaded, [(b"webp", key)])


if __name__ == "__main__":
    unittest.main()
