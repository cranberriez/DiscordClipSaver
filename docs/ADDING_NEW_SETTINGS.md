# Adding New Settings Guide

This document outlines the process for adding new settings to the Discord Clip Saver system.

## Settings Architecture Overview

The system has three types of settings:

1. **Server Admin Settings** - Configured by the server operator (you), controls bot behavior globally
   - `server_admin_guild_defaults` - Guild-level bot behavior
   - `server_admin_channel_defaults` - Channel scanning behavior
   - `database_settings_defaults` - Database and maintenance settings
   - `worker_settings_defaults` - Worker process settings

2. **Guild Admin Settings** - Configured by Discord server admins via the interface
   - `guild_admin_settings_defaults` - User-facing settings like visibility, NSFW handling, etc.

3. **Channel Settings** - Future: Per-channel overrides (not implemented yet)

## Process for Adding a New Setting

### Step 1: Add Setting to Configuration File

Add your new setting to the appropriate section in `settings.default.jsonc`:

```jsonc
{
    "guild_admin_settings_defaults": {
        "default_visibility": "public",
        "ignore_nsfw_channels": false,
        "your_new_setting": "default_value", // ← Add here for guild admin settings
        // ... other settings
    },
    
    "server_admin_guild_defaults": {
        "enabled_by_default": false,
        "your_server_setting": true, // ← Add here for server admin settings
        // ... other settings
    }
}
```

**Guidelines:**
- Use snake_case for setting names
- Provide sensible defaults
- Add inline comments explaining the setting
- Choose the correct section based on who should control the setting

### Step 2: Add Setting Schema and Documentation

Create or update documentation in `docs/interface/` folder:

```markdown
## New Setting Name

**Type:** `string | boolean | number | object`
**Default:** `"default_value"`
**Scope:** Guild Admin | Server Admin

Description of what the setting does and how it affects system behavior.

### Valid Values
- `option1` - Description
- `option2` - Description

### Examples
```json
{
    "your_new_setting": "example_value"
}
```

### Notes
- Important considerations
- Interactions with other settings
- Performance implications
```

### Step 3: Add Interface Input

#### For Guild Admin Settings:

1. **Update Schema** (`interface/src/lib/schema/guild-user-settings.schema.ts`):
```typescript
export const userSettingsSchema = z.object({
    default_visibility: z.enum(["public", "unlisted", "private"]),
    ignore_nsfw_channels: z.boolean(),
    your_new_setting: z.string().min(1), // ← Add validation
    // ... other settings
});
```

2. **Update Metadata** (same file):
```typescript
export const userSettingsMetadata: Record<keyof UserSettings, UserSettingMetadata> = {
    your_new_setting: {
        label: "Your New Setting",
        description: "Description of what this setting does",
        type: "text", // or "select", "checkbox", "number"
        invalidates_scans: false, // true if changing this requires re-scanning
        note: "Optional helpful note about the setting"
    },
    // ... other metadata
};
```

3. **Add Form Input** (`interface/src/features/dashboard/admin/settings/components/GuildUserSettingsForm.tsx`):
```tsx
{/* Your New Setting */}
<div className="space-y-2">
    <Label htmlFor="your_new_setting" className="flex items-center gap-2">
        Your New Setting
        {userSettingsMetadata.your_new_setting.note && (
            <NotePopover note={userSettingsMetadata.your_new_setting.note} />
        )}
        {userSettingsMetadata.your_new_setting.invalidates_scans && (
            <InvalidatesScansPopover />
        )}
    </Label>
    
    {/* For text input */}
    <LoadingField isLoading={isLoading}>
        <Input
            id="your_new_setting"
            {...register("your_new_setting")}
            placeholder="Enter value..."
        />
    </LoadingField>
    
    {/* For select input */}
    <LoadingField isLoading={isLoading}>
        <Select
            value={watch("your_new_setting")}
            onValueChange={(value) => setValue("your_new_setting", value)}
        >
            <SelectTrigger>
                <SelectValue placeholder="Select option..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
        </Select>
    </LoadingField>
    
    {/* For checkbox */}
    <LoadingCheckbox isLoading={isLoading}>
        <Checkbox
            id="your_new_setting"
            checked={watch("your_new_setting")}
            onCheckedChange={(checked) => setValue("your_new_setting", checked)}
        />
    </LoadingCheckbox>
    
    {errors.your_new_setting && (
        <p className="text-sm text-red-600">{errors.your_new_setting.message}</p>
    )}
</div>
```

#### For Server Admin Settings:

Server admin settings are configured via the `settings.default.jsonc` file and don't need interface inputs.

### Step 4: Add Worker/Bot Implementation

#### For Guild Admin Settings:

1. **Add Helper Function** (if needed) in `python/worker/settings_helpers/user_settings.py`:
```python
async def check_your_new_setting(guild_id: str, channel_id: str) -> bool:
    """
    Check the value of your new setting.
    
    Args:
        guild_id: Discord guild snowflake
        channel_id: Discord channel snowflake
        
    Returns:
        The setting value or default
    """
    try:
        user_settings, _ = await resolve_user_settings(guild_id, channel_id)
        return user_settings and user_settings.get('your_new_setting', 'default_value')
    except Exception as e:
        logger.warning(f"Failed to check your_new_setting for {guild_id}:{channel_id}: {e}")
        return 'default_value'  # Default fallback
```

2. **Use Setting in Worker Code**:
```python
from worker.settings_helpers.user_settings import check_your_new_setting

# In your processing function
async def process_something(guild_id: str, channel_id: str):
    setting_value = await check_your_new_setting(guild_id, channel_id)
    
    if setting_value == "special_value":
        # Handle special behavior
        pass
    else:
        # Handle default behavior
        pass
```

#### For Server Admin Settings:

1. **Add Method to BotSettings** (`python/shared/settings.py`):
```python
@staticmethod
def get_your_new_setting() -> str:
    """Description of what this setting does."""
    return get_server_admin_guild_defaults().get("your_new_setting", "default_value")
```

2. **Use Setting in Bot/Worker Code**:
```python
from shared.settings import settings

# In your code
if settings.get_your_new_setting():
    # Handle enabled behavior
    pass
```

## Setting Types and Examples

### Boolean Settings
```python
# In settings.default.jsonc
"enable_feature": true

# In interface schema
enable_feature: z.boolean()

# In worker
setting_enabled = await check_enable_feature(guild_id, channel_id)
if setting_enabled:
    # Feature is enabled
```

### String/Enum Settings
```python
# In settings.default.jsonc
"mode": "automatic"

# In interface schema
mode: z.enum(["automatic", "manual", "disabled"])

# In worker
mode = await get_mode_setting(guild_id, channel_id)
if mode == "automatic":
    # Handle automatic mode
```

### Number Settings
```python
# In settings.default.jsonc
"max_items": 100

# In interface schema
max_items: z.number().min(1).max(1000)

# In worker
max_items = await get_max_items_setting(guild_id, channel_id)
for i, item in enumerate(items):
    if i >= max_items:
        break
```

### Object Settings
```python
# In settings.default.jsonc
"complex_setting": {
    "enabled": true,
    "value": 42,
    "mode": "auto"
}

# In interface schema
complex_setting: z.object({
    enabled: z.boolean(),
    value: z.number(),
    mode: z.enum(["auto", "manual"])
})

# In worker
complex_setting = await get_complex_setting(guild_id, channel_id)
if complex_setting.get("enabled") and complex_setting.get("mode") == "auto":
    # Handle complex logic
```

## Important Notes

### Cache Invalidation
- If your setting affects scanning behavior, set `invalidates_scans: true` in metadata
- This will show a warning to users that changing the setting may require re-scanning

### Performance Considerations
- Settings are cached in memory to avoid repeated database queries
- Use the existing `resolve_user_settings()` function rather than direct database queries
- Settings are resolved once per batch operation for efficiency

### Error Handling
- Always provide fallback defaults in case settings resolution fails
- Log warnings for failed settings resolution but don't fail the operation
- Use try/catch blocks around settings resolution

### Testing
- Test with default values
- Test with custom values set via interface
- Test error conditions (database unavailable, invalid values)
- Test cache invalidation when settings change

## File Locations Summary

- **Configuration**: `settings.default.jsonc`
- **Interface Schema**: `interface/src/lib/schema/guild-user-settings.schema.ts`
- **Interface Form**: `interface/src/features/dashboard/admin/settings/components/GuildUserSettingsForm.tsx`
- **Worker Helpers**: `python/worker/settings_helpers/user_settings.py`
- **Bot Settings**: `python/shared/settings.py`
- **Settings Resolution**: `python/shared/user_settings_resolver.py`
- **Documentation**: `docs/interface/`

## Common Patterns

### Feature Toggle
```python
# Add boolean setting that enables/disables a feature
"enable_new_feature": false

# Check in worker
if await check_enable_new_feature(guild_id, channel_id):
    await new_feature_logic()
```

### Threshold Setting
```python
# Add numeric setting with validation
"threshold_value": 10

# Use in worker with bounds checking
threshold = await get_threshold_value(guild_id, channel_id)
threshold = max(1, min(100, threshold))  # Clamp to valid range
```

### Mode Selection
```python
# Add enum setting for different modes
"processing_mode": "standard"

# Handle different modes
mode = await get_processing_mode(guild_id, channel_id)
if mode == "aggressive":
    await aggressive_processing()
elif mode == "conservative":
    await conservative_processing()
else:
    await standard_processing()
```

This process ensures consistency across the codebase and provides a clear path for extending functionality through configuration.
