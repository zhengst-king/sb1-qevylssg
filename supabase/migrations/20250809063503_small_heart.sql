/*
  # Add "To Watch Again" status option

  1. Database Changes
    - Update the status check constraint to include "To Watch Again"
    - This allows the new status value in the movies table

  2. Notes
    - Existing data remains unchanged
    - The new status will activate the "Date Watched" conditional field
    - All existing functionality continues to work
*/

-- Update the check constraint to include the new status
ALTER TABLE movies DROP CONSTRAINT IF EXISTS movies_status_check;

ALTER TABLE movies ADD CONSTRAINT movies_status_check 
CHECK (status = ANY (ARRAY['To Watch'::text, 'Watching'::text, 'Watched'::text, 'To Watch Again'::text]));