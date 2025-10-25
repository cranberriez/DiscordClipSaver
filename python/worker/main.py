"""
Main worker entry point
"""
import asyncio
import os
import signal
from dotenv import load_dotenv
from shared.db.utils import init_db, close_db, start_health_check_loop
from shared.db.models import ScanStatus
from worker.discord.bot import WorkerBot
from shared.redis.redis_client import RedisStreamClient
from worker.processor import JobProcessor
from worker.logger import logger  # Centralized logger setup

# Load environment variables
load_dotenv()


class Worker:
    """Main worker class that orchestrates all components"""
    
    def __init__(self):
        self.bot = WorkerBot()
        # Generate unique consumer name using hostname (unique per container)
        import socket
        hostname = socket.gethostname()
        consumer_name = f"worker_{hostname}"
        
        # Extract worker number from hostname if available (e.g., "discord-clip-saver-worker-1" -> "1")
        worker_id = hostname.split('-')[-1] if '-' in hostname else hostname
        
        # Initialize Redis as a consumer with consumer group and unique name
        self.redis = RedisStreamClient(
            stream_pattern="*",
            consumer_group="worker_group",
            consumer_name=consumer_name
        )
        self.processor = None
        self.running = False
        self.shutdown_event = asyncio.Event()
        self.worker_id = worker_id
        self.health_check_task = None
        self.stale_scan_cleanup_task = None
        
        logger.info(f"🔧 Worker #{worker_id} initialized (consumer: {consumer_name})")
    
    async def initialize(self):
        """Initialize database and Redis."""
        await init_db()
        await self.redis.connect()
        self.processor = JobProcessor(bot=self.bot, redis_client=self.redis)
        logger.info("Worker components initialized successfully")

        # Start database health check loop
        health_check_interval = int(os.getenv("DB_HEALTH_CHECK_INTERVAL", "60"))
        self.health_check_task = asyncio.create_task(
            start_health_check_loop(interval_seconds=health_check_interval)
        )
        
        # Start stale scan cleanup loop
        stale_scan_interval = int(os.getenv("STALE_SCAN_CLEANUP_INTERVAL", "300"))  # 5 minutes default
        stale_scan_timeout = int(os.getenv("STALE_SCAN_TIMEOUT_MINUTES", "30"))  # 30 minutes default
        self.stale_scan_cleanup_task = asyncio.create_task(
            self.stale_scan_cleanup_loop(
                interval_seconds=stale_scan_interval,
                timeout_minutes=stale_scan_timeout
            )
        )
    
    async def shutdown(self):
        """Shutdown the worker gracefully"""
        logger.info("Shutting down worker...")
        if self.health_check_task:
            self.health_check_task.cancel()
        
        if self.stale_scan_cleanup_task:
            self.stale_scan_cleanup_task.cancel()

        # The bot is stopped via the cancelled bot_task in run()

        # Close processor and cleanup resources (aiohttp sessions, etc.)
        if self.processor:
            await self.processor.close()

        if self.redis:
            await self.redis.disconnect()

        await close_db()
        logger.info("Worker shutdown complete")
    
    async def stale_scan_cleanup_loop(self, interval_seconds: int, timeout_minutes: int):
        """
        Periodically check for and recover stale scans.
        
        Scans stuck in RUNNING/QUEUED status for longer than timeout_minutes
        will be marked as CANCELLED to allow re-scanning.
        
        Args:
            interval_seconds: How often to check (default: 300 = 5 minutes)
            timeout_minutes: How long before a scan is considered stale (default: 30 minutes)
        """
        from shared.db.repositories.scan_recovery import recover_all_stale_scans
        
        logger.info(
            f"Starting stale scan cleanup loop "
            f"(check every {interval_seconds}s, timeout: {timeout_minutes}m)"
        )
        
        while self.running:
            try:
                await asyncio.sleep(interval_seconds)
                
                # Recover stale scans
                recovered = await recover_all_stale_scans(
                    timeout_minutes=timeout_minutes,
                    new_status=ScanStatus.CANCELLED
                )
                
                if recovered > 0:
                    logger.info(f"Stale scan cleanup: recovered {recovered} stuck scans")
                
            except asyncio.CancelledError:
                logger.info("Stale scan cleanup loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in stale scan cleanup loop: {e}", exc_info=True)
                # Continue running despite errors
    
    async def process_jobs(self):
        """Main job processing loop"""
        logger.info("Starting job processing loop...")
        self.running = True
        
        # Job batch size (configurable via env var)
        job_batch_size = int(os.getenv("WORKER_JOB_BATCH_SIZE", "10"))
        
        while self.running:
            try:
                # Read jobs from Redis stream (blocks for 5 seconds)
                jobs = await self.redis.read_jobs(count=job_batch_size, block=5000)
                
                if not jobs:
                    # No jobs available, continue loop
                    continue
                
                # Process each job
                for job in jobs:
                    stream_name = job['stream_name']
                    message_id = job['message_id']
                    job_data = job['job_data']
                    metadata = job.get('metadata', {})
                    
                    try:
                        logger.info(f"[Worker #{self.worker_id}] Processing job {job_data.get('job_id', 'unknown')} (type: {job_data.get('type')}) from stream {stream_name}")
                        
                        # Process the job
                        await self.processor.process_job(job_data)
                        
                        # Acknowledge successful processing
                        await self.redis.acknowledge_job(stream_name, message_id)
                        
                        logger.info(f"[Worker #{self.worker_id}] ✓ Job {job_data.get('job_id')} completed successfully")
                        
                    except Exception as e:
                        logger.error(f"Job {job_data.get('job_id')} failed: {e}", exc_info=True)
                        
                        # Mark scan status as CANCELLED if it's a batch scan job
                        job_type = job_data.get('type')
                        if job_type == 'batch':
                            try:
                                from shared.db.repositories.channel_scan_status import update_scan_status
                                guild_id = job_data.get('guild_id')
                                channel_id = job_data.get('channel_id')
                                if guild_id and channel_id:
                                    await update_scan_status(
                                        guild_id=guild_id,
                                        channel_id=channel_id,
                                        status=ScanStatus.CANCELLED,
                                        error_message=f"Job failed and will be retried: {str(e)[:200]}"
                                    )
                                    logger.info(f"Marked scan as CANCELLED for channel {channel_id}")
                            except Exception as status_error:
                                logger.error(f"Failed to update scan status to CANCELLED: {status_error}")
                        
                        # DO NOT acknowledge failed jobs - leave them pending
                        # They will be reclaimed by another worker after idle timeout
                        # This provides automatic retry on failure
                        logger.warning(f"Job {job_data.get('job_id')} left pending for retry")
                
            except asyncio.CancelledError:
                logger.info("Job processing loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in job processing loop: {e}", exc_info=True)
                # Wait a bit before retrying to avoid tight error loop
                await asyncio.sleep(5)
        
        logger.info("Job processing loop stopped")
    
    async def run(self):
        """Run the worker"""
        bot_task = None
        try:
            # Initialize components first
            await self.initialize()

            # Now start the bot
            logger.info("Starting Discord bot...")
            bot_task = asyncio.create_task(self.bot.start_bot())

            logger.info("Waiting for bot to come online...")
            # Wait for bot with timeout to detect connection issues
            try:
                await asyncio.wait_for(self.bot.ready_event.wait(), timeout=30.0)
                logger.info("Bot is online, starting job processing.")
            except asyncio.TimeoutError:
                logger.error("Bot failed to come online within 30 seconds!")
                raise

            # Start job processing loop
            await self.process_jobs()

        except asyncio.CancelledError:
            logger.info("Main worker task cancelled.")
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)
            raise
        finally:
            logger.info("Initiating final shutdown sequence...")
            if not bot_task.done():
                bot_task.cancel()
                try:
                    await bot_task
                except asyncio.CancelledError:
                    pass  # Expected
            await self.shutdown()
            
async def main():
    """Main entry point"""
    worker = Worker()
    
    # Setup signal handlers for graceful shutdown
    def signal_handler(sig):
        logger.info(f"Received signal {sig}, initiating shutdown...")
        worker.running = False
    
    # Register signal handlers (Windows compatible)
    loop = asyncio.get_event_loop()
    try:
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda s=sig: signal_handler(s))
    except NotImplementedError:
        # Windows doesn't support add_signal_handler
        signal.signal(signal.SIGINT, lambda s, f: signal_handler(s))
        signal.signal(signal.SIGTERM, lambda s, f: signal_handler(s))
    
    # Run worker
    await worker.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        exit(1)