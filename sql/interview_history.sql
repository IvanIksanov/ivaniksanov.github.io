-- Приватная история ручных mock-собеседований.
-- Выполнить в Supabase SQL Editor перед включением облачной синхронизации.
create table if not exists public.interview_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  number integer not null default 0,
  created_at timestamptz not null default now(),
  categories jsonb not null default '[]'::jsonb,
  accepted integer not null default 0 check (accepted >= 0),
  skipped integer not null default 0 check (skipped >= 0),
  total integer not null default 0 check (total >= 0),
  percent integer not null default 0 check (percent between 0 and 100),
  questions jsonb not null default '[]'::jsonb,
  primary key (user_id, id),
  constraint interview_history_categories_array check (jsonb_typeof(categories) = 'array'),
  constraint interview_history_questions_array check (jsonb_typeof(questions) = 'array')
);

create index if not exists interview_history_user_created_idx
  on public.interview_history (user_id, created_at desc);

alter table public.interview_history enable row level security;
revoke all on public.interview_history from anon;
grant select, insert, update, delete on public.interview_history to authenticated;

drop policy if exists interview_history_select_own on public.interview_history;
create policy interview_history_select_own on public.interview_history
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists interview_history_insert_own on public.interview_history;
create policy interview_history_insert_own on public.interview_history
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists interview_history_update_own on public.interview_history;
create policy interview_history_update_own on public.interview_history
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists interview_history_delete_own on public.interview_history;
create policy interview_history_delete_own on public.interview_history
  for delete to authenticated using (auth.uid() = user_id);
