import asyncio
import functools
import os
from typing import Dict, Any, Optional, Callable, TypeVar, ParamSpec
from tortoise import Tortoise
from tortoise.exceptions import OperationalError, IntegrityError
from .config import get_tortoise_config
import logging

logger = logging.getLogger(__name__)

# Type variables for decorator
P = ParamSpec('P')
T = TypeVar('T')

# Retry configuration
DB_RETRY_MAX_ATTEMPTS = int(os.getenv("DB_RETRY_MAX_ATTEMPTS", "3"))
DB_RETRY_BASE_DELAY = float(os.getenv("DB_RETRY_BASE_DELAY", "0.5"))  # seconds
DB_RETRY_MAX_DELAY = float(os.getenv("DB_RETRY_MAX_DELAY", "10.0"))  # seconds


def db_retry(
    max_attempts: Optional[int] = None,
    base_delay: Optional[float] = None,
    max_delay: Optional[float] = None,
    retry_on: tuple = (OperationalError,)
) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Decorator that retries database operations on transient failures with exponential backoff.
    
    Retries on connection errors, timeouts, and deadlocks. Does NOT retry on:
    - IntegrityError (unique constraints, foreign keys) - these are permanent
    - Other application logic errors
    
    Args:
        max_attempts: Maximum retry attempts (default: DB_RETRY_MAX_ATTEMPTS env var)
        base_delay: Initial delay in seconds (default: DB_RETRY_BASE_DELAY env var)
        max_delay: Maximum delay cap in seconds (default: DB_RETRY_MAX_DELAY env var)
        retry_on: Tuple of exception types to retry (default: OperationalError only)
        
    Usage:
        @db_retry()
        async def my_db_operation():
            return await SomeModel.get(id=1)
            
        @db_retry(max_attempts=5, base_delay=1.0)
        async def critical_operation():
            # Custom retry params for critical ops
            pass
    """
    _max_attempts = max_attempts or DB_RETRY_MAX_ATTEMPTS
    _base_delay = base_delay or DB_RETRY_BASE_DELAY
    _max_delay = max_delay or DB_RETRY_MAX_DELAY
    
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        async def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            last_exception = None
            
            for attempt in range(1, _max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except retry_on as e:
                    last_exception = e
                    
                    if attempt == _max_attempts:
                        # Final attempt failed
                        logger.error(
                            f"DB operation '{func.__name__}' failed after {_max_attempts} attempts: {e}"
                        )
                        raise
                    
                    # Calculate exponential backoff with jitter
                    delay = min(_base_delay * (2 ** (attempt - 1)), _max_delay)
                    # Add jitter (±25%) to prevent thundering herd
                    jitter = delay * 0.25 * (2 * (hash(str(args)) % 100) / 100 - 1)
                    sleep_time = max(0.1, delay + jitter)
                    
                    logger.warning(
                        f"DB operation '{func.__name__}' failed (attempt {attempt}/{_max_attempts}), "
                        f"retrying in {sleep_time:.2f}s: {e}"
                    )
                    
                    await asyncio.sleep(sleep_time)
                except Exception as e:
                    # Non-retriable error (IntegrityError, application logic, etc.)
                    logger.debug(f"DB operation '{func.__name__}' failed with non-retriable error: {e}")
                    raise
            
            # Should never reach here, but satisfy type checker
            raise last_exception
        
        return wrapper
    return decorator


async def init_db(generate_schemas: bool = False, config: Optional[Dict[str, Any]] = None) -> None:
    try:
        tortoise_config = config or get_tortoise_config()
        logger.info("Initializing database, tortoise config: %s", tortoise_config)
        await Tortoise.init(config=tortoise_config)
        if generate_schemas:
            await Tortoise.generate_schemas(safe=True)
        logger.info("Database initialized successfully, schemas generated: %s, tortoise config: %s", generate_schemas, tortoise_config)
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def close_db() -> None:
    try:
        await Tortoise.close_connections()
        logger.info("Database connections closed")
    except Exception as e:
        logger.error(f"Error closing database connections: {e}")


async def check_db_health() -> Dict[str, Any]:
    """
    Check database connection health.
    
    Performs a simple query to verify the database is responsive.
    Useful for health check endpoints and periodic monitoring.
    
    Returns:
        Dict with 'healthy' (bool), 'latency_ms' (float), and optional 'error' (str)
        
    Example:
        health = await check_db_health()
        if not health['healthy']:
            logger.error(f"DB unhealthy: {health['error']}")
    """
    import time
    from tortoise import connections
    
    result = {
        'healthy': False,
        'latency_ms': None,
        'error': None
    }
    
    try:
        start = time.perf_counter()
        
        # Simple query to test connection
        # Use raw SQL to avoid ORM overhead
        conn = connections.get('default')
        await conn.execute_query_dict('SELECT 1 as health_check')
        
        end = time.perf_counter()
        latency_ms = (end - start) * 1000
        
        result['healthy'] = True
        result['latency_ms'] = round(latency_ms, 2)
        
        logger.debug(f"DB health check passed ({latency_ms:.2f}ms)")
        
    except Exception as e:
        result['error'] = str(e)
        logger.warning(f"DB health check failed: {e}")
    
    return result


async def start_health_check_loop(interval_seconds: int = 60) -> None:
    """
    Start periodic health check loop (runs in background).
    
    Logs warnings if database becomes unhealthy.
    Intended to run as a background task in the worker.
    
    Args:
        interval_seconds: Seconds between health checks (default: 60)
        
    Usage:
        # In worker startup
        asyncio.create_task(start_health_check_loop(interval_seconds=30))
    """
    logger.info(f"Starting DB health check loop (interval: {interval_seconds}s)")
    
    consecutive_failures = 0
    max_consecutive_failures = 3
    
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            
            health = await check_db_health()
            
            if health['healthy']:
                if consecutive_failures > 0:
                    logger.info("DB health restored")
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                logger.warning(
                    f"DB health check failed ({consecutive_failures}/{max_consecutive_failures}): "
                    f"{health['error']}"
                )
                
                if consecutive_failures >= max_consecutive_failures:
                    logger.error(
                        f"DB unhealthy for {consecutive_failures} consecutive checks! "
                        "Consider restarting worker or checking database status."
                    )
                    
        except asyncio.CancelledError:
            logger.info("DB health check loop cancelled")
            break
        except Exception as e:
            logger.error(f"Error in health check loop: {e}", exc_info=True)