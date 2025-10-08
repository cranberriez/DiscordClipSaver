# Channel Queries
"""
-- Upsert channel
insert into bot_channels (channel_id, guild_id, name, type, last_seen_at)
values ($1, $2, $3, $4, now())
on conflict (channel_id) do update
  set name = excluded.name,
      type = excluded.type,
      last_seen_at = now();

-- Remove channels not seen in latest discovery pass for a guild
delete from bot_channels
where guild_id = $1 and channel_id <> all($2::text[]);
"""



# Channel Settings (implement all but 'enabled' later)
"""
-- Example: get effective settings for all channels in a guild
select
  c.channel_id,
  coalesce(cs.enabled, false) as enabled,
  coalesce(cs.keywords, gs.clip_keywords) as keywords,
  coalesce(cs.min_video_duration_seconds, 0) as min_video_duration_seconds
from bot_channels c
left join channel_settings cs on cs.channel_id = c.channel_id
left join guild_settings   gs on gs.guild_id   = c.guild_id
where c.guild_id = $1;
"""