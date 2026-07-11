"""
Abstract base class for storage backends

Supports local filesystem, Docker volumes, and cloud storage (GCS, S3, etc.)
"""
from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """Abstract storage backend interface"""
    
    @abstractmethod
    async def save(self, file_data: bytes, path: str) -> str:
        """
        Save file data to storage
        
        Args:
            file_data: Binary file data
            path: Relative path where file should be saved (e.g., "thumbnails/clip_abc123.webp")
            
        Returns:
            Full storage path or URL to the saved file
        """
        pass
    
    @abstractmethod
    async def read(self, path: str) -> bytes:
        """
        Read file data from storage
        
        Args:
            path: Path to the file
            
        Returns:
            Binary file data
        """
        pass
    
    @abstractmethod
    async def delete(self, path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            path: Path to the file
            
        Returns:
            True if deleted successfully
        """
        pass
    
    @abstractmethod
    async def exists(self, path: str) -> bool:
        """
        Check if file exists in storage
        
        Args:
            path: Path to the file
            
        Returns:
            True if file exists
        """
        pass

    @abstractmethod
    async def get_size(self, path: str) -> int:
        """
        Get the size of an object in bytes.
        
        Args:
            path: Path to the file
            
        Returns:
            Object size in bytes
        """
        pass
