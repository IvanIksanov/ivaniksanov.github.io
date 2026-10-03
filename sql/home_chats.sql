-- Private homepage conversations. Run in the Supabase SQL editor before enabling cloud sync.
create table if not exists public.home_chats (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Чат без названия',
  icon text not null default 'qa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);

create table if not exists public.home_chat_turns (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null,
  question text not null,
  answer text not null,
  memory text not null default '',
  title text not null default '',
  icon text not null default '',
  suggestions jsonb not null default '[]'::jsonb,
  offline boolean not null default false,
  starter_id text not null default '',
  created_at timestamptz not null default now(),
  foreign key (chat_id, user_id) references public.home_chats(id, user_id) on delete cascade,
  constraint home_chat_turns_answer_check check (char_length(answer) > 0)
);

create index if not exists home_chats_user_updated_idx on public.home_chats (user_id, updated_at desc);
create index if not exists home_chat_turns_chat_created_idx on public.home_chat_turns (user_id, chat_id, created_at);

-- A stale device must never resurrect a chat already deleted on another device.
create or replace function public.keep_home_chat_tombstone()
returns trigger language plpgsql as $$
begin
  if old.deleted_at is not null then
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_keep_home_chat_tombstone on public.home_chats;
create trigger trg_keep_home_chat_tombstone before update on public.home_chats
for each row execute function public.keep_home_chat_tombstone();

alter table public.home_chats enable row level security;
alter table public.home_chat_turns enable row level security;
revoke all on public.home_chats, public.home_chat_turns from anon;
grant select, insert, update, delete on public.home_chats to authenticated;
grant select, insert, delete on public.home_chat_turns to authenticated;

drop policy if exists home_chats_select_own on public.home_chats;
create policy home_chats_select_own on public.home_chats for select to authenticated using (auth.uid() = user_id);
drop policy if exists home_chats_insert_own on public.home_chats;
create policy home_chats_insert_own on public.home_chats for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists home_chats_update_own on public.home_chats;
create policy home_chats_update_own on public.home_chats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists home_chats_delete_own on public.home_chats;
create policy home_chats_delete_own on public.home_chats for delete to authenticated using (auth.uid() = user_id);

drop policy if exists home_chat_turns_select_own on public.home_chat_turns;
create policy home_chat_turns_select_own on public.home_chat_turns for select to authenticated using (auth.uid() = user_id);
drop policy if exists home_chat_turns_insert_own on public.home_chat_turns;
create policy home_chat_turns_insert_own on public.home_chat_turns for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists home_chat_turns_delete_own on public.home_chat_turns;
create policy home_chat_turns_delete_own on public.home_chat_turns for delete to authenticated using (auth.uid() = user_id);
