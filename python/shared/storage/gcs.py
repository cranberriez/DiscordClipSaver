"""
Google Cloud Storage backend

Requires: pip install google-cloud-storage
"""
import os
from .base import StorageBackend
import logging

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
        """Upload file to GCS"""
        blob = self.bucket.blob(path)
        
        # Upload with content type detection
        content_type = self._get_content_type(path)
        blob.upload_from_string(file_data, content_type=content_type)
        
        logger.info(f"Uploaded file to GCS: gs://{self.bucket_name}/{path}")
        return f"gs://{self.bucket_name}/{path}"
    
    async def read(self, path: str) -> bytes:
        """Download file from GCS"""
        blob = self.bucket.blob(path)
        return blob.download_as_bytes()
    
    async def delete(self, path: str) -> bool:
        """Delete file from GCS"""
        try:
            blob = self.bucket.blob(path)
            blob.delete()
            logger.info(f"Deleted file from GCS: {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from GCS: {e}")
            return False
    
    async def exists(self, path: str) -> bool:
        """Check if file exists in GCS"""
        blob = self.bucket.blob(path)
        return blob.exists()
    
    def get_public_url(self, path: str) -> str:
        """
        Get public URL for the file
        
        Note: Bucket must have public access enabled, or use signed URLs
        """
        return f"https://storage.googleapis.com/{self.bucket_name}/{path}"
    
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
