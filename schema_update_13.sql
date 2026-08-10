-- Run this in Supabase: SQL Editor -> New query -> paste -> Run
-- Safe — additive only, no existing data modified.

-- 1. Link goal allocations back to the transaction that created them.
--    This allows reversal when a transaction is edited or deleted.
--    Existing rows get NULL (no linked transaction) — no data loss.
alter table goal_allocations
  add column if not exists transaction_id bigint references transactions(id) on delete set null;

-- 2. Timestamp when the user first completed or dismissed onboarding.
alter table user_profiles
  add column if not exists onboarding_completed_at timestamptz default null;
