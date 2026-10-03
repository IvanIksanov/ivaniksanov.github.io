-- Site-key Groq usage only. Apply in Supabase SQL Editor before deploying ai-chat.
-- No user identifiers, prompts, answers, or API keys are stored here.
create table if not exists public.ai_token_usage (
  id uuid primary key default gen_random_uuid(),
  response_id text unique,
  model text not null,
  key_slot text not null check (key_slot in ('primary', 'backup')),
  prompt_tokens integer not null check (prompt_tokens >= 0),
  completion_tokens integer not null check (completion_tokens >= 0),
  cached_tokens integer not null check (cached_tokens >= 0),
  charged_tokens integer not null check (charged_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_token_usage_created_idx on public.ai_token_usage (created_at desc);
alter table public.ai_token_usage enable row level security;
revoke all on public.ai_token_usage from anon, authenticated;
grant select, insert on public.ai_token_usage to service_role;

create or replace function public.ai_token_usage_last_24h()
returns table (model text, key_slot text, charged_tokens bigint, request_count bigint)
language sql stable security invoker
as $$
  select usage.model, usage.key_slot, sum(usage.charged_tokens), count(*)
  from public.ai_token_usage as usage
  where usage.created_at >= now() - interval '24 hours'
  group by usage.model, usage.key_slot;
$$;

revoke all on function public.ai_token_usage_last_24h() from public, anon, authenticated;
grant execute on function public.ai_token_usage_last_24h() to service_role;

-- Site counter: New York calendar day, including daylight-saving changes.
create or replace function public.ai_token_usage_new_york_day()
returns table (window_start timestamptz, resets_at timestamptz, model text, key_slot text, charged_tokens bigint, request_count bigint)
language sql stable security invoker
as $$
  with bounds as (
    select
      date_trunc('day', now() at time zone 'America/New_York') at time zone 'America/New_York' as starts_at,
      (date_trunc('day', now() at time zone 'America/New_York') + interval '1 day') at time zone 'America/New_York' as ends_at
  )
  select bounds.starts_at, bounds.ends_at, usage.model, usage.key_slot,
    coalesce(sum(usage.charged_tokens), 0), count(usage.id)
  from bounds
  left join public.ai_token_usage as usage
    on usage.created_at >= bounds.starts_at and usage.created_at < bounds.ends_at
  group by bounds.starts_at, bounds.ends_at, usage.model, usage.key_slot;
$$;

revoke all on function public.ai_token_usage_new_york_day() from public, anon, authenticated;
grant execute on function public.ai_token_usage_new_york_day() to service_role;
