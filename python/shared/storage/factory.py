"""
Storage factory - creates the appropriate storage backend based on configuration
"""
import os
from typing import Optional
from .base import StorageBackend
from .local import LocalStorageBackend
import logging
from shared.logger import VERBOSE

logger = logging.getLogger(__name__)


def create_storage_backend() -> StorageBackend:
    """
    Create storage backend based on STORAGE_TYPE environment variable
    
    Environment variables:
        STORAGE_TYPE: "local" | "gcs" (default: "local")
        
        For local:
            STORAGE_PATH: Base path for storage (default: "./storage")
        
        For GCS:
            GCS_BUCKET_NAME: GCS bucket name (required)
            GCS_PROJECT_ID: GCP project ID (optional)
            GOOGLE_APPLICATION_CREDENTIALS: Path to service account JSON
        
    Returns:
        Configured storage backend
    """
    storage_type = os.getenv("STORAGE_TYPE", "local").lower()
    
    if storage_type == "local":
        storage_path = os.getenv("STORAGE_PATH", "./storage")
        logger.info("Using local storage backend")
        logger.log(VERBOSE, f"Storage path: {storage_path}")
        return LocalStorageBackend(base_path=storage_path)
    
    elif storage_type == "gcs":
        bucket_name = os.getenv("GCS_BUCKET_NAME")
        if not bucket_name:
            raise ValueError("GCS_BUCKET_NAME environment variable is required for GCS storage")
        
        project_id = os.getenv("GCS_PROJECT_ID")
        logger.info("Using GCS storage backend")
        logger.log(VERBOSE, f"Bucket: {bucket_name}, Project: {project_id}")
        
        from .gcs import GCSStorageBackend
        return GCSStorageBackend(bucket_name=bucket_name, project_id=project_id)
    
    else:
        raise ValueError(f"Unknown storage type: {storage_type}. Use 'local' or 'gcs'")


# Singleton instance
_storage_backend: Optional[StorageBackend] = None


def get_storage_backend() -> StorageBackend:
    """
    Get the singleton storage backend instance
    
    Returns:
        Configured storage backend
    """
    global _storage_backend
    
    if _storage_backend is None:
        _storage_backend = create_storage_backend()
    
    return _storage_backend
