from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import discord

from bot.bot import bot as discord_bot

# ----- FastAPI app -----
api = FastAPI(title="Discord Bot API", version="0.1.0")


class RefreshCdnRequest(BaseModel):
    message_id: str
    channel_id: str


class RefreshCdnResponse(BaseModel):
    attachments: list[dict]


@api.get("/health")
async def health():
    return {"status": "ok"}


@api.post("/refresh-cdn", response_model=RefreshCdnResponse)
async def refresh_cdn_url(request: RefreshCdnRequest):
    """
    Fetch a Discord message and return fresh CDN URLs for its attachments.
    This is used when CDN URLs expire (typically after 24 hours).
    
    Lazy deletion detection: If message is not found (deleted), queue cleanup job.
    """
    try:
        # Get the channel
        channel = discord_bot.get_channel(int(request.channel_id))
        if not channel:
            raise HTTPException(status_code=404, detail="Channel not found")

        # Fetch the message
        try:
            message = await channel.fetch_message(int(request.message_id))
        except discord.NotFound:
            # Message was deleted from Discord!
            # Queue deletion job to clean up database and storage
            from bot.services.scan_service import get_scan_service
            
            scan_service = get_scan_service()
            if scan_service and scan_service.redis_client:
                # Queue cleanup job asynchronously
                await scan_service.handle_message_deletion(
                    guild_id=str(channel.guild.id) if hasattr(channel, 'guild') else None,
                    channel_id=request.channel_id,
                    message_id=request.message_id
                )
            
            # Return specific error type for UI to handle gracefully
            raise HTTPException(
                status_code=410,  # 410 Gone - resource permanently deleted
                detail={
                    "error_type": "MESSAGE_DELETED",
                    "message": "This clip was deleted from Discord and is no longer available"
                }
            )
        except discord.Forbidden:
            raise HTTPException(status_code=403, detail="Bot lacks permission to access message")

        # Extract attachment information
        attachments = []
        for attachment in message.attachments:
            attachments.append({
                "id": str(attachment.id),
                "filename": attachment.filename,
                "url": attachment.url,
                "size": attachment.size,
                "content_type": attachment.content_type,
            })

        return RefreshCdnResponse(attachments=attachments)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh CDN URL: {str(e)}")