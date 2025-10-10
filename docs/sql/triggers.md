# Database Triggers

## Overview

The database uses triggers to automatically maintain timestamps and enforce data consistency.

## Trigger Functions

### set_updated_at()

**Purpose**: Automatically updates the `updated_at` timestamp on row changes

**Definition**:
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;
```

**Behavior**:
- Fires BEFORE UPDATE on tables with `updated_at` column
- Sets `updated_at` to current timestamp
- Returns modified NEW row

---

## Active Triggers

### trg_bot_channels_updated_at

**Table**: `bot_channels`  
**Timing**: BEFORE UPDATE  
**For Each**: ROW  
**Function**: `set_updated_at()`

**Definition**:
```sql
CREATE TRIGGER trg_bot_channels_updated_at
BEFORE UPDATE ON bot_channels
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

**Purpose**: Ensures `updated_at` always reflects the last modification time

**Fires On**:
- Channel name/type changes
- Settings updates
- Reading state changes
- Message count increments
- Cursor position updates

**Example**:
```sql
-- Updates automatically set updated_at
UPDATE bot_channels 
SET is_reading = true 
WHERE channel_id = '123';
-- updated_at is now() automatically
```

---

## Trigger Management

### Installation

Triggers are created automatically during `database.init_db()`:
1. Function definition created/replaced
2. Any existing trigger dropped
3. New trigger created

This ensures clean reinstallation on schema updates.

**Code** (`db/pg/channels.py`):
```python
async def ensure_tables(self, cursor) -> None:
    await cursor.execute(self.CREATE_TABLE_SQL)
    await cursor.execute(self.CREATE_TRIGGER_FUNC_SQL)
    await cursor.execute(self.DROP_TRIGGER_SQL)
    await cursor.execute(self.CREATE_TRIGGER_SQL)
    # ... indexes
```

### Viewing Triggers

List all triggers in the database:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

View trigger definition:
```sql
\d+ bot_channels  -- Shows table and trigger details
```

---

## Trigger Behavior Notes

### Performance Impact
- **Minimal**: Simple timestamp assignment is very fast
- Executes on every UPDATE regardless of which columns changed
- No complex logic or nested queries

### Transaction Safety
- Triggers execute within the same transaction as the triggering statement
- If trigger fails, entire transaction rolls back
- Ensures data consistency

### Skipping Triggers
Triggers cannot be bypassed for individual queries. To avoid trigger execution:
1. Drop the trigger temporarily (not recommended)
2. Use separate table without trigger
3. Direct transaction manipulation (advanced)

### Debugging Triggers
If trigger causes issues:
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'trg_bot_channels_updated_at';

-- Disable trigger temporarily
ALTER TABLE bot_channels DISABLE TRIGGER trg_bot_channels_updated_at;

-- Re-enable trigger
ALTER TABLE bot_channels ENABLE TRIGGER trg_bot_channels_updated_at;

-- Drop trigger
DROP TRIGGER trg_bot_channels_updated_at ON bot_channels;
```

---

## Future Trigger Possibilities

### Audit Logging
Track all changes to critical tables:
```sql
CREATE TRIGGER audit_channel_changes
AFTER UPDATE ON bot_channels
FOR EACH ROW
EXECUTE FUNCTION log_channel_audit();
```

### Data Validation
Enforce business rules at database level:
```sql
CREATE TRIGGER validate_message_id
BEFORE UPDATE ON bot_channels
FOR EACH ROW
WHEN (NEW.last_message_id IS NOT NULL)
EXECUTE FUNCTION validate_snowflake_id();
```

### Cascade Updates
Propagate changes to related tables:
```sql
CREATE TRIGGER update_guild_activity
AFTER UPDATE ON bot_channels
FOR EACH ROW
WHEN (NEW.last_activity_at > OLD.last_activity_at)
EXECUTE FUNCTION touch_guild_activity();
```

### Statistics Updates
Maintain aggregate counters:
```sql
CREATE TRIGGER update_guild_channel_count
AFTER INSERT OR DELETE ON bot_channels
FOR EACH ROW
EXECUTE FUNCTION sync_guild_channel_count();
```

---

## Best Practices

1. **Keep triggers simple**: Complex logic belongs in application layer
2. **Document trigger purpose**: Clear comments in SQL and docs
3. **Test trigger behavior**: Verify expected timestamp updates
4. **Monitor performance**: Check if triggers slow down bulk operations
5. **Version control**: Track trigger definitions alongside schema
