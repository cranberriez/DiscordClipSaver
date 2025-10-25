"""
Repository for detecting and recovering stale/stuck scans

Handles cases where scans are stuck in RUNNING/QUEUED status due to:
- Worker crashes
- Redis job failures
- Network interruptions
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from shared.db.models import ChannelScanStatus, ScanStatus
from shared.time import utcnow

logger = logging.getLogger(__name__)


async def find_stale_scans(
    timeout_minutes: int = 30,
    statuses: Optional[List[ScanStatus]] = None
) -> List[ChannelScanStatus]:
    """
    Find scans that have been stuck in a running/queued state for too long.
    
    A scan is considered stale if:
    - Status is RUNNING or QUEUED (or custom list)
    - updated_at is older than timeout_minutes
    
    Args:
        timeout_minutes: How long before a scan is considered stale (default: 30 minutes)
        statuses: List of statuses to check (default: [RUNNING, QUEUED])
        
    Returns:
        List of stale ChannelScanStatus records
    """
    if statuses is None:
        statuses = [ScanStatus.RUNNING, ScanStatus.QUEUED]
    
    timeout_threshold = utcnow() - timedelta(minutes=timeout_minutes)
    
    stale_scans = await ChannelScanStatus.filter(
        status__in=statuses,
        updated_at__lt=timeout_threshold
    ).prefetch_related('channel', 'guild')
    
    if stale_scans:
        logger.info(
            f"Found {len(stale_scans)} stale scans "
            f"(statuses: {[s.value for s in statuses]}, timeout: {timeout_minutes}m)"
        )
    
    return stale_scans


async def recover_stale_scan(
    scan_status: ChannelScanStatus,
    new_status: ScanStatus = ScanStatus.CANCELLED,
    error_message: Optional[str] = None
) -> None:
    """
    Recover a single stale scan by updating its status.
    
    Args:
        scan_status: The stale ChannelScanStatus record
        new_status: Status to set (default: CANCELLED)
        error_message: Optional error message to set
    """
    old_status = scan_status.status
    
    if error_message is None:
        error_message = (
            f"Scan timed out - was stuck in {old_status.value} status for too long. "
            f"This usually indicates a worker crash or job failure. "
            f"Please retry the scan."
        )
    
    scan_status.status = new_status
    scan_status.error_message = error_message
    scan_status.updated_at = utcnow()
    
    await scan_status.save(update_fields=['status', 'error_message', 'updated_at'])
    
    logger.warning(
        f"Recovered stale scan for channel {scan_status.channel_id}: "
        f"{old_status.value} -> {new_status.value} "
        f"(last updated: {scan_status.updated_at})"
    )


async def recover_all_stale_scans(
    timeout_minutes: int = 30,
    new_status: ScanStatus = ScanStatus.CANCELLED,
    dry_run: bool = False
) -> int:
    """
    Find and recover all stale scans in one operation.
    
    Args:
        timeout_minutes: How long before a scan is considered stale
        new_status: Status to set for recovered scans
        dry_run: If True, only log what would be recovered without making changes
        
    Returns:
        Number of scans recovered
    """
    stale_scans = await find_stale_scans(timeout_minutes=timeout_minutes)
    
    if not stale_scans:
        logger.debug("No stale scans found")
        return 0
    
    if dry_run:
        logger.info(f"DRY RUN: Would recover {len(stale_scans)} stale scans:")
        for scan in stale_scans:
            logger.info(
                f"  - Channel {scan.channel_id} (guild {scan.guild_id}): "
                f"{scan.status.value} since {scan.updated_at}"
            )
        return len(stale_scans)
    
    recovered_count = 0
    for scan in stale_scans:
        try:
            await recover_stale_scan(scan, new_status=new_status)
            recovered_count += 1
        except Exception as e:
            logger.error(
                f"Failed to recover scan for channel {scan.channel_id}: {e}",
                exc_info=True
            )
    
    logger.info(f"Successfully recovered {recovered_count}/{len(stale_scans)} stale scans")
    return recovered_count


async def get_scan_health_stats() -> dict:
    """
    Get statistics about scan health across all channels.
    
    Returns:
        Dictionary with scan status counts and stale scan info
    """
    from tortoise.functions import Count
    
    # Get counts by status
    status_counts = await ChannelScanStatus.all().group_by('status').annotate(
        count=Count('id')
    ).values('status', 'count')
    
    # Find stale scans (30 min timeout)
    stale_scans = await find_stale_scans(timeout_minutes=30)
    
    # Find very stale scans (2 hour timeout)
    very_stale_scans = await find_stale_scans(timeout_minutes=120)
    
    return {
        'status_counts': {item['status']: item['count'] for item in status_counts},
        'stale_scans_30m': len(stale_scans),
        'stale_scans_2h': len(very_stale_scans),
        'total_scans': sum(item['count'] for item in status_counts)
    }
