# Base channels table and related information
"""
CREATE TABLE channels (
  channel_id           TEXT PRIMARY KEY,               -- Discord snowflake
  guild_id             TEXT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,

  -- Basic metadata (helps your admin UI without calling Discord every time)
  name                 TEXT,
  type                 SMALLINT,                         -- 0=text, 2=voice, 5=announcements, 13=stage, 15=forum, etc.
  is_nsfw              BOOLEAN DEFAULT FALSE,

  -- Bot read state
  is_reading           BOOLEAN NOT NULL DEFAULT FALSE,   -- whether the bot should actively read/ingest this channel
  last_message_id      TEXT,                           -- your resume cursor: use 'after:last_message_id'
  last_scanned_at      TIMESTAMPTZ,                      -- when we last finished a scan pass
  last_activity_at     TIMESTAMPTZ,                      -- optional: from message events or decoded snowflake ts

  -- Counters (cheap health telemetry; don't rely for analytics)
  message_count        BIGINT NOT NULL DEFAULT 0,        -- increment on ingest if you want a quick stat

  -- Bulk settings for the bot (jsonb for GIN indexing if useful later)
  settings             JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_channels_updated_at
BEFORE UPDATE ON channels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helpful indexes
CREATE INDEX idx_channels_guild ON channels(guild_id);
CREATE INDEX idx_channels_isreading ON channels(is_reading) WHERE is_reading = TRUE;
CREATE INDEX idx_channels_last_message_id ON channels(last_message_id);
-- If you'll query settings by key frequently, add a GIN:
-- CREATE INDEX idx_channels_settings_gin ON channels USING GIN (settings);

-- Optional: fast "active work queue" for the bot
CREATE INDEX idx_channels_work ON channels(guild_id, is_reading, last_scanned_at);
"""


# 
"""
CREATE TYPE scan_status AS ENUM ('queued','running','succeeded','failed','canceled');

CREATE TABLE channel_scan_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id         TEXT NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
  after_message_id   TEXT,                 -- set from channels.last_message_id when enqueued
  before_message_id  TEXT,                 -- rarely used; for backfills
  status             scan_status NOT NULL DEFAULT 'queued',
  messages_scanned   BIGINT NOT NULL DEFAULT 0,
  messages_matched   BIGINT NOT NULL DEFAULT 0, -- clips or candidates found
  error_message      TEXT,
  started_at         TIMESTAMPTZ,
  finished_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_runs_channel ON channel_scan_runs(channel_id, created_at DESC);

"""