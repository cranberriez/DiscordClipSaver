# Database Connection Pooling

**Last Updated**: 2025-10-16

## Overview

The worker and bot processes use Tortoise ORM with asyncpg for PostgreSQL connections. Connection pooling is configured to efficiently manage database connections across multiple worker instances.

## Key Concepts

### Per-Process Pooling

**Important**: Connection pool settings are **PER PROCESS**, not global.

- Each worker/bot process maintains its own connection pool
- Pools are isolated and don't share connections
- Total connections = `num_workers × DB_POOL_MAX`

### Example Calculations

| Workers | DB_POOL_MAX | Total Connections |
|---------|-------------|-------------------|
| 1       | 10          | 10                |
| 5       | 10          | 50                |
| 10      | 10          | 100               |
| 20      | 10          | 200               |

## Environment Variables

### Core Settings

```bash
# Individual connection parameters (recommended approach)
DB_HOST=localhost           # Database host
DB_PORT=5432               # Database port
DB_USER=postgres           # Database user
DB_PASSWORD=postgres       # Database password
DB_NAME=postgres           # Database name

# OR use a connection URL (disables pool configuration)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**Note**: If `DATABASE_URL` is set, pool configuration is **ignored** (legacy mode).

### Pool Configuration

```bash
DB_POOL_MIN=2              # Minimum connections per worker
DB_POOL_MAX=10             # Maximum connections per worker
DB_MAX_QUERIES=50000       # Max queries before connection recycling
DB_MAX_IDLE_TIME=300       # Max idle time in seconds (5 minutes)
```

## Scaling Guidelines

### Calculate Your Needs

1. **Determine worker count**: How many worker replicas will you run?
2. **Calculate total connections**: `workers × DB_POOL_MAX`
3. **Check PostgreSQL limit**: Default is often 100 connections
4. **Add overhead**: Account for bot, interface, migrations, etc. (~10-20 connections)

### Recommended Values by Scale

#### Small Deployment (1-3 workers)
```bash
DB_POOL_MIN=2
DB_POOL_MAX=10
# Total: 3 workers × 10 = 30 connections (safe with default PostgreSQL)
```

#### Medium Deployment (4-8 workers)
```bash
DB_POOL_MIN=2
DB_POOL_MAX=8
# Total: 8 workers × 8 = 64 connections
# Increase PostgreSQL max_connections to 100+ recommended
```

#### Large Deployment (9+ workers)
```bash
DB_POOL_MIN=2
DB_POOL_MAX=5
# Total: 10 workers × 5 = 50 connections
# OR increase PostgreSQL max_connections significantly
# OR use PgBouncer connection pooler
```

### Adjusting PostgreSQL max_connections

#### Check Current Limit
```sql
SHOW max_connections;
```

#### Increase Limit (postgresql.conf)
```ini
max_connections = 200
```

**Important**: 
- Restart PostgreSQL after changing
- Each connection uses ~10MB of memory
- 200 connections ≈ 2GB additional memory

## Using PgBouncer (Recommended for 10+ workers)

For large-scale deployments, use PgBouncer as a connection pooler:

### Benefits
- Hundreds of workers can share a smaller pool
- Reduces PostgreSQL connection overhead
- Better performance under high load

### Example Configuration

```ini
# pgbouncer.ini
[databases]
postgres = host=postgres port=5432 dbname=postgres

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

Then set workers to connect to PgBouncer:
```bash
DB_HOST=pgbouncer
DB_PORT=6432
DB_POOL_MAX=5  # Can be lower with PgBouncer
```

## Monitoring

### Check Active Connections

```sql
-- Current connections
SELECT count(*) FROM pg_stat_activity;

-- Connections by application
SELECT application_name, count(*) 
FROM pg_stat_activity 
GROUP BY application_name;

-- Idle connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';
```

### Warning Signs

- **Near max_connections**: Time to scale down workers or increase limit
- **Many idle connections**: Consider reducing DB_POOL_MIN
- **Connection timeouts**: Increase DB_POOL_MAX or add workers

## Troubleshooting

### "FATAL: sorry, too many clients already"

**Cause**: Total connections exceeded PostgreSQL max_connections

**Solutions**:
1. Reduce `DB_POOL_MAX` per worker
2. Reduce number of workers
3. Increase PostgreSQL `max_connections`
4. Use PgBouncer connection pooler

### Slow Query Performance

**Possible Causes**:
- `DB_POOL_MAX` too low (connection starvation)
- Connection recycling (increase `DB_MAX_QUERIES`)
- Network latency to database

**Solutions**:
- Increase `DB_POOL_MAX` (if under connection limit)
- Monitor query times with `pg_stat_statements`
- Consider read replicas for read-heavy workloads

### Connection Pool Exhaustion

**Symptoms**: Workers waiting for available connections

**Solutions**:
1. Increase `DB_POOL_MAX` (check total connection limit)
2. Optimize long-running queries
3. Add more workers with smaller pools

## Best Practices

### ✅ Do

- Monitor actual connection usage before scaling
- Leave headroom (total connections < 80% of max_connections)
- Use PgBouncer for 10+ workers
- Test connection settings before production deployment
- Monitor idle connection percentage

### ❌ Don't

- Set `DB_POOL_MAX` too high (wastes resources)
- Exceed PostgreSQL max_connections
- Use `DATABASE_URL` if you need pool configuration
- Forget to account for non-worker connections (bot, interface)
- Ignore connection monitoring

## Example: Scaling from 1 to 10 Workers

### Initial Setup (1 worker)
```bash
DB_POOL_MAX=10
Total: 1 × 10 = 10 connections ✅
```

### Scaling to 5 Workers
```bash
DB_POOL_MAX=10
Total: 5 × 10 = 50 connections ✅
Default PostgreSQL limit: 100 - Safe with overhead
```

### Scaling to 10 Workers
```bash
# Option 1: Reduce per-worker pool
DB_POOL_MAX=8
Total: 10 × 8 = 80 connections ✅

# Option 2: Keep pool size, increase PostgreSQL limit
DB_POOL_MAX=10
max_connections=200  # In PostgreSQL config
Total: 10 × 10 = 100 connections ✅

# Option 3: Use PgBouncer (recommended)
# PgBouncer pool_size=25, workers use DB_POOL_MAX=5
Total to PostgreSQL: 25 connections ✅
Workers happy with 10 × 5 = 50 logical connections
```

## Related Documentation

- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)
- [Tortoise ORM Connections](https://tortoise.github.io/connections.html)
- [asyncpg Pool Parameters](https://magicstack.github.io/asyncpg/current/api/index.html#connection-pools)
