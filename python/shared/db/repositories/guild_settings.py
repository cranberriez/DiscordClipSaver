from shared.db.models import GuildSettings

async def upsert_guild_settings(gid: str, user_facing_settings: dict, default_channel_settings: dict = None) -> None:
    """Insert or update guild settings with user-facing settings."""
    # get_or_create then update on existing
    obj, created = await GuildSettings.get_or_create(
        guild_id=str(gid),
        defaults={
            "default_channel_settings": default_channel_settings,  # Will be None/null
            "settings": user_facing_settings,
        },
    )
    if not created:
        # Update changed fields
        update_needed = False
        if obj.default_channel_settings != default_channel_settings:
            obj.default_channel_settings = default_channel_settings
            update_needed = True
        if obj.settings != user_facing_settings:
            obj.settings = user_facing_settings
            update_needed = True
        if update_needed:
            await obj.save()