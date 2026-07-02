import hmac
import logging
import os
from typing import Any, Optional

import aiohttp
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel

logger = logging.getLogger(__name__)


async def require_internal_token(request: Request) -> None:
    """
    Require the shared internal API token on every route except /health.

    The bot API proxies Discord REST calls with the bot token's permissions,
    so it must never be callable by unauthenticated clients (including other
    containers on the compose network). Set INTERNAL_API_TOKEN in the
    environment and send it as the X-Internal-Token header.
    """
    expected = os.getenv("INTERNAL_API_TOKEN", "").strip()
    if not expected:
        # Fail closed: an unset token would otherwise leave the API open.
        logger.error("INTERNAL_API_TOKEN is not configured; rejecting request")
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "INTERNAL_AUTH_UNCONFIGURED",
                "message": "INTERNAL_API_TOKEN is not configured on the bot API",
            },
        )

    provided = request.headers.get("X-Internal-Token", "")
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Invalid internal API token")


# ----- FastAPI app -----
api = FastAPI(title="Discord Bot API", version="0.1.0")
DISCORD_API_BASE = "https://discord.com/api/v10"
_redis_client: Optional[Any] = None


def set_redis_client(redis_client: Optional[Any]) -> None:
    global _redis_client
    _redis_client = redis_client


class RefreshCdnRequest(BaseModel):
    message_id: str
    channel_id: str
    guild_id: Optional[str] = None


class RefreshCdnResponse(BaseModel):
    attachments: list[dict]


@api.get("/health")
async def health():
    return {
        "status": "ok",
        "discordRestAvailable": bool(os.getenv("BOT_TOKEN")),
    }


async def fetch_discord_message(channel_id: str, message_id: str) -> dict[str, Any]:
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise HTTPException(
            status_code=503,
            detail={
                "error_type": "DISCORD_REST_UNAVAILABLE",
                "message": "BOT_TOKEN is not configured",
            },
        )

    url = f"{DISCORD_API_BASE}/channels/{channel_id}/messages/{message_id}"
    timeout = aiohttp.ClientTimeout(total=10)

    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(url, headers={"Authorization": f"Bot {token}"}) as response:
            if response.status == 404:
                raise HTTPException(
                    status_code=410,
                    detail={
                        "error_type": "MESSAGE_DELETED",
                        "message": "This clip was deleted from Discord and is no longer available",
                    },
                )

            if response.status == 403:
                raise HTTPException(
                    status_code=403,
                    detail="Bot lacks permission to access message",
                )

            if response.status == 401:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "error_type": "DISCORD_REST_UNAVAILABLE",
                        "message": "BOT_TOKEN was rejected by Discord",
                    },
                )

            if response.status >= 400:
                detail = await response.text()
                raise HTTPException(
                    status_code=502,
                    detail=f"Discord API returned {response.status}: {detail[:200]}",
                )

            return await response.json()


async def queue_message_deletion_cleanup(request: RefreshCdnRequest) -> None:
    if not request.guild_id:
        logger.warning(
            "Cannot queue deletion cleanup for message %s without guild_id",
            request.message_id,
        )
        return

    if not _redis_client:
        logger.warning("Redis client not configured, cannot queue deletion cleanup")
        return

    try:
        from shared.redis.redis import MessageDeletionJob

        job = MessageDeletionJob(
            guild_id=request.guild_id,
            channel_id=request.channel_id,
            message_id=request.message_id,
        )
        await _redis_client.push_job(job.model_dump(mode="json"))
    except Exception:
        logger.warning(
            "Failed to queue deletion cleanup for message %s",
            request.message_id,
            exc_info=True,
        )


@api.post(
    "/refresh-cdn",
    response_model=RefreshCdnResponse,
    dependencies=[Depends(require_internal_token)],
)
async def refresh_cdn_url(request: RefreshCdnRequest):
    """
    Fetch a Discord message and return fresh CDN URLs for its attachments.
    This is used when CDN URLs expire (typically after 24 hours).

    Lazy deletion detection: If message is not found (deleted), queue cleanup job.
    """
    try:
        message = await fetch_discord_message(request.channel_id, request.message_id)

        # Extract attachment information
        attachments = []
        for attachment in message.get("attachments", []):
            attachments.append({
                "id": str(attachment["id"]),
                "filename": attachment["filename"],
                "url": attachment["url"],
                "size": attachment["size"],
                "content_type": attachment.get("content_type"),
            })

        return RefreshCdnResponse(attachments=attachments)

    except HTTPException as e:
        if e.status_code == 410:
            await queue_message_deletion_cleanup(request)
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh CDN URL: {str(e)}")
