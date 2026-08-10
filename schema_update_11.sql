-- Run this in Supabase: SQL Editor -> New query -> paste -> Run
-- Safe — additive only, no existing data modified.

-- Add trigger_keywords to savings_goals.
-- Each goal stores a list of lowercase keyword strings. When the user saves
-- an expense and the note field contains any of these keywords, the goal
-- allocation dialog fires for that specific goal only.
-- Existing rows get an empty array — no data loss, no breaking change.
alter table savings_goals
  add column if not exists trigger_keywords text[] default '{}';
