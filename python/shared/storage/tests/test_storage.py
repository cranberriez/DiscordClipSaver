import asyncio
import tempfile
import unittest
from pathlib import Path

from shared.storage.local import LocalStorageBackend
from shared.storage.thumbnail_keys import thumbnail_object_key
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


if __name__ == "__main__":
    unittest.main()
