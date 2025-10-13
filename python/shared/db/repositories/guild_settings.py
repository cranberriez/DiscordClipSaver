
async def upsert_guild_settings(gid: str, guild_settings: dict, channel_settings: dict) -> None:
    """Insert or update guild settings from snapshot objects."""
    # get_or_create then update on existing
    obj, created = await GuildSettings.get_or_create(
        guild=str(gid),
        defaults={
            "guild": Guild.get(id=str(gid)),
            "default_channel_settings": channel_settings,
            "settings": guild_settings,
        },
    )
    if not created:
        # Update changed fields
            update_needed = False
            if obj.default_channel_settings != channel_settings:
                obj.default_channel_settings = channel_settings
                update_needed = True
            if obj.settings != guild_settings:
                obj.settings = guild_settings
                update_needed = True
            if update_needed:
                await obj.save()