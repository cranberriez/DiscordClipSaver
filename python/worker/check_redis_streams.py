"""
Quick script to check Redis streams for pending jobs
"""
import asyncio
import logging
from dotenv import load_dotenv
from worker.redis.redis_client import RedisStreamClient

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def check_streams():
    """Check all Redis streams for jobs"""
    redis_client = RedisStreamClient()
    
    try:
        await redis_client.connect()
        
        # List all job streams
        streams = await redis_client.list_streams()
        
        if not streams:
            logger.info("No job streams found in Redis")
            return
        
        logger.info(f"Found {len(streams)} stream(s):")
        
        for stream_name in streams:
            # Get stream info
            info = await redis_client.get_stream_info(stream_name)
            
            logger.info(f"\n📊 Stream: {stream_name}")
            logger.info(f"   Length: {info.get('length', 0)} jobs")
            
            # Check pending messages
            try:
                pending_info = await redis_client.client.xpending(
                    stream_name,
                    redis_client.CONSUMER_GROUP
                )
                pending_count = pending_info['pending'] if isinstance(pending_info, dict) else pending_info[0]
                logger.info(f"   Pending: {pending_count} jobs")
                
                if pending_count > 0:
                    # Get details of pending messages
                    pending_details = await redis_client.client.xpending_range(
                        stream_name,
                        redis_client.CONSUMER_GROUP,
                        min='-',
                        max='+',
                        count=10
                    )
                    logger.info(f"   Pending details:")
                    for msg_info in pending_details:
                        logger.info(f"     - Message ID: {msg_info[0]}")
                        logger.info(f"       Consumer: {msg_info[1]}")
                        logger.info(f"       Idle time: {msg_info[2]}ms")
            except Exception as e:
                logger.warning(f"   Could not get pending info: {e}")
            
            # Peek at jobs in stream
            if info.get('length', 0) > 0:
                jobs = await redis_client.peek_jobs(stream_name, count=5)
                logger.info(f"   Jobs in stream:")
                for job in jobs:
                    logger.info(f"     - Job ID: {job['metadata']['job_id']}")
                    logger.info(f"       Type: {job['metadata']['job_type']}")
                    logger.info(f"       Channel: {job['metadata']['channel_id']}")
    
    finally:
        await redis_client.disconnect()


if __name__ == "__main__":
    asyncio.run(check_streams())
