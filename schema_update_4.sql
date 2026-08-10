-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

-- 1. A simple admin list. Only people in this table can manage categories.
create table app_admins (
  user_id uuid primary key references auth.users(id),
  created_at timestamptz default now()
);

alter table app_admins enable row level security;

create policy "Users can check their own admin status"
  on app_admins for select
  using (auth.uid() = user_id);

-- 2. Add yourself as the first (and for now, only) admin
insert into app_admins (user_id)
select id from auth.users where email = 'nevinda.rushantha94@gmail.com';

-- 3. Categories become a SHARED list: everyone signed in can see them,
--    but only admins can add or remove one.
drop policy if exists "Users can view own categories" on categories;
drop policy if exists "Users can insert own categories" on categories;
drop policy if exists "Users can delete own categories" on categories;

alter table categories drop constraint if exists categories_user_id_type_name_key;
alter table categories add constraint categories_type_name_key unique (type, name);

create policy "Anyone signed in can view categories"
  on categories for select
  using (auth.uid() is not null);

create policy "Only admins can add categories"
  on categories for insert
  with check (exists (select 1 from app_admins where user_id = auth.uid()));

create policy "Only admins can delete categories"
  on categories for delete
  using (exists (select 1 from app_admins where user_id = auth.uid()));

-- Later, to give someone else permission, just run:
-- insert into app_admins (user_id) select id from auth.users where email = 'their-email@gmail.com';
