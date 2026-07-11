"""
Google Cloud Storage backend

Requires: pip install google-cloud-storage
"""
import asyncio
import logging
from typing import Optional

from .base import StorageBackend

logger = logging.getLogger(__name__)


class GCSStorageBackend(StorageBackend):
    """Google Cloud Storage backend"""
    
    def __init__(self, bucket_name: str, project_id: Optional[str] = None):
        """
        Initialize GCS storage
        
        Args:
            bucket_name: GCS bucket name
            project_id: GCP project ID (optional, uses default credentials)
        
        Environment variables:
            GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON
        """
        try:
            from google.cloud import storage
        except ImportError:
            raise ImportError(
                "google-cloud-storage is required for GCS backend. "
                "Install with: pip install google-cloud-storage"
            )
        
        self.bucket_name = bucket_name
        self.client = storage.Client(project=project_id)
        self.bucket = self.client.bucket(bucket_name)
        
        logger.info(f"GCSStorageBackend initialized for bucket: {bucket_name}")
    
    async def save(self, file_data: bytes, path: str) -> str:
        """Upload a private object to GCS."""
        blob = self.bucket.blob(path)
        content_type = self._get_content_type(path)
        await asyncio.to_thread(
            blob.upload_from_string,
            file_data,
            content_type=content_type,
        )
        
        logger.info(f"Uploaded file to GCS: gs://{self.bucket_name}/{path}")
        return f"gs://{self.bucket_name}/{path}"

    async def save_if_absent(self, file_data: bytes, path: str) -> bool:
        """Create an object without overwriting an object written concurrently."""
        from google.api_core.exceptions import PreconditionFailed

        blob = self.bucket.blob(path)
        try:
            await asyncio.to_thread(
                blob.upload_from_string,
                file_data,
                content_type=self._get_content_type(path),
                if_generation_match=0,
            )
            return True
        except PreconditionFailed:
            return False
    
    async def read(self, path: str) -> bytes:
        """Download file from GCS"""
        blob = self.bucket.blob(path)
        return await asyncio.to_thread(blob.download_as_bytes)
    
    async def delete(self, path: str) -> bool:
        """Delete file from GCS"""
        from google.api_core.exceptions import NotFound

        try:
            blob = self.bucket.blob(path)
            await asyncio.to_thread(blob.delete)
            logger.info(f"Deleted file from GCS: {path}")
            return True
        except NotFound:
            logger.warning(f"GCS object not found for deletion: {path}")
            return False
    
    async def exists(self, path: str) -> bool:
        """Check if file exists in GCS"""
        blob = self.bucket.blob(path)
        return await asyncio.to_thread(blob.exists)

    async def get_size(self, path: str) -> int:
        """Return a GCS object's size without downloading it."""
        blob = self.bucket.blob(path)
        await asyncio.to_thread(blob.reload)
        return int(blob.size or 0)
    
    def _get_content_type(self, path: str) -> str:
        """Determine content type from file extension"""
        ext = path.split('.')[-1].lower()
        content_types = {
            'webp': 'image/webp',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
        }
        return content_types.get(ext, 'application/octet-stream')
