# Interface Settings Refactoring Guide

## Overview

The Python backend has been refactored to use a centralized settings system that separates static bot/system settings from user-modifiable settings. The interface now needs to be updated to work with this new architecture.

## Current Interface Architecture Problems

### 1. **Overbuilt Dynamic Settings System**
- `DynamicSettingsForm.tsx` - Dynamically generates forms based on metadata
- `GuildSettingsBuilder.ts` - Complex builder pattern for accumulating changes
- `useSettings.ts` - Manages both guild and channel settings with complex state
- `guild-settings.schema.ts` - Zod schemas for all settings (bot + user)

### 2. **Mixed Concerns**
- Interface handles both bot/system settings AND user settings
- No clear separation between what users can modify vs static configuration
- Complex validation for settings that users shouldn't even see

### 3. **Performance Issues**
- Dynamic form generation is complex and slow
- Unnecessary validation of static bot settings
- Complex state management for simple user preferences

## New Architecture Goals

### 1. **Simplified Static Forms**
- Replace dynamic generation with simple, static forms
- Only show `user_facing_settings_defaults` to users
- Remove bot/system settings from interface entirely

### 2. **Clear Separation of Concerns**
- **User Settings**: Stored in database, modifiable via interface
- **Bot Settings**: Static configuration, not exposed to users

### 3. **Simplified State Management**
- Remove complex builder pattern
- Simple form state with direct API calls
- Maintain cancel/save functionality without overengineering

## Refactoring Plan

### Phase 1: Identify User-Facing Settings

**Current `user_facing_settings_defaults` from settings file:**
```json
{
    "default_visibility": "unlisted",
    "ignore_nsfw_channels": true,
    "auto_archive_after": {
        "unit": "never",
        "count": 0
    },
    "max_clips_per_channel_per_day": 0,
    "live_scan_slow_mode": {
        "enabled": false,
        "delay_seconds": 30
    }
}
```

### Phase 2: Update Database Schema

**Current Database Columns (to be cleared):**
- `guild_settings.settings` (JSON) - Contains mixed bot + user settings
- `guild_settings.default_channel_settings` (JSON) - Contains mixed settings
- `channel_settings.settings` (JSON) - Contains mixed settings

**Migration Required:**
```sql
-- Clear existing mixed settings
UPDATE guild_settings SET settings = NULL, default_channel_settings = NULL;
UPDATE channel_settings SET settings = NULL;

-- Future: These will only contain user-facing settings
```

### Phase 3: Create New Simple Forms

**Replace These Files:**
- `interface/src/features/dashboard/admin/settings/components/DynamicSettingsForm.tsx`
- `interface/src/lib/react-query/guild-settings-builder.ts`
- `interface/src/lib/schema/guild-settings.schema.ts`

**With Simple Alternatives:**
- `GuildUserSettingsForm.tsx` - Static form for user preferences
- `useGuildUserSettings.ts` - Simple hook for user settings only
- `guild-user-settings.schema.ts` - Zod schema for user settings only

### Phase 4: Update API Endpoints

**Current Endpoints (need updating):**
- `GET /api/guilds/[guildId]/settings` - Returns mixed settings
- `PUT /api/guilds/[guildId]/settings` - Updates mixed settings

**New Approach:**
- Only return/update user-facing settings
- Remove bot/system settings from API responses
- Validate against user-facing schema only

### Phase 5: Simplify State Management

**Remove Complex Patterns:**
```typescript
// OLD: Complex builder pattern
const builder = new GuildSettingsBuilder(currentSettings);
builder.updateGuildSetting('key', value);
builder.updateChannelSetting('key', value);
const changes = builder.getChanges();

// NEW: Simple form state
const [userSettings, setUserSettings] = useState(initialUserSettings);
const updateSetting = (key: string, value: any) => {
    setUserSettings(prev => ({ ...prev, [key]: value }));
};
```

## Implementation Steps

### Step 1: Database Migration
```sql
-- Create migration file: clear_mixed_settings.sql
UPDATE guild_settings 
SET settings = NULL, default_channel_settings = NULL 
WHERE settings IS NOT NULL OR default_channel_settings IS NOT NULL;

UPDATE channel_settings 
SET settings = NULL 
WHERE settings IS NOT NULL;
```

### Step 2: Update Backend API
```typescript
// Only return user-facing settings
export async function getGuildUserSettings(guildId: string) {
    const guild = await GuildSettings.get_or_none(guild_id=guildId);
    
    // Return only user-facing settings, fallback to defaults
    return {
        default_visibility: guild?.settings?.default_visibility || "unlisted",
        ignore_nsfw_channels: guild?.settings?.ignore_nsfw_channels || true,
        auto_archive_after: guild?.settings?.auto_archive_after || { unit: "never", count: 0 },
        max_clips_per_channel_per_day: guild?.settings?.max_clips_per_channel_per_day || 0,
        live_scan_slow_mode: guild?.settings?.live_scan_slow_mode || { enabled: false, delay_seconds: 30 }
    };
}
```

### Step 3: Create Simple Form Component
```typescript
// GuildUserSettingsForm.tsx
export function GuildUserSettingsForm({ guildId }: { guildId: string }) {
    const { data: settings, isLoading } = useGuildUserSettings(guildId);
    const updateMutation = useUpdateGuildUserSettings(guildId);
    
    const [formData, setFormData] = useState(settings);
    const [hasChanges, setHasChanges] = useState(false);
    
    const handleSave = () => {
        updateMutation.mutate(formData);
        setHasChanges(false);
    };
    
    const handleCancel = () => {
        setFormData(settings);
        setHasChanges(false);
    };
    
    return (
        <form>
            {/* Simple static form fields */}
            <Select 
                value={formData.default_visibility}
                onChange={(value) => updateFormData('default_visibility', value)}
            />
            
            <Checkbox
                checked={formData.ignore_nsfw_channels}
                onChange={(checked) => updateFormData('ignore_nsfw_channels', checked)}
            />
            
            {/* Save/Cancel buttons */}
            <div className="flex gap-2">
                <Button onClick={handleSave} disabled={!hasChanges}>Save</Button>
                <Button onClick={handleCancel} disabled={!hasChanges}>Cancel</Button>
            </div>
        </form>
    );
}
```

### Step 4: Update Hooks
```typescript
// useGuildUserSettings.ts
export function useGuildUserSettings(guildId: string) {
    return useQuery({
        queryKey: ['guild-user-settings', guildId],
        queryFn: () => fetchGuildUserSettings(guildId),
    });
}

export function useUpdateGuildUserSettings(guildId: string) {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (settings: GuildUserSettings) => updateGuildUserSettings(guildId, settings),
        onSuccess: () => {
            queryClient.invalidateQueries(['guild-user-settings', guildId]);
        },
    });
}
```

### Step 5: Create Simple Schema
```typescript
// guild-user-settings.schema.ts
export const GuildUserSettingsSchema = z.object({
    default_visibility: z.enum(['public', 'unlisted', 'private']),
    ignore_nsfw_channels: z.boolean(),
    auto_archive_after: z.object({
        unit: z.enum(['never', 'days', 'weeks', 'months']),
        count: z.number().min(0),
    }),
    max_clips_per_channel_per_day: z.number().min(0),
    live_scan_slow_mode: z.object({
        enabled: z.boolean(),
        delay_seconds: z.number().min(1),
    }),
});

export type GuildUserSettings = z.infer<typeof GuildUserSettingsSchema>;
```

## Files to Remove/Replace

### Remove These Files:
- `interface/src/lib/react-query/guild-settings-builder.ts`
- `interface/src/features/dashboard/admin/settings/components/DynamicSettingsForm.tsx`
- `interface/src/lib/schema/guild-settings.schema.ts` (replace with user-only version)

### Update These Files:
- `interface/src/lib/hooks/useSettings.ts` - Simplify to user settings only
- API routes in `interface/src/app/api/guilds/[guildId]/settings/` - User settings only
- Any components that import the old complex settings system

## Database Migration Required

**Yes, you need to clear the settings tables** because they currently contain mixed bot/system settings and user settings. After the migration:

1. **Clear existing JSON columns** - Remove mixed settings data
2. **Interface will populate user settings** - When users first visit settings page
3. **Bot/worker use static settings** - No database dependency for bot configuration

## Testing Strategy

1. **Clear settings tables** with migration
2. **Deploy new interface** with simplified forms
3. **Test user settings** - Ensure save/cancel works
4. **Verify bot functionality** - Ensure static settings work
5. **Test edge cases** - New guilds, missing settings, etc.

## Benefits After Refactoring

1. **Simpler Interface** - Static forms instead of dynamic generation
2. **Better Performance** - No complex validation or state management
3. **Clear Separation** - Users only see what they can control
4. **Easier Maintenance** - Less complex code to maintain
5. **Better UX** - Faster, more responsive settings interface

## Migration Timeline

1. **Phase 1** (Immediate): Database migration to clear mixed settings
2. **Phase 2** (Next): Update backend API to handle user settings only
3. **Phase 3** (Then): Replace interface components with simple forms
4. **Phase 4** (Finally): Remove old complex files and test thoroughly

The key is to do this incrementally and test each phase before moving to the next.
