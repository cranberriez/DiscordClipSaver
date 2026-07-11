"""
Local filesystem storage backend

Works for both:
- Local development (stores in ./storage/)
- Docker volumes (mount volume to /app/storage)
"""
import aiofiles
from pathlib import Path
import logging
import aiofiles.os
from .base import StorageBackend
from shared.logger import VERBOSE

logger = logging.getLogger(__name__)


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage"""
    
    def __init__(self, base_path: str = "./storage"):
        """
        Initialize local storage
        
        Args:
            base_path: Base directory for storage
                       For local dev: "./storage"
                       For Docker: "/app/storage" (mount a volume here)
        """
        self.base_path = Path(base_path).resolve()
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.log(VERBOSE, f"LocalStorageBackend initialized at: {self.base_path.absolute()}")

    def _resolve_path(self, path: str) -> Path:
        relative = Path(path)
        if relative.is_absolute():
            raise ValueError("Storage paths must be relative")
        full_path = (self.base_path / relative).resolve()
        if not full_path.is_relative_to(self.base_path):
            raise ValueError("Storage path escapes the configured root")
        return full_path
    
    async def save(self, file_data: bytes, path: str) -> str:
        """Save file to local filesystem"""
        full_path = self._resolve_path(path)
        
        # Create parent directories
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file asynchronously
        async with aiofiles.open(full_path, 'wb') as f:
            await f.write(file_data)
        
        logger.info(f"Saved file to: {full_path}")
        return str(full_path)
    
    async def read(self, path: str) -> bytes:
        """Read file from local filesystem"""
        full_path = self._resolve_path(path)
        
        async with aiofiles.open(full_path, 'rb') as f:
            return await f.read()
    
    async def delete(self, path: str) -> bool:
        """Delete file from local filesystem"""
        full_path = self._resolve_path(path)
        
        try:
            full_path.unlink()
            logger.info(f"Deleted file: {full_path}")
            return True
        except FileNotFoundError:
            logger.warning(f"File not found for deletion: {full_path}")
            return False
    
    async def exists(self, path: str) -> bool:
        """Check if file exists"""
        full_path = self._resolve_path(path)
        return full_path.exists()

    async def get_size(self, path: str) -> int:
        """Return a local object's size."""
        return (await aiofiles.os.stat(self._resolve_path(path))).st_size
