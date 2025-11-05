-- Migration: Rename 'title' to 'episode_title' and add series 'title' column
-- File: supabase/migrations/20251105000000_rename_episode_title_column.sql
-- Purpose: Make column naming consistent - 'title' will refer to series/movie title,
--          'episode_title' will refer to the specific episode title

-- Step 1: Rename the existing 'title' column to 'episode_title'
ALTER TABLE episodes_cache 
  RENAME COLUMN title TO episode_title;

-- Step 2: Add new 'title' column for series title (after imdb_id)
-- Note: PostgreSQL doesn't support AFTER clause, so we'll add it and it will appear at the end
-- The actual column order in the table doesn't affect functionality
ALTER TABLE episodes_cache 
  ADD COLUMN title TEXT;

-- Step 3: Optionally populate the new 'title' column with series titles from movies table
-- This is a one-time data migration to populate existing records
UPDATE episodes_cache ec
SET title = (
  SELECT m.title 
  FROM movies m 
  WHERE m.imdb_id = ec.imdb_id
)
WHERE title IS NULL;

-- Step 4: Add comment to clarify the purpose of each title column
COMMENT ON COLUMN episodes_cache.title IS 'Title of the TV series (from movies table)';
COMMENT ON COLUMN episodes_cache.episode_title IS 'Title of the specific episode';

-- Step 5: Update indexes if needed (the existing unique constraint should still work)
-- The unique constraint is on (imdb_id, season_number, episode_number), so no changes needed

-- Verification query (uncomment to test after migration):
-- SELECT imdb_id, season_number, episode_number, title as series_title, episode_title 
-- FROM episodes_cache 
-- LIMIT 10;