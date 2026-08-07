-- PentePal database schema (v2 — username-based login)
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run
--
-- NOTE: this drops and recreates the profiles/messages tables. That's fine
-- for a project still in testing with no real student data yet. If you've
-- already got real accounts you care about, back them up first.

drop table if exists messages;
drop table if exists profiles;

-- 1. Student profiles, one row per signed-up student.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness, so "Jane" and "jane" can't both be taken.
create unique index profiles_username_unique_idx on profiles (lower(username));

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- 2. Chat messages, one row per message (student question or PentePal answer).
create table messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "Users can view their own messages"
  on messages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own messages"
  on messages for insert
  with check (auth.uid() = user_id);

create index messages_user_id_created_at_idx
  on messages (user_id, created_at);

-- 3. Username -> email lookup, used only at login time.
--    A student types a username, not their email, so the app needs to find
--    the matching email before it can call Supabase's (email-based) sign-in.
--    This function runs with elevated privileges (SECURITY DEFINER) so it
--    can look this up even though the visitor isn't logged in yet — but it
--    only ever returns an email for an exact username match, nothing else
--    from the profiles table is exposed.
create or replace function get_email_for_username(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles where lower(username) = lower(p_username) limit 1;
$$;

-- Let logged-out visitors call this function (they have to be, to log in).
grant execute on function get_email_for_username(text) to anon, authenticated;
