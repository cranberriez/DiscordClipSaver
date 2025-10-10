# Database Relationships

## Entity Relationship Diagram

```
users
  └── (discord_user_id)
       ├── bot_guilds.owner_user_id [SET NULL]
       └── install_intents.user_id [CASCADE]

bot_guilds
  └── (guild_id)
       ├── bot_channels.guild_id [CASCADE]
       └── guild_settings.guild_id [implicit]

bot_channels
  └── (channel_id)
       └── bot_channel_scan_runs.channel_id [CASCADE]
```

## Foreign Key Relationships

### users → bot_guilds
- **Column**: `bot_guilds.owner_user_id`
- **References**: `users.discord_user_id`
- **On Delete**: SET NULL
- **Rationale**: Guild owner may leave but guild record should remain

### users → install_intents
- **Column**: `install_intents.user_id`
- **References**: `users.discord_user_id`
- **On Delete**: CASCADE
- **Rationale**: User deletion should clean up their OAuth intents

### bot_guilds → bot_channels
- **Column**: `bot_channels.guild_id`
- **References**: `bot_guilds.guild_id`
- **On Delete**: CASCADE
- **Rationale**: When bot leaves guild, all channel records should be removed

### bot_channels → bot_channel_scan_runs
- **Column**: `bot_channel_scan_runs.channel_id`
- **References**: `bot_channels.channel_id`
- **On Delete**: CASCADE
- **Rationale**: Channel deletion should clean up all scan history

## Implicit Relationships

### bot_guilds → guild_settings
- **Type**: One-to-One
- **Enforcement**: Application-level via matching `guild_id`
- **Notes**: No formal FK constraint, but guild_id values correspond

## Cascade Behavior

### Deleting a Guild
When `bot_guilds` record is deleted:
1. All `bot_channels` for that guild are deleted (CASCADE)
2. All `bot_channel_scan_runs` for those channels are deleted (CASCADE)
3. `guild_settings` record should be manually deleted if needed (no FK)

### Deleting a Channel
When `bot_channels` record is deleted:
1. All `bot_channel_scan_runs` for that channel are deleted (CASCADE)

### Deleting a User
When `users` record is deleted:
1. All `install_intents` for that user are deleted (CASCADE)
2. Any guilds owned by that user have `owner_user_id` set to NULL (SET NULL)

## Relationship Notes

### Guild Settings
`guild_settings` does not have a formal FK to `bot_guilds` to allow settings to potentially exist before guild record (edge case during initialization). In practice, they're always created together.

### Owner User ID
Guild owners may not be in the `users` table if they haven't interacted with the bot directly. The FK allows NULL to handle this case.

### Channel Types
Channels can be text, voice, category, thread, etc. The `type` field is stored as text for flexibility with Discord's evolving channel types.

## Data Integrity

### Enforced by Database
- Parent records exist before children (via FK constraints)
- Cascade deletes maintain referential integrity
- Primary keys prevent duplicates

### Enforced by Application
- Guild and channel sync validates data from Discord API
- Settings merge operations preserve JSON structure
- Message ID comparison uses numeric snowflake ordering
