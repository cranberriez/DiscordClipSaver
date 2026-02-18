"""
Retry utilities for Discord API calls
"""
import asyncio
import logging
import random
from typing import TypeVar, Callable, Any, Coroutine
import discord

logger = logging.getLogger(__name__)

T = TypeVar("T")

async def execute_with_retry(
    func: Callable[..., Coroutine[Any, Any, T]],
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    **kwargs
) -> T:
    """
    Execute a discord.py async function with exponential backoff retry for HTTP errors.
    
    Handles:
    - 429 (Too Many Requests)
    - 5xx (Server Errors)
    
    Args:
        func: Async function to execute
        *args: Positional arguments for func
        max_retries: Maximum number of retries
        base_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        **kwargs: Keyword arguments for func
        
    Returns:
        Result of func
        
    Raises:
        discord.HTTPException: If retries exhausted or non-retryable status
        Exception: Other exceptions
    """
    retries = 0
    while True:
        try:
            return await func(*args, **kwargs)
        except discord.HTTPException as e:
            # Check if we should retry
            # 429: Rate Limited (if discord.py didn't handle it or gave up)
            # 500-599: Server Errors (Discord is having issues)
            should_retry = e.status == 429 or (500 <= e.status < 600)
            
            if not should_retry or retries >= max_retries:
                if should_retry:
                    logger.error(f"Discord API error {e.status}: Retries exhausted ({retries}/{max_retries})")
                raise
            
            retries += 1
            
            # Check for Retry-After header or attribute
            retry_after = None
            
            # Check for retry_after attribute (RateLimited exception or similar)
            if hasattr(e, 'retry_after'):
                retry_after = float(e.retry_after)
            
            # Check response headers if available
            if retry_after is None and hasattr(e, 'response') and e.response is not None and hasattr(e.response, 'headers'):
                header_retry = e.response.headers.get('Retry-After')
                if header_retry:
                    try:
                        retry_after = float(header_retry)
                    except (ValueError, TypeError):
                        pass
            
            # Calculate delay
            if retry_after is not None:
                # Add a small buffer to be safe
                sleep_time = retry_after + 0.5
                logger.warning(
                    f"Discord API Rate Limit {e.status} (attempt {retries}/{max_retries}). "
                    f"Respecting Retry-After: {sleep_time:.2f}s"
                )
            else:
                # Exponential backoff with jitter
                # delay = base * 2^(retries-1)
                # jitter = random 0-50% of delay
                calc_delay = min(base_delay * (2 ** (retries - 1)), max_delay)
                jitter = random.uniform(0, 0.5 * calc_delay)
                sleep_time = calc_delay + jitter
                
                logger.warning(
                    f"Discord API error {e.status} (attempt {retries}/{max_retries}). "
                    f"Retrying in {sleep_time:.2f}s... Error: {e.text}"
                )
            
            await asyncio.sleep(sleep_time)
            
        except Exception:
            # Don't retry other exceptions (like NotFound, Forbidden, etc.)
            raise
