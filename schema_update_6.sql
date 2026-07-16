-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

-- 1. User profiles table (auto-populated on login from app)
create table user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  first_seen timestamptz default now(),
  last_seen timestamptz default now()
);

alter table user_profiles enable row level security;

-- Each user can insert/update their own profile
create policy "Users can upsert own profile"
  on user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on user_profiles for update
  using (auth.uid() = user_id);

-- Only admins can view all profiles
create policy "Admins can view all profiles"
  on user_profiles for select
  using (
    auth.uid() = user_id
    or exists (select 1 from app_admins where user_id = auth.uid())
  );

-- 2. Let admins see ALL transactions (for entry count in admin panel)
create policy "Admins can view all transactions"
  on transactions for select
  using (exists (select 1 from app_admins where user_id = auth.uid()));
