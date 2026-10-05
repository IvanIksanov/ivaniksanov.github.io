-- Private Roadmap AI chats. Safe to rerun after schema changes.
create table if not exists public.roadmap_chat_turns (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id text not null,
  id text not null,
  question text not null,
  answers jsonb not null default '[]'::jsonb,
  selected integer not null default 0,
  model_order jsonb not null default '[]'::jsonb,
  comparison_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id, id),
  constraint roadmap_chat_turns_answers_array check (jsonb_typeof(answers) = 'array'),
  constraint roadmap_chat_turns_model_order_array check (jsonb_typeof(model_order) = 'array')
);

create index if not exists roadmap_chat_turns_user_updated_idx
  on public.roadmap_chat_turns (user_id, updated_at desc);

alter table public.roadmap_chat_turns enable row level security;
revoke all on public.roadmap_chat_turns from anon;
grant select, insert, update on public.roadmap_chat_turns to authenticated;

drop policy if exists roadmap_chat_turns_select_own on public.roadmap_chat_turns;
create policy roadmap_chat_turns_select_own on public.roadmap_chat_turns
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists roadmap_chat_turns_insert_own on public.roadmap_chat_turns;
create policy roadmap_chat_turns_insert_own on public.roadmap_chat_turns
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists roadmap_chat_turns_update_own on public.roadmap_chat_turns;
create policy roadmap_chat_turns_update_own on public.roadmap_chat_turns
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
