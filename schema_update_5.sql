-- Run this in Supabase: SQL Editor -> New query -> paste -> Run

-- Add position column to categories for manual ordering
alter table categories add column if not exists position integer default 0;

-- Set initial positions based on current id order
update categories set position = sub.row_num
from (
  select id, row_number() over (partition by type order by id) as row_num
  from categories
) sub
where categories.id = sub.id;
