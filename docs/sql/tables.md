# Database Tables

## users

Stores Discord user information.

**Repository**: `db/pg/users.py`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-increment internal ID |
| discord_user_id | text | UNIQUE NOT NULL | Discord snowflake user ID |
| username | text | | Discord username |
| global_name | text | | Discord display name |
| avatar | text | | Avatar URL or hash |
| last_login_at | timestamptz | | Last login timestamp |

**Purpose**: Reference table for users who interact with the bot or own guilds.

---

## bot_guilds

Stores Discord guilds (servers) the bot is connected to.

**Repository**: `db/pg/guilds.py`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| guild_id | text | PRIMARY KEY | Discord snowflake guild ID |
| name | text | NOT NULL | Guild name |
| icon | text | | Guild icon URL |
| owner_user_id | text | FK → users(discord_user_id) | Guild owner reference |
| joined_at | timestamptz | DEFAULT now() | When bot joined guild |
| last_seen_at | timestamptz | DEFAULT now() | Last sync timestamp |

**Foreign Keys**:
- `owner_user_id` → `users(discord_user_id)` ON DELETE SET NULL

**Indexes**: Primary key on `guild_id`

**Purpose**: Tracks all guilds the bot has access to, with ownership and activity timestamps.

---

## guild_settings

Stores per-guild configuration as JSONB.

**Repository**: `db/pg/guilds.py`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| guild_id | text | PRIMARY KEY | Discord guild ID |
| settings | jsonb | NOT NULL, DEFAULT '{}' | Configuration JSON |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Purpose**: Flexible per-guild settings storage. Supports partial updates via JSONB merge operators.

**Example Settings**:
```json
{
  "prefix": "!",
  "auto_scan": true,
  "scan_nsfw": false,
  "video_formats": ["mp4", "webm"]
}
```

---

## bot_channels

Stores Discord channels and their ingestion state.

**Repository**: `db/pg/channels.py`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| channel_id | text | PRIMARY KEY | Discord snowflake channel ID |
| guild_id | text | NOT NULL, FK → bot_guilds | Parent guild reference |
| name | text | | Channel name |
| type | text | | Channel type (text, voice, etc.) |
| is_nsfw | boolean | DEFAULT false | NSFW flag |
| is_reading | boolean | NOT NULL, DEFAULT false | Bot is ingesting messages |
| last_message_id | text | | Last processed message ID |
| last_scanned_at | timestamptz | | Last scan timestamp |
| last_activity_at | timestamptz | | Last message activity |
| message_count | bigint | NOT NULL, DEFAULT 0 | Total messages processed |
| settings | jsonb | NOT NULL, DEFAULT '{}' | Channel-specific overrides |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Record creation time |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | Auto-updated on change |

**Foreign Keys**:
- `guild_id` → `bot_guilds(guild_id)` ON DELETE CASCADE

**Indexes**:
- `idx_bot_channels_guild` on `guild_id`
- `idx_bot_channels_isreading` on `is_reading` WHERE `is_reading = true`
- `idx_bot_channels_last_message_id` on `last_message_id`
- `idx_bot_channels_work` on `(guild_id, is_reading, last_scanned_at)`

**Triggers**:
- `trg_bot_channels_updated_at`: Auto-updates `updated_at` on any UPDATE

**Purpose**: Tracks channels and their message ingestion progress. The `settings` field stores channel-specific overrides that merge with guild defaults.

---

## bot_channel_scan_runs

Tracks message scan operations for finding video files.

**Repository**: `db/pg/channels.py`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique run identifier |
| channel_id | text | NOT NULL, FK → bot_channels | Channel being scanned |
| after_message_id | text | | Start message ID (exclusive) |
| before_message_id | text | | End message ID (exclusive) |
| status | scan_status | NOT NULL, DEFAULT 'queued' | Run status enum |
| messages_scanned | bigint | NOT NULL, DEFAULT 0 | Messages processed count |
| messages_matched | bigint | NOT NULL, DEFAULT 0 | Messages with videos count |
| error_message | text | | Error details if failed |
| started_at | timestamptz | | Run start time |
| finished_at | timestamptz | | Run completion time |
| created_at | timestamptz | NOT NULL, DEFAULT now() | Queue time |

**Custom Types**:
- `scan_status`: ENUM('queued', 'running', 'succeeded', 'failed', 'canceled')

**Foreign Keys**:
- `channel_id` → `bot_channels(channel_id)` ON DELETE CASCADE

**Indexes**:
- `idx_bot_scan_runs_channel` on `(channel_id, created_at DESC)`

**Extensions Required**: `pgcrypto` (for UUID generation)

**Purpose**: Provides audit trail and progress tracking for message scans. Supports resumable scans via `after_message_id`.

---

## install_intents

Temporary state for OAuth installation flows.

**Repository**: `db/pg/install_intents.py`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| state | text | PRIMARY KEY | OAuth state token |
| user_id | text | NOT NULL, FK → users | User initiating install |
| guild_id | text | NOT NULL | Target guild for installation |
| created_at | timestamp | DEFAULT current_timestamp | Intent creation time |
| expires_at | timestamp | NOT NULL | Expiration timestamp |

**Foreign Keys**:
- `user_id` → `users(discord_user_id)` ON DELETE CASCADE

**Purpose**: Tracks OAuth state during bot installation. Records are automatically purged by the `purge_install_intents` scheduled job after expiration.

**Lifecycle**:
1. Created when user initiates bot installation
2. Validated during OAuth callback
3. Expires after configured time
4. Purged by scheduled job (with grace period)
