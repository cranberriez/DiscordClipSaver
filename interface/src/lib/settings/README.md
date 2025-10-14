# Guild Settings Management

This directory contains utilities for managing guild settings in a type-safe and validated manner.

## Overview

The guild settings system provides:

1. **Type-safe validation** using Zod schemas
2. **Builder pattern** for collecting changes
3. **API endpoints** for reading and updating settings
4. **Client-side helpers** for easy integration

## Architecture

### Components

- **Validation Layer** (`/lib/validation/guild-settings.schema.ts`)
  - Zod schemas for runtime validation
  - TypeScript types for compile-time safety
  - Strict mode to prevent unknown keys

- **Builder Pattern** (`/lib/settings/guild-settings-builder.ts`)
  - Accumulate changes without direct JSON manipulation
  - Type-safe setters and getters
  - Build final payload for API submission

- **Database Layer** (`/lib/db/queries/guild_settings.ts`)
  - CRUD operations for guild settings
  - Automatic merging of partial updates
  - Soft delete support

- **API Layer** (`/app/api/guilds/[guildId]/settings/route.ts`)
  - RESTful endpoints (GET, PATCH)
  - Authentication and authorization
  - Request validation

- **Client Helpers** (`/lib/api/guild-settings.ts`)
  - Fetch and update functions
  - Error handling
  - Type-safe interfaces

## Usage Examples

### Example 1: Using the Builder Pattern

```typescript
import { GuildSettingsBuilder } from "@/lib/settings/guild-settings-builder";
import { updateGuildSettings } from "@/lib/api/guild-settings";

// Create a builder for a specific guild
const builder = new GuildSettingsBuilder("123456789");

// Collect changes
builder
  .setGuildSetting("enabled_by_default", true)
  .setGuildSetting("tz", "America/Los_Angeles")
  .setGuildSetting("schedule_cron", "0 */6 * * *")
  .setDefaultChannelSetting("is_enabled", true)
  .setDefaultChannelSetting("max_messages_per_pass", 500);

// Build and send to API
const payload = builder.build();
if (payload) {
  const result = await updateGuildSettings(
    payload.guild_id,
    payload.settings,
    payload.default_channel_settings
  );
  console.log("Settings updated:", result);
}
```

### Example 2: Direct API Usage

```typescript
import { updateGuildSettings, fetchGuildSettings } from "@/lib/api/guild-settings";

// Fetch current settings
const currentSettings = await fetchGuildSettings("123456789");
console.log("Current timezone:", currentSettings.settings?.tz);

// Update specific settings
await updateGuildSettings(
  "123456789",
  { tz: "Europe/London", parse_threads: true },
  { is_enabled: false }
);
```

### Example 3: React Component with State

```typescript
"use client";

import { useState } from "react";
import { GuildSettingsBuilder } from "@/lib/settings/guild-settings-builder";
import { updateGuildSettings } from "@/lib/api/guild-settings";

export function GuildSettingsForm({ guildId }: { guildId: string }) {
  const [builder] = useState(() => new GuildSettingsBuilder(guildId));
  const [saving, setSaving] = useState(false);

  const handleTimezoneChange = (tz: string) => {
    builder.setGuildSetting("tz", tz);
  };

  const handleEnabledChange = (enabled: boolean) => {
    builder.setGuildSetting("enabled_by_default", enabled);
  };

  const handleSave = async () => {
    const payload = builder.build();
    if (!payload) return;

    setSaving(true);
    try {
      await updateGuildSettings(
        payload.guild_id,
        payload.settings,
        payload.default_channel_settings
      );
      alert("Settings saved!");
      builder.clearAll(); // Clear pending changes
    } catch (error) {
      alert(`Failed to save: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
      <label>
        Timezone:
        <input type="text" onChange={(e) => handleTimezoneChange(e.target.value)} />
      </label>
      <label>
        Enabled by default:
        <input type="checkbox" onChange={(e) => handleEnabledChange(e.target.checked)} />
      </label>
      <button type="submit" disabled={saving || !builder.hasChanges()}>
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
```

### Example 4: Server-Side API Route

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getGuildSettings, upsertGuildSettings } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { guildId, timezone } = await req.json();

  // Fetch current settings
  const current = await getGuildSettings(guildId);

  // Update only the timezone
  const updated = await upsertGuildSettings(
    guildId,
    { tz: timezone },
    undefined
  );

  return NextResponse.json(updated);
}
```

## Validation

All settings are validated using Zod schemas before being saved to the database. This ensures:

- **Type safety**: Only valid types are accepted
- **Data integrity**: Invalid values are rejected
- **No unknown keys**: Strict mode prevents typos and unexpected fields

### Guild Settings Schema

```typescript
{
  enabled_by_default?: boolean;
  parse_threads?: boolean;
  tz?: string;
  schedule_cron?: string;
}
```

### Default Channel Settings Schema

```typescript
{
  is_enabled?: boolean;
  scan_mode?: "forward" | "backfill";
  max_messages_per_pass?: number; // positive integer
  debounce_ms?: number; // non-negative integer
  include_threads?: boolean;
  accept_video?: boolean;
  min_video_seconds?: number; // non-negative
  mime_allowlist?: string[];
  text_include_regex?: string | null;
  text_exclude_regex?: string | null;
}
```

## Security Considerations

1. **No Direct JSON Manipulation**: Users cannot directly manipulate the JSON payload. They must use the builder or API.

2. **Validation at Multiple Layers**:
   - Client-side TypeScript types
   - Runtime Zod validation
   - Database constraints

3. **Authorization**: The API routes include authentication checks. You should add authorization logic to verify users can only modify guilds they own/manage.

4. **Partial Updates**: The system performs merges, so users can only update specific fields without affecting others.

## API Endpoints

### GET `/api/guilds/[guildId]/settings`

Retrieve guild settings.

**Response:**
```json
{
  "guild_id": "123456789",
  "settings": {
    "enabled_by_default": true,
    "tz": "UTC"
  },
  "default_channel_settings": {
    "is_enabled": true,
    "max_messages_per_pass": 1000
  }
}
```

### PATCH `/api/guilds/[guildId]/settings`

Update guild settings (partial update).

**Request:**
```json
{
  "guild_id": "123456789",
  "settings": {
    "tz": "America/Los_Angeles"
  },
  "default_channel_settings": {
    "max_messages_per_pass": 500
  }
}
```

**Response:**
```json
{
  "guild_id": "123456789",
  "settings": {
    "enabled_by_default": true,
    "tz": "America/Los_Angeles"
  },
  "default_channel_settings": {
    "is_enabled": true,
    "max_messages_per_pass": 500
  }
}
```

## Best Practices

1. **Use the Builder**: For collecting multiple changes, use `GuildSettingsBuilder` instead of manually constructing payloads.

2. **Check for Changes**: Before submitting, check `builder.hasChanges()` to avoid unnecessary API calls.

3. **Handle Errors**: Always wrap API calls in try-catch blocks and provide user feedback.

4. **Validate Early**: Use TypeScript types to catch errors at compile time.

5. **Merge Strategy**: The system merges partial updates with existing settings. To remove a field, you would need to explicitly set it to its default value or null (where applicable).

## Future Enhancements

- Add authorization middleware to verify guild ownership
- Implement settings history/audit log
- Add bulk update endpoints for multiple guilds
- Create React hooks for easier integration
- Add optimistic updates for better UX
