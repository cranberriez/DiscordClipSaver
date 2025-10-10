# Priveleages
# Seperated by the bot (this python app) and the postgres user / next.js interface
"""
-- enums are in the same schema; grant usage if needed
grant usage on type job_kind  to bot_app;
grant usage on type job_status to bot_app;

-- Discovery tables: full write access
grant select, insert, update, delete on bot_guilds  to bot_app;
grant select, insert, update, delete on bot_channels to bot_app;

-- Settings: read only
grant select on guild_settings   to bot_app;
grant select on channel_settings to bot_app;

-- Jobs: read + update, but no insert/delete
grant select, update on bot_jobs to bot_app;

-- (Optional) row-level security can further lock it down per guild if you enable RLS.
"""