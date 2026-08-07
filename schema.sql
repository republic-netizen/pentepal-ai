-- PentePal database schema
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run

-- 1. Student profiles, one row per signed-up student.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  class_name text not null,
  student_id text not null,
  email text not null,
  created_at timestamptz not null default now()
);

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
create table if not exists messages (
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

create index if not exists messages_user_id_created_at_idx
  on messages (user_id, created_at);
