# Bot Jobs
"""
-- Load job before execution
select job_id, kind, guild_id, channel_id, params_json, status
from bot_jobs
where job_id = $1;

-- Transition to running
update bot_jobs
set status = 'running', started_at = now()
where job_id = $1
  and status = 'queued';

-- Periodic checkpoint (choose one)
-- Option A: durable breadcrumbs inside error_json (temporary hack)
update bot_jobs
set error_json = jsonb_set(coalesce(error_json, '{}'::jsonb), '{checkpoint}', to_jsonb($2::text), true)
where job_id = $1;

-- Transition to succeeded
update bot_jobs
set status = 'succeeded', finished_at = now()
where job_id = $1
  and status = 'running';

-- Transition to failed
update bot_jobs
set status = 'failed', finished_at = now(), error_json = $2::jsonb
where job_id = $1
  and status in ('queued','running');

"""

# Job Indexes
"""
create index if not exists idx_bot_jobs_status on bot_jobs(status);
create index if not exists idx_bot_jobs_guild_status on bot_jobs(guild_id, status);
"""