# Settings System Rework Analysis

## Current Settings Architecture

### Settings File Structure (`settings.default.jsonc`)

The current settings file contains four main sections:

1. **`guild_settings_defaults`** - Bot/system-level guild configuration
2. **`channel_settings_defaults`** - Bot/system-level channel configuration  
3. **`database_settings_defaults`** - System database configuration
4. **`user_facing_settings_defaults`** - User-controllable settings

### Current Database Schema

#### GuildSettings Table
- `guild` - OneToOne relationship to Guild
- `default_channel_settings` - JSON field storing channel defaults
- `settings` - JSON field storing guild-level settings

#### ChannelSettings Table  
- `channel` - OneToOne relationship to Channel
- `settings` - JSON field storing channel overrides

### Current Settings Usage Analysis

#### Python Code Settings Usage

**Bot Service Layer:**
- `python/bot/services/settings_service.py` - Loads settings from file
- `python/bot/services/guild_service.py` - Uses settings service to initialize guild/channel defaults

**Settings Resolution:**
- `python/shared/settings_resolver.py` - Complex caching system for resolving channel settings
- `python/worker/settings_utilities.py` - Alternative settings resolution (duplicate logic)

**Worker Usage:**
- `python/worker/message/message_handler.py` - Fetches settings per message processing
- `python/worker/message/batch_processor.py` - Fetches settings for batch operations
- Multiple validator and utility files import `ResolvedSettings`

**Key Issues with Current Python Implementation:**
1. **Duplicate Logic** - Two different settings resolution systems
2. **Database Queries** - Settings fetched from DB on every message/batch
3. **Complex Caching** - TTL-based cache with invalidation complexity
4. **Mixed Concerns** - Bot settings mixed with user settings in same resolution

#### Interface Code Settings Usage

**API Layer:**
- `interface/src/app/api/guilds/[guildId]/settings/route.ts` - Settings CRUD API
- `interface/src/lib/api/setting.ts` - API client functions

**Database Layer:**
- `interface/src/server/db/queries/guild_settings.ts` - Database queries
- `interface/src/server/mappers/settings-mapper.ts` - Data mapping

**React Layer:**
- `interface/src/lib/hooks/useSettings.ts` - Settings hooks with local state
- `interface/src/lib/react-query/guild-settings-builder.ts` - Builder pattern for changes
- `interface/src/features/dashboard/admin/settings/components/DynamicSettingsForm.tsx` - Dynamic form generation

**Schema Validation:**
- `interface/src/lib/schema/guild-settings.schema.ts` - Zod validation schemas

**Key Issues with Current Interface Implementation:**
1. **Over-engineered** - Complex builder pattern and dynamic form generation
2. **Mixed Settings** - User and bot settings handled together
3. **Database Storage** - All settings stored as JSON in database

## Settings Categories Analysis

### Bot/System Settings (Should NOT be user-modifiable)

**Guild Level:**
- `enabled_by_default` - Whether new channels default to enabled
- `parse_threads` - Thread parsing behavior
- `tz` - Guild timezone context
- `schedule_cron` - Job scheduling

**Channel Level:**
- `scan_mode` - Forward vs backfill scanning
- `max_messages_per_pass` - Batch size limits
- `debounce_ms` - Throttling for hot channels
- `include_threads` - Thread inclusion behavior
- `accept_video` - Video acceptance
- `min_video_seconds` - Minimum video length
- `mime_allowlist` - Allowed MIME types
- `text_include_regex` - Message content filtering
- `text_exclude_regex` - Message content exclusion

**Database Level:**
- `install_intent_expire_time` - Installation flow timing
- `install_intent_purge_cron` - Cleanup scheduling
- `install_intent_purge_grace_seconds` - Grace period

### User-Facing Settings (Should be user-modifiable)

**Current `user_facing_settings_defaults`:**
- `default_visibility` - Default clip visibility
- `ignore_nsfw_channels` - NSFW channel handling
- `auto_archive_after` - Automatic archiving rules
- `max_clips_per_channel_per_day` - Rate limiting
- `live_scan_slow_mode` - Scanning throttling

## Problems with Current System

### Python Side Issues
1. **Performance** - Database queries for every message processing
2. **Complexity** - Two different settings resolution systems
3. **Caching Overhead** - Complex TTL cache with invalidation
4. **Mixed Concerns** - Bot and user settings resolved together

### Interface Side Issues  
1. **Over-engineering** - Complex builder pattern for simple settings
2. **Database Bloat** - All settings stored as JSON in database
3. **Mixed UI** - Bot and user settings in same interface
4. **Schema Complexity** - Complex validation for simple key-value pairs

## Proposed Solution

### 1. Centralized Settings Loader (Python)
- Single settings service loads from file once at startup
- Bot/system settings never change during runtime
- No database queries for bot settings
- Simple dictionary access for performance

### 2. Simplified User Settings (Interface)
- Use `user_facing_settings_defaults` as static defaults
- Simple key-value form instead of dynamic generation
- Store only user overrides in database
- Cancel/save pattern maintained

### 3. Clear Separation
- Bot settings: File-based, loaded once, never user-modifiable
- User settings: Database-based, simple overrides, user-modifiable
- No mixing of concerns in resolution or UI

### 4. Database Cleanup
- Clear existing JSON settings columns
- Replace with simple user preference overrides
- Remove complex caching and resolution logic

## Files Requiring Changes

### Python Files (Bot/System Settings)
- `python/shared/settings_resolver.py` - Replace with simple file loader
- `python/worker/settings_utilities.py` - Remove duplicate logic
- `python/bot/services/settings_service.py` - Enhance for centralized loading
- `python/worker/message/message_handler.py` - Use centralized settings
- `python/worker/message/batch_processor.py` - Use centralized settings
- All validator/utility files - Use centralized settings

### Interface Files (User Settings)
- `interface/src/lib/hooks/useSettings.ts` - Simplify to user settings only
- `interface/src/lib/react-query/guild-settings-builder.ts` - Remove or simplify
- `interface/src/features/dashboard/admin/settings/components/DynamicSettingsForm.tsx` - Replace with static form
- `interface/src/lib/schema/guild-settings.schema.ts` - Simplify to user settings
- `interface/src/app/api/guilds/[guildId]/settings/route.ts` - Handle user settings only

### Database Changes
- Migration to clear `guild_settings.settings` and `guild_settings.default_channel_settings`
- Migration to clear `channel_settings.settings`
- New simple user preferences table structure

## Implementation Priority

1. **Document current usage** ✅
2. **Create centralized Python settings loader**
3. **Update all Python code to use centralized loader**
4. **Simplify interface to use static user settings**
5. **Create database migration for cleanup**
6. **Remove deprecated code and files**
