"""
Redis Job Schemas for Discord Clip Scraper

Jobs reference guild_id and channel_id.
Settings are fetched from the database at processing time.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime, timezone
import uuid


class BaseJob(BaseModel):
    """Base job model with common fields"""
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: Literal["batch", "message", "rescan", "thumbnail_retry"]
    guild_id: str
    channel_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BatchScanJob(BaseJob):
    """
    Job to scan N messages from a channel.
    Created by: Interface (manual scan), Bot (new channel discovered)
    """
    type: Literal["batch"] = "batch"
    direction: Literal["forward", "backward"] = "backward"
    limit: int = 100
    # Starting point for scan (null = start from beginning/end)
    before_message_id: Optional[str] = None  # For backward scan
    after_message_id: Optional[str] = None   # For forward scan
    # Whether to automatically queue continuation jobs until channel is fully scanned
    auto_continue: bool = True  # Default to True for historical scans
    # Whether to rescan already-processed messages (True) or stop when encountering them (False)
    rescan: bool = False  # Default to False - stop on duplicates for efficiency


class MessageScanJob(BaseJob):
    """
    Job to process specific messages (real-time from Bot events).
    Created by: Bot (on_message event)
    """
    type: Literal["message"] = "message"
    message_ids: list[str]  # One or more message IDs to process


class RescanJob(BaseJob):
    """
    Job triggered by settings change or manual rescan request.
    Created by: Interface (settings changed, manual rescan button)
    """
    type: Literal["rescan"] = "rescan"
    reason: str  # "settings_changed", "manual_trigger", etc.
    reset_scan_status: bool = False  # Whether to clear existing scan progress


class ThumbnailRetryJob(BaseJob):
    """
    Job to retry failed thumbnail generation.
    Created by: Bot scheduler (periodic cleanup)
    """
    type: Literal["thumbnail_retry"] = "thumbnail_retry"
    clip_ids: list[str]
    retry_count: int = 0


# Example job payloads
def example_batch_job():
    """Example: Interface user clicks 'Scan Channel'"""
    return BatchScanJob(
        guild_id="928427413694734396",
        channel_id="1424914917202464798",
        direction="backward",
        limit=100
    )


def example_message_job():
    """Example: Bot receives new message with video"""
    return MessageScanJob(
        guild_id="928427413694734396",
        channel_id="1424914917202464798",
        message_ids=["111222333444555"]
    )


def example_rescan_job():
    """Example: User changes channel settings"""
    return RescanJob(
        guild_id="928427413694734396",
        channel_id="1424914917202464798",
        reason="settings_changed",
        reset_scan_status=True
    )


def example_thumbnail_retry_job():
    """Example: Retry failed thumbnails"""
    return ThumbnailRetryJob(
        guild_id="928427413694734396",
        channel_id="1424914917202464798",
        clip_ids=["clip_abc123", "clip_def456"],
        retry_count=1
    )