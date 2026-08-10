-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

-- 1. Allow editing the current cycle's dates in place (needed for the
--    "Edit cycle" button — separate from "Start new cycle", which inserts
--    a new history row instead).
create policy "Users can update own pay cycles"
  on pay_cycles for update
  using (auth.uid() = user_id);

-- 2. Privacy fix: the admin transactions-select policy from schema_update_6.sql
--    correctly lets admins view all transactions for the Admin panel, but the
--    app was previously running an unscoped `select('*')` for the SIGNED-IN
--    user's own Dashboard/History too — which meant an admin's own pages were
--    silently pulling in every user's transactions. That's now fixed on the
--    app side (every personal query explicitly filters by user_id), and the
--    admin aggregate query has been trimmed to only id/user_id/date — no
--    amounts, categories, or notes are fetched for anyone but yourself.
--    No RLS policy change is needed for this — it was an app-layer gap, not
--    a database one — this note is just here for the record.
