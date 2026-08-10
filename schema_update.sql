-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

-- 1. Add a user_id column that auto-fills with the logged-in user's id
alter table transactions
  add column user_id uuid references auth.users(id) default auth.uid();

-- 2. Turn Row Level Security back on
alter table transactions enable row level security;

-- 3. Each user can only see, add, change, or delete their OWN rows
create policy "Users can view own transactions"
  on transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete
  using (auth.uid() = user_id);
