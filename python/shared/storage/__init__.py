"""
Storage module - abstract storage backends for thumbnails and other files
"""
from .base import StorageBackend
from .local import LocalStorageBackend
from .factory import get_storage_backend, create_storage_backend

__all__ = [
    'StorageBackend',
    'LocalStorageBackend',
    'get_storage_backend',
    'create_storage_backend',
]
