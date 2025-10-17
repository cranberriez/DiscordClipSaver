"""
Main worker entry point
"""
import asyncio
import logging
import os
import signal
from dotenv import load_dotenv
from shared.db.utils import init_db, close_db, start_health_check_loop
from worker.discord.bot import WorkerBot
from shared.redis.redis_client import RedisStreamClient
from worker.processor import JobProcessor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


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
        
        logger.info(f"🔧 Worker #{worker_id} initialized (consumer: {consumer_name})")
    
    async def initialize(self):
        """Initialize all worker components"""
        logger.info("Initializing worker...")
        
        # Initialize database connection
        await init_db(generate_schemas=False)
        
        # Start Discord bot (non-blocking)
        bot_task = asyncio.create_task(self.bot.start())
        
        # Wait for bot to be ready
        await self.bot.wait_until_ready()
        
        # Connect to Redis
        await self.redis.connect()
        
        # Initialize processor with redis client for job continuation
        self.processor = JobProcessor(
            bot=self.bot,
            redis_client=self.redis
        )
        
        # Start database health check loop
        health_check_interval = int(os.getenv("DB_HEALTH_CHECK_INTERVAL", "60"))
        self.health_check_task = asyncio.create_task(
            start_health_check_loop(interval_seconds=health_check_interval)
        )
        
        logger.info("Worker initialized successfully")
        
        return bot_task
    
    async def shutdown(self):
        """Gracefully shutdown all components"""
        logger.info("Shutting down worker...")
        
        self.running = False
        
        # Cancel health check task
        if self.health_check_task and not self.health_check_task.done():
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        
        # Close processor and its handlers (releases aiohttp sessions)
        if self.processor:
            await self.processor.close()
        
        # Stop Discord bot
        await self.bot.stop()
        
        # Disconnect Redis
        await self.redis.disconnect()
        
        # Close database connections
        await close_db()
        
        logger.info("Worker shutdown complete")
    
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
        try:
            # Initialize components
            bot_task = await self.initialize()
            
            # Start job processing
            await self.process_jobs()
            
            # Cancel bot task on shutdown
            bot_task.cancel()
            try:
                await bot_task
            except asyncio.CancelledError:
                pass
            
        except Exception as e:
            logger.error(f"Worker error: {e}", exc_info=True)
            raise
        finally:
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