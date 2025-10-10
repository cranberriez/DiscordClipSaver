# Database Indexes

## bot_channels Indexes

### idx_bot_channels_guild
```sql
CREATE INDEX idx_bot_channels_guild ON bot_channels(guild_id)
```
**Purpose**: Fast lookup of all channels for a given guild  
**Used By**: `get_channels_by_guild()` queries  
**Cardinality**: Moderate (many channels per guild)

---

### idx_bot_channels_isreading
```sql
CREATE INDEX idx_bot_channels_isreading ON bot_channels(is_reading) 
WHERE is_reading = true
```
**Type**: Partial index  
**Purpose**: Find channels actively being read by the bot  
**Used By**: Worker processes looking for channels to ingest  
**Size Optimization**: Only indexes `true` values (small subset)  
**Cardinality**: Low (few channels actively reading at once)

---

### idx_bot_channels_last_message_id
```sql
CREATE INDEX idx_bot_channels_last_message_id ON bot_channels(last_message_id)
```
**Purpose**: Quick lookups and ordering by last processed message  
**Used By**: Resumable scan operations, progress tracking  
**Notes**: Indexed as text but compared numerically in queries

---

### idx_bot_channels_work
```sql
CREATE INDEX idx_bot_channels_work ON bot_channels(guild_id, is_reading, last_scanned_at)
```
**Type**: Composite index  
**Purpose**: Efficiently find channels ready for scanning within a guild  
**Used By**: Work queue queries for message ingestion  
**Query Pattern**: 
```sql
WHERE guild_id = ? AND is_reading = true 
ORDER BY last_scanned_at
```
**Cardinality**: High selectivity due to multiple columns

---

## bot_channel_scan_runs Indexes

### idx_bot_scan_runs_channel
```sql
CREATE INDEX idx_bot_scan_runs_channel ON bot_channel_scan_runs(channel_id, created_at DESC)
```
**Type**: Composite index with DESC sort  
**Purpose**: Retrieve scan history for a channel in reverse chronological order  
**Used By**: UI displaying scan history, latest run queries  
**Query Pattern**:
```sql
WHERE channel_id = ? ORDER BY created_at DESC LIMIT N
```

---

## Primary Key Indexes

All PRIMARY KEY constraints automatically create unique indexes:

- `users(id)` - Auto-increment lookup
- `users(discord_user_id)` - UNIQUE constraint creates index
- `bot_guilds(guild_id)` - Guild lookups
- `guild_settings(guild_id)` - Settings lookups
- `bot_channels(channel_id)` - Channel lookups
- `bot_channel_scan_runs(id)` - Run ID lookups (UUID)
- `install_intents(state)` - OAuth state validation

---

## Index Maintenance

### Automatic Maintenance
PostgreSQL automatically maintains indexes:
- Updates on INSERT/UPDATE/DELETE
- Periodic VACUUM updates statistics
- Query planner uses statistics for optimization

### Manual Maintenance (if needed)
```sql
-- Rebuild index if fragmented
REINDEX INDEX idx_bot_channels_work;

-- Analyze table to update statistics
ANALYZE bot_channels;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan;
```

---

## Performance Considerations

### Discord Snowflake IDs
Discord IDs are stored as TEXT but represent 64-bit integers (snowflakes). Queries use numeric comparison:
```sql
-- Efficient: numeric comparison on text field
WHERE CAST(last_message_id AS NUMERIC) > CAST(%s AS NUMERIC)
```

### JSONB Indexes (Future)
If complex queries on settings fields are needed, consider GIN indexes:
```sql
CREATE INDEX idx_guild_settings_gin ON guild_settings USING GIN(settings);
CREATE INDEX idx_channel_settings_gin ON bot_channels USING GIN(settings);
```

### Partial Index Benefits
The `idx_bot_channels_isreading` partial index is much smaller than a full index because:
- Only includes rows where `is_reading = true`
- Faster updates (only updates when is_reading changes)
- Less storage overhead
- Faster scans for worker queries

---

## Query Optimization Tips

1. **Use EXPLAIN ANALYZE** to verify index usage:
```sql
EXPLAIN ANALYZE
SELECT * FROM bot_channels WHERE guild_id = '123' AND is_reading = true;
```

2. **Avoid index-defeating patterns**:
   - Functions on indexed columns: `WHERE LOWER(name) = ?` (doesn't use index on `name`)
   - Type mismatches: Ensure parameter types match column types

3. **Monitor slow queries**:
   - Enable `log_min_duration_statement` in PostgreSQL
   - Review logs for queries not using indexes

4. **Consider covering indexes** for frequently-joined columns to avoid table lookups
