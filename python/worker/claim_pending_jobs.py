"""
Manually claim all pending jobs from Redis streams

Use this after a worker crash to immediately reclaim pending jobs
without waiting for the 60-second idle timeout.
"""
import asyncio
import logging
from dotenv import load_dotenv
from worker.redis.redis_client import RedisStreamClient

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def claim_all_pending():
    """Claim all pending jobs immediately (no idle time check)"""
    redis_client = RedisStreamClient()
    
    try:
        await redis_client.connect()
        
        # Get all streams
        streams = await redis_client.list_streams()
        
        if not streams:
            logger.info("No job streams found")
            return
        
        total_claimed = 0
        
        for stream_name in streams:
            try:
                # Get pending messages
                pending = await redis_client.client.xpending_range(
                    stream_name,
                    redis_client.CONSUMER_GROUP,
                    min='-',
                    max='+',
                    count=100
                )
                
                if not pending:
                    logger.info(f"No pending jobs in {stream_name}")
                    continue
                
                logger.info(f"Found {len(pending)} pending job(s) in {stream_name}")
                
                # Claim each pending message (min_idle_time=0 to claim immediately)
                for msg_info in pending:
                    message_id = msg_info[0]
                    
                    try:
                        # Claim with 0 idle time (immediate claim)
                        claimed = await redis_client.client.xclaim(
                            stream_name,
                            redis_client.CONSUMER_GROUP,
                            redis_client.CONSUMER_NAME,
                            min_idle_time=0,  # Claim immediately
                            message_ids=[message_id]
                        )
                        
                        if claimed:
                            total_claimed += 1
                            # Get job ID from claimed data
                            for msg_id, data in claimed:
                                job_id = data.get('job_id', 'unknown')
                                logger.info(f"✅ Claimed job {job_id} ({message_id})")
                    
                    except Exception as e:
                        logger.error(f"Failed to claim {message_id}: {e}")
            
            except Exception as e:
                logger.error(f"Failed to process stream {stream_name}: {e}")
                continue
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Total jobs claimed: {total_claimed}")
        logger.info(f"{'='*60}")
        logger.info("These jobs will be processed when the worker starts")
    
    finally:
        await redis_client.disconnect()


if __name__ == "__main__":
    print("\n" + "="*60)
    print("Claim Pending Jobs from Redis Streams")
    print("="*60 + "\n")
    
    asyncio.run(claim_all_pending())
